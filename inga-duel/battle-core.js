/* 因果決闘 shared battle primitives. Pure, DOM-free, deterministic with injected RNG. */
(function(root){
'use strict';
function damage(target,amount){
 const n=Math.max(0,Math.floor(Number(amount)||0));
 const absorbed=Math.min(Math.max(0,target.block||0),n);
 target.block=Math.max(0,(target.block||0)-absorbed);
 target.hp-=n-absorbed;
 return {absorbed,dealt:n-absorbed};
}
function heal(target,amount){const before=target.hp;target.hp=Math.min(target.maxHp||40,target.hp+Math.max(0,Math.floor(amount)));return target.hp-before}
function validateAction(state,action){
 if(!state||state.over)return {ok:false,reason:'finished'};
 if(!action||typeof action!=='object')return {ok:false,reason:'invalid'};
 if(action.type==='end_turn')return {ok:true};
 if(action.type==='fate')return state.player.fate>=6?{ok:true}:{ok:false,reason:'fate'};
 if(action.type==='play'){
 const card=state.player.hand.find(c=>c.uid===action.uid);
 return card&&card.cost<=state.player.energy?{ok:true,card}:{ok:false,reason:'card_or_energy'};
 }
 return {ok:false,reason:'unknown'};
}
function snapshot(state){
 return JSON.parse(JSON.stringify({version:1,turn:state.turn,over:state.over,player:state.player,opponent:state.opponent,intent:state.intent}));
}
function seededRandom(seed){let x=seed>>>0;return function(){x=(Math.imul(1664525,x)+1013904223)>>>0;return x/4294967296}}
root.IngaCore=Object.freeze({damage,heal,validateAction,snapshot,seededRandom});
})(typeof globalThis!=='undefined'?globalThis:this);
