'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={};vm.createContext(ctx);
for(const f of ['battle-core.js','battle-rules.js','duel-engine.js','match-journal.js','cards.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx,{filename:f});
const {cards,duelThemes}=vm.runInContext('({cards,duelThemes})',ctx);
const catalog=cards;
test('four archetypes each have 30 unique valid cards',()=>{
 assert.equal(duelThemes.length,4);
 const ids=duelThemes.flatMap(t=>t.cards);
 assert.equal(ids.length,120);assert.equal(new Set(ids).size,120);
 for(const t of duelThemes){assert.equal(t.cards.length,30);for(const id of t.cards)assert.ok(catalog.some(c=>c.id===id))}
});
test('relic draft triggers on turn five and is journal-replayable',()=>{
 const deck=duelThemes[0].cards.slice(0,12),j=ctx.IngaJournal.createJournal([deck,deck],123,catalog);
 for(let i=0;i<4;i++)assert.equal(ctx.IngaJournal.dispatch(j,i%2,{type:'end_turn'}).ok,true);
 let v=ctx.IngaDuel.publicView(j.match,0);assert.equal(v.turn,5);assert.equal(v.relicPending,true);assert.equal(v.relicOffer.length,3);
 assert.equal(ctx.IngaJournal.dispatch(j,0,{type:'end_turn'}).reason,'choose_relic');
 const chosen=v.relicOffer[0].id;assert.equal(ctx.IngaJournal.dispatch(j,0,{type:'relic',id:chosen}).ok,true);
 v=ctx.IngaDuel.publicView(j.match,0);assert.equal(v.relicPending,false);assert.equal(v.relics[0][0].id,chosen);
 const replay=ctx.IngaJournal.replay(ctx.IngaJournal.exportJournal(j),catalog);
 assert.equal(ctx.IngaDuel.publicView(replay.match,0).relics[0][0].id,chosen);
});
test('full thirty-card job match exposes class skill and fate utility',()=>{
 const deck=duelThemes[2].cards;
 const j=ctx.IngaJournal.createJournal([deck,duelThemes[1].cards],77,catalog);
 let v=ctx.IngaDuel.publicView(j.match,0);
 assert.equal(v.player.job,'fate');assert.equal(v.player.hp,60);
 assert.equal(ctx.IngaJournal.dispatch(j,0,{type:'skill'}).ok,true);
 v=ctx.IngaDuel.publicView(j.match,0);
 assert.equal(v.player.fate,2);
 assert.equal(ctx.IngaJournal.dispatch(j,0,{type:'skill'}).reason,'skill_unavailable');
 assert.equal(ctx.IngaJournal.dispatch(j,0,{type:'fate',mode:'energy'}).ok,true);
 assert.equal(ctx.IngaDuel.publicView(j.match,0).player.fate,0);
 assert.equal(ctx.IngaJournal.replay(ctx.IngaJournal.exportJournal(j),catalog).actions.length,2);
});

test('fifty distinct relics and no direct instant-win relic',()=>{
 const text=fs.readFileSync(path.join(__dirname,'..','duel-engine.js'),'utf8');
 const section=text.split('const RELICS=[')[1].split('];')[0];
 const ids=[...section.matchAll(/id:'([^']+)'/g)].map(m=>m[1]);
 assert.equal(ids.length,50);assert.equal(new Set(ids).size,50);
 assert.ok(!section.includes('即勝利'));
});
test('blood skill costs future tempo; guard skill is conditional',()=>{
 const blood=duelThemes[3].cards,guard=duelThemes[1].cards;
 const j=ctx.IngaJournal.createJournal([blood,guard],14,catalog);
 const before=ctx.IngaDuel.publicView(j.match,0).player;
 assert.equal(ctx.IngaJournal.dispatch(j,0,{type:'skill'}).ok,true);
 const after=ctx.IngaDuel.publicView(j.match,0).player;
 assert.equal(after.energy,before.energy+1);assert.equal(after.hp,before.hp-3);
 assert.equal(ctx.IngaJournal.dispatch(j,0,{type:'end_turn'}).ok,true);
 assert.equal(ctx.IngaJournal.dispatch(j,1,{type:'end_turn'}).ok,true);
 assert.equal(ctx.IngaDuel.publicView(j.match,0).player.energy,3);
});

test('class skills require exactly two energy and cannot be repeated',()=>{
 const j=ctx.IngaJournal.createJournal([duelThemes[0].cards,duelThemes[1].cards],98,catalog);
 j.match.state.players[0].energy=1;
 assert.equal(ctx.IngaJournal.dispatch(j,0,{type:'skill'}).reason,'skill_unavailable');
 j.match.state.players[0].energy=2;
 assert.equal(ctx.IngaJournal.dispatch(j,0,{type:'skill'}).ok,true);
 assert.equal(j.match.state.players[0].energy,0);
 assert.equal(ctx.IngaJournal.dispatch(j,0,{type:'skill'}).reason,'skill_unavailable');
});
test('all jobs can resolve actions without invalid states over several seeds',()=>{
 for(let i=0;i<4;i++)for(let k=0;k<4;k++)for(let seed=1;seed<=3;seed++){
  const j=ctx.IngaJournal.createJournal([duelThemes[i].cards,duelThemes[k].cards],seed,catalog);
  for(let step=0;step<400&&!j.match.state.over;step++){
   const seat=j.match.state.active,v=ctx.IngaDuel.publicView(j.match,seat);
   let action;if(v.relicOffer)action={type:'relic',id:v.relicOffer[0].id};
   else if(!v.player.skillUsed&&v.player.energy>=2&&v.player.hp>8)action={type:'skill'};
   else {const card=v.player.hand.find(c=>c.cost<=v.player.energy);action=card?{type:'play',uid:card.uid}:{type:'end_turn'}}
   const result=ctx.IngaJournal.dispatch(j,seat,action);
   assert.equal(result.ok,true,JSON.stringify({i,k,seed,step,action,result}));
   assert.ok(j.match.state.players.every(p=>Number.isFinite(p.hp)&&Number.isFinite(p.energy)));
  }
  assert.ok(j.match.state.over,'match must finish by turn limit');
 }
});
