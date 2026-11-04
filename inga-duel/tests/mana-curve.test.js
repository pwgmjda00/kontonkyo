'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({});
for(const file of ['battle-core.js','battle-rules.js','cards.js','duel-engine.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),ctx,{filename:file});
const {cards,duelThemes,IngaDuel}=vm.runInContext('({cards,duelThemes,IngaDuel})',ctx);
const expected=[2,8,10,6,3,1];
test('each job has exactly thirty cards on the same 0-5 mana curve',()=>{
 for(const job of duelThemes){
  const deck=job.cards.map(id=>cards.find(c=>c.id===id));
  assert.equal(deck.length,30);assert.ok(deck.every(Boolean));
  const curve=Array.from({length:6},(_,cost)=>deck.filter(c=>c.cost===cost).length);
  assert.deepEqual(curve,expected,job.id);
 }
});
test('five-cost finishers remain playable at base four energy via fate conversion',()=>{
 for(const job of duelThemes){
  const deck=job.cards.map(id=>cards.find(c=>c.id===id));
  const m=IngaDuel.createMatch([deck,deck],{seed:7}),p=m.state.players[0];
  p.fate=2;assert.equal(p.energy,4);
  assert.equal(IngaDuel.apply(m,0,{type:'fate',mode:'energy'}).ok,true);
  assert.equal(p.energy,5);
 }
});
