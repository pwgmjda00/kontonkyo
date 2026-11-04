/* Headless, server-portable two-player battle engine. No DOM or storage. */
(function(root){
'use strict';
const core=root.IngaCore;
if(!core)throw Error('battle-core.js must load first');
function shuffle(items,random){const out=items.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function createMatch(decks,options={}){
 if(!Array.isArray(decks)||decks.length!==2||decks.some(d=>!Array.isArray(d)||d.length===0))throw Error('Two nonempty decks required');
 let rngState=(options.seed??1)>>>0;
 const random=()=>{rngState=(Math.imul(1664525,rngState)+1013904223)>>>0;return rngState/4294967296};
 let serial=0;
 const players=decks.map((deck,i)=>({hp:40,maxHp:40,block:0,energy:5,fate:0,hand:[],deck:shuffle(deck.map(c=>({...c,uid:++serial})),random),discard:[],seat:i}));
 const state={version:1,players,active:0,turn:1,over:false,winner:null,log:[],seed:options.seed??1};
 draw(players[0],5,random);draw(players[1],5,random);
 return {state,random,getRngState:()=>rngState,setRngState:v=>{rngState=v>>>0}};
}
function draw(p,n,random){for(let i=0;i<n;i++){if(p.hand.length>=12)break;if(!p.deck.length)p.deck=shuffle(p.discard.splice(0),random);if(!p.deck.length)break;p.hand.push(p.deck.pop())}}
function apply(match,seat,action){
 const s=match.state;
 if(s.over)return {ok:false,reason:'finished'};
 if(!Number.isInteger(seat)||seat!==s.active)return {ok:false,reason:'not_your_turn'};
 const a=s.players[seat],b=s.players[1-seat];
 const verdict=core.validateAction({over:s.over,player:a},action);
 if(!verdict.ok)return verdict;
 if(action.type==='play'){
  const idx=a.hand.findIndex(c=>c.uid===action.uid),card=a.hand[idx];
  if(typeof card.act!=='function')return {ok:false,reason:'missing_effect'};
  const savedPlayers=s.players.map(p=>({...p,hand:p.hand.slice(),deck:p.deck.slice(),discard:p.discard.slice()}));
  const savedRng=match.getRngState();
  a.energy-=card.cost;a.hand.splice(idx,1);
  const ctx={hit:core.damage,draw:(p,n)=>draw(p,n,match.random),random:match.random,
   get intent(){return {kind:'none',value:0,name:'対人戦',desc:'相手の手番'}},
   set intent(_v){/* PvP has no telegraphed CPU action */}};
  try{card.act(a,b,ctx)}catch(_err){s.players=savedPlayers;match.setRngState(savedRng);return {ok:false,reason:'effect_failed'}}
  a.discard.push(card);s.log.push({turn:s.turn,seat,type:'play',cardId:card.id});
 }else if(action.type==='fate'){
  a.fate-=6;b.block=0;core.damage(b,18);a.energy+=2;s.log.push({turn:s.turn,seat,type:'fate'});
 }else if(action.type==='end_turn'){
  a.discard.push(...a.hand.splice(0));s.active=1-seat;
  b.block=0;b.energy=5;draw(b,5,match.random);
  s.turn++;s.log.push({turn:s.turn,seat,type:'end_turn'});
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
 return {version:s.version,turn:s.turn,active:s.active,over:s.over,winner:s.winner,player:{...redact(own),hand:own.hand.map(c=>({id:c.id,uid:c.uid,name:c.name,cost:c.cost,desc:c.desc}))},opponent:redact(other),log:s.log.slice(-30)};
}
root.IngaDuel=Object.freeze({createMatch,apply,publicView});
})(typeof globalThis!=='undefined'?globalThis:this);
