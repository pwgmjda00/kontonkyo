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
