// node fifty-two-preview/tests/gin-rummy-benchmark.cjs [matchesPerSetting=5]
// Deterministic per-seed games, fixed player policy, same seed across CPU settings.
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','gin-rummy.html'),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if(!source)throw Error('game script not found');
const code=source.replace(/\}\)\(\);\s*$/,'globalThis.BENCH={start,draw,discard,options,valid,get:()=>s};})();');
if(code===source)throw Error('game script export injection failed');
const perSetting=Math.min(100,Math.max(1,Number(process.argv[2])||5));
const settings=[['easy','balanced'],['normal','balanced'],['hard','balanced'],['hard','aggressive'],['hard','patient']];
function rng(seed){let x=seed>>>0;return()=>{x=(x+0x6D2B79F5)>>>0;let z=x;z=Math.imul(z^(z>>>15),z|1);z^=z+Math.imul(z^(z>>>7),z|61);return ((z^(z>>>14))>>>0)/4294967296}}
function play(level,style,seed){
 const nodes=new Map(),store=new Map();
 const el=id=>{if(!nodes.has(id))nodes.set(id,{value:id==='difficulty'?level:id==='personality'?style:'',replaceChildren(){},setAttribute(){},textContent:'',disabled:false});return nodes.get(id)};
 const doc={getElementById:el,createElement:()=>({setAttribute(){}})};
 const math=Object.create(Math);math.random=rng(seed);
 const ctx={document:doc,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},confirm:()=>true,Math:math,console};
 vm.createContext(ctx);vm.runInContext(code,ctx,{timeout:2000});
 const g=ctx.BENCH;let turns=0,hands=0;
 while(turns<1800&&hands<100){
  const s=g.get();
  if(!g.valid(s))throw Error('invalid state at turn '+turns+', phase '+s.phase);
  if(s.phase==='match')return {winner:s.myTotal>s.cpuTotal?'player':'cpu',hands,turns,score:[s.myTotal,s.cpuTotal]};
  if(s.phase==='between'){hands++;el('nextRound').onclick();continue}
  if(s.phase==='draw')g.draw('stock');
  if(s.phase==='discard'){
   const now=g.get(),forbid=now.drawnFrom==='pile'?now.me.findIndex(c=>c.si*13+c.r-1===now.pileTaken):-1;
   const moves=g.options(now.me,forbid).sort((a,b)=>a.dead-b.dead);
   if(!moves.length)throw Error('no legal discard');
   now.selected=moves[0].i;g.discard(moves[0].dead<=5);
  }
  turns++;
 }
 throw Error('game failed to finish within safety limits');
}
let failures=0;const results=[];const started=Date.now();
for(const [level,style] of settings){
 const row={difficulty:level,style,matches:0,cpuWins:0,playerWins:0,avgHands:0,avgTurns:0,errors:0};
 for(let i=0;i<perSetting;i++){
  try{const game=play(level,style,0xA13F00+i);row.matches++;row[game.winner==='cpu'?'cpuWins':'playerWins']++;row.avgHands+=game.hands;row.avgTurns+=game.turns}
  catch(e){row.errors++;failures++;console.error(level,style,'seed',i,String(e))}
 }
 if(row.matches){row.avgHands=+(row.avgHands/row.matches).toFixed(1);row.avgTurns=+(row.avgTurns/row.matches).toFixed(1)}
 results.push(row);
}
console.log(JSON.stringify({matchesPerSetting:perSetting,elapsedMs:Date.now()-started,results},null,2));
if(failures)process.exitCode=1;
