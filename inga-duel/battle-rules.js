/* Shared battle rules for CPU and two-player modes. No DOM or storage. */
(function(root){
'use strict';
const core=root.IngaCore;
if(!core)throw Error('battle-core.js must load first');
function spendFate(actor,target){
 if(!actor||!target||!Number.isFinite(actor.fate)||actor.fate<6)return {ok:false,reason:'fate'};
 actor.fate-=6;
 target.block=0;
 const damage=core.damage(target,18);
 actor.energy+=2;
 return {ok:true,damage};
}
function playCard(actor,target,uid,ctx){
 if(!actor||!target||!Array.isArray(actor.hand)||!Array.isArray(actor.discard))return {ok:false,reason:'invalid_state'};
 const verdict=core.validateAction({over:false,player:actor},{type:'play',uid});
 if(!verdict.ok)return verdict;
 const idx=actor.hand.findIndex(c=>c.uid===uid),card=actor.hand[idx];
 if(!card||typeof card.act!=='function')return {ok:false,reason:'missing_effect'};
 actor.energy-=card.cost;actor.hand.splice(idx,1);
 card.act(actor,target,ctx);
 actor.discard.push(card);
 return {ok:true,card};
}
root.IngaRules=Object.freeze({spendFate,playCard});
})(typeof globalThis!=='undefined'?globalThis:this);
