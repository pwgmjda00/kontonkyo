'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({});
for(const name of ['battle-core.js','battle-rules.js','cards.js','duel-engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),ctx,{filename:name});
const {cards,duelThemes,IngaDuel}=vm.runInContext('({cards,duelThemes,IngaDuel})',ctx);
const decks=duelThemes.slice(0,2).map(t=>t.cards.map(id=>cards.find(c=>c.id===id)));
test('second seat receives six cards and two fate; first receives five and zero',()=>{
 const m=IngaDuel.createMatch(decks,{seed:2});
 assert.equal(m.state.players[0].hand.length,5);assert.equal(m.state.players[1].hand.length,6);
 assert.equal(m.state.players[0].fate,0);assert.equal(m.state.players[1].fate,2);
});
test('fate conversion cannot push energy above eight',()=>{
 const m=IngaDuel.createMatch(decks,{seed:2}),p=m.state.players[0];
 p.fate=12;p.energy=8;
 assert.equal(IngaDuel.apply(m,0,{type:'fate',mode:'energy'}).reason,'energy_full');
 assert.equal(p.energy,8);assert.equal(p.fate,12);
});
test('blood job skill requires two energy and caps total energy',()=>{
 const blood=duelThemes.find(t=>t.id==='blood').cards.map(id=>cards.find(c=>c.id===id));
 const m=IngaDuel.createMatch([blood,decks[0]],{seed:4}),p=m.state.players[0];
 p.energy=8;const hp=p.hp;
 assert.equal(IngaDuel.apply(m,0,{type:'skill'}).ok,true);
 assert.equal(p.energy,8);assert.equal(p.hp,hp-3);assert.equal(p.skillDebt,1);
});
test('all jobs respect energy cap after card plays and turn transitions',()=>{
 for(const first of duelThemes)for(const second of duelThemes){
  const d=[first,second].map(t=>t.cards.map(id=>cards.find(c=>c.id===id)));
  const m=IngaDuel.createMatch(d,{seed:39});
  for(let n=0;n<350&&!m.state.over;n++){
   const p=m.state.players[m.state.active];let a;
   if(m.state.relicOffer)a={type:'relic',id:m.state.relicOffer.choices[0]};
   else{const c=p.hand.find(c=>c.cost<=p.energy);a=c?{type:'play',uid:c.uid}:{type:'end_turn'}}
   const r=IngaDuel.apply(m,m.state.active,a);assert.equal(r.ok,true,JSON.stringify(r));
   assert.ok(m.state.players.every(x=>x.energy>=0&&x.energy<=8),'energy bounds');
  }
 }
});
