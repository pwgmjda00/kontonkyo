/* Headless, server-portable two-player battle engine. No DOM or storage. */
(function(root){
'use strict';
const core=root.IngaCore, rules=root.IngaRules;
if(!core||!rules)throw Error('battle-core.js and battle-rules.js must load first');
function shuffle(items,random){const out=items.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function createMatch(decks,options={}){
 if(!Array.isArray(decks)||decks.length!==2||decks.some(d=>!Array.isArray(d)||d.length===0))throw Error('Two nonempty decks required');
 let rngState=(options.seed??1)>>>0;
 const random=()=>{rngState=(Math.imul(1664525,rngState)+1013904223)>>>0;return rngState/4294967296};
 let serial=0;
 const players=decks.map((deck,i)=>({hp:40,maxHp:40,block:0,energy:5,fate:0,hand:[],deck:shuffle(deck.map(c=>({...c,uid:++serial})),random),discard:[],seat:i}));
 const state={version:2,players,active:0,turn:1,over:false,winner:null,log:[],seed:options.seed??1,relics:[[],[]],relicOffer:null};
 draw(players[0],5,random);draw(players[1],5,random);
 return {state,random,getRngState:()=>rngState,setRngState:v=>{rngState=v>>>0}};
}
function draw(p,n,random){for(let i=0;i<n;i++){if(p.hand.length>=12)break;if(!p.deck.length)p.deck=shuffle(p.discard.splice(0),random);if(!p.deck.length)break;p.hand.push(p.deck.pop())}}
const RELICS=[
 {id:'blade',name:'破滅の刃',desc:'カード攻撃のダメージ+2'},
 {id:'shield',name:'星の守護',desc:'自分のターン開始時、防御+5'},
 {id:'heart',name:'不死の灯',desc:'自分のターン開始時、HPを3回復'},
 {id:'battery',name:'過剰動力',desc:'自分のターン開始時、エネルギー+1'},
 {id:'fate',name:'因果の歯車',desc:'自分のターン開始時、因果+2'},
 {id:'thorn',name:'反撃の棘',desc:'自分のターン開始時、相手に3ダメージ'},
 {id:'draw',name:'知識の泉',desc:'自分のターン開始時、1枚引く'},
 {id:'armor',name:'永遠の鎧',desc:'カードで得る防御+2'}
];
function offerRelics(s,random){
 const owned=new Set(s.relics[s.active]);const pool=RELICS.filter(r=>!owned.has(r.id));
 if(pool.length<3)return null;
 const picks=[];while(picks.length<3){const i=Math.floor(random()*pool.length);picks.push(pool.splice(i,1)[0].id)}
 return {seat:s.active,choices:picks};
}
function apply(match,seat,action){
 const s=match.state;
 if(s.over)return {ok:false,reason:'finished'};
 if(!Number.isInteger(seat)||seat!==s.active)return {ok:false,reason:'not_your_turn'};
 const a=s.players[seat],b=s.players[1-seat];
 if(s.relicOffer){
  if(action?.type!=='relic'||seat!==s.relicOffer.seat||!s.relicOffer.choices.includes(action.id))return {ok:false,reason:'choose_relic'};
  s.relics[seat].push(action.id);s.log.push({turn:s.turn,seat,type:'relic',name:RELICS.find(r=>r.id===action.id).name});s.relicOffer=null;
  return {ok:true,state:s};
 }
 const verdict=core.validateAction({over:s.over,player:a},action);
 if(!verdict.ok)return verdict;
 if(action.type==='play'){
  const idx=a.hand.findIndex(c=>c.uid===action.uid),card=a.hand[idx];
  if(typeof card.act!=='function')return {ok:false,reason:'missing_effect'};
  const savedPlayers=s.players.map(p=>({...p,hand:p.hand.slice(),deck:p.deck.slice(),discard:p.discard.slice()}));
  const savedRng=match.getRngState();
  
  const ctx={hit:(target,n)=>core.damage(target,n+(target===b&&s.relics[seat].includes('blade')?2:0)),draw:(p,n)=>draw(p,n,match.random),random:match.random,
   get intent(){return {kind:'none',value:0,name:'対人戦',desc:'相手の手番'}},
   set intent(_v){/* PvP has no telegraphed CPU action */}};
  const before={hp:a.hp,block:a.block,energy:a.energy,fate:a.fate,enemyHp:b.hp,enemyBlock:b.block};
  try{const outcome=rules.playCard(a,b,action.uid,ctx);if(!outcome.ok)return outcome}catch(_err){s.players=savedPlayers;match.setRngState(savedRng);return {ok:false,reason:'effect_failed'}}
  if(s.relics[seat].includes('armor')&&a.block>before.block)a.block+=2;
  s.log.push({turn:s.turn,seat,type:'play',cardId:card.id,name:card.name,damage:Math.max(0,before.enemyHp-b.hp),healing:Math.max(0,a.hp-before.hp),selfDamage:Math.max(0,before.hp-a.hp),block:Math.max(0,a.block-before.block),energy:a.energy-before.energy, fate:a.fate-before.fate});
 }else if(action.type==='fate'){
  const outcome=rules.spendFate(a,b);if(!outcome.ok)return outcome;s.log.push({turn:s.turn,seat,type:'fate',damage:0,name:'因果断絶'});
 }else if(action.type==='end_turn'){
  a.discard.push(...a.hand.splice(0));s.active=1-seat;
  b.block=0;b.energy=5;draw(b,5,match.random);
  s.log.push({turn:s.turn,seat,type:'end_turn'});s.turn++;
  if(s.relics[s.active].includes('shield'))b.block+=5;
  if(s.relics[s.active].includes('heart'))b.hp=Math.min(b.maxHp,b.hp+3);
  if(s.relics[s.active].includes('battery'))b.energy++;
  if(s.relics[s.active].includes('fate'))b.fate+=2;
  if(s.relics[s.active].includes('draw'))draw(b,1,match.random);
  if(s.relics[s.active].includes('thorn'))core.damage(a,3);
  if(s.turn%5===0)s.relicOffer=offerRelics(s,match.random);
 }
 if(a.hp<=0||b.hp<=0){s.over=true;s.winner=a.hp<=0&&b.hp<=0?null:a.hp<=0?1-seat:seat}
 if(s.log.length>100)s.log.splice(0,s.log.length-100);
 return {ok:true,state:s};
}
function publicView(match,seat){
 const s=match.state;
 if(seat!==0&&seat!==1)throw Error('Invalid seat');
 const own=s.players[seat],other=s.players[1-seat];
 const redact=p=>({hp:p.hp,maxHp:p.maxHp,block:p.block,energy:p.energy,fate:p.fate,handCount:p.hand.length,deckCount:p.deck.length,discardCount:p.discard.length});
 return {version:s.version,turn:s.turn,active:s.active,over:s.over,winner:s.winner,player:{...redact(own),hand:own.hand.map(c=>({id:c.id,uid:c.uid,name:c.name,cost:c.cost,desc:c.desc}))},opponent:redact(other),log:s.log.slice(-30),relics:s.relics.map(ids=>ids.map(id=>RELICS.find(r=>r.id===id))),relicOffer:s.relicOffer&&s.relicOffer.seat===seat?s.relicOffer.choices.map(id=>RELICS.find(r=>r.id===id)):null,relicPending:!!s.relicOffer};
}
root.IngaDuel=Object.freeze({createMatch,apply,publicView});
})(typeof globalThis!=='undefined'?globalThis:this);
