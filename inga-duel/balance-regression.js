'use strict';
/* Run: node inga-duel/balance-regression.js
   Deterministic smoke/regression tests. This is not a proof of PvP balance. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=__dirname,context=vm.createContext({console});
for(const file of ['battle-core.js','battle-rules.js','cards.js','duel-engine.js']){
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
}
const cards=vm.runInContext('cards',context),themes=vm.runInContext('duelThemes',context),engine=context.IngaDuel;
const pvp=cards.filter(c=>c.id>=1000&&c.id<1120),catalog=new Map(pvp.map(c=>[c.id,c]));
assert.equal(pvp.length,120);
assert.equal(new Set(pvp.map(c=>c.id)).size,120);
assert.equal(new Set(pvp.map(c=>c.desc)).size,120);
let cardChecks=0,matchChecks=0,errors=[];
for(const card of pvp)for(const hp of [9,30,60])for(const block of [0,15]){
 const a={hp,maxHp:60,block,energy:8,fate:6,hand:[],deck:[],discard:[],cardsPlayed:0},
 b={hp:60,maxHp:60,block,energy:8,fate:6,hand:[],deck:[],discard:[]};
 const ctx={hit:(target,n)=>{assert.ok(Number.isFinite(n)&&n>=0);const absorb=Math.min(target.block,n);target.block-=absorb;target.hp-=n-absorb;return{dealt:n-absorb,absorbed:absorb}},draw:()=>{}};
 card.act(a,b,ctx);
 for(const v of [a.hp,b.hp,a.block,b.block,a.fate,b.fate])assert.ok(Number.isFinite(v));
 assert.ok(a.fate>=0&&a.fate<=12&&b.fate>=0&&b.fate<=12);
 cardChecks++;
}
function policy(s,mode){
 if(s.relicOffer)return{type:'relic',id:s.relicOffer.choices[0]};
 const p=s.players[s.active],playable=p.hand.filter(c=>c.cost<=p.energy);
 if(playable.length){
  playable.sort((a,b)=>mode===0?b.cost-a.cost:mode===1?a.cost-b.cost:
   Number(b.desc.includes('ダメージ'))-Number(a.desc.includes('ダメージ'))||a.cost-b.cost);
  return{type:'play',uid:playable[0].uid};
 }
 return{type:'end_turn'};
}
function match(a,b,seed,mode){
 const m=engine.createMatch([a,b],{seed});
 for(let step=0;step<600&&!m.state.over;step++){
  const result=engine.apply(m,m.state.active,policy(m.state,mode));
  assert.equal(result.ok,true,'Invalid action '+result.reason);
  for(const p of m.state.players)for(const v of [p.hp,p.block,p.fate,p.energy])assert.ok(Number.isFinite(v));
 }
 assert.equal(m.state.over,true,'Match did not terminate');
 matchChecks++;return m.state.winner;
}
for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
 const a=themes[i].cards.map(id=>catalog.get(id)),b=themes[j].cards.map(id=>catalog.get(id));
 for(let n=0;n<60;n++)match(n%2?b:a,n%2?a:b,n*193+i*31+j,n%3);
}
for(const c of pvp){
 const deck=Array(30).fill(c),opponent=themes[(Math.floor((c.id-1000)/30)+1)%4].cards.map(id=>catalog.get(id));
 match(deck,opponent,c.id,0);
}
console.log(JSON.stringify({ok:true,cards:pvp.length,cardChecks,matchChecks,errors},null,2));
