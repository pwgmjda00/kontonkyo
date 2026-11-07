/* FIFTY-TWO layout JOKER adapter: separate scoring and explicit action support. */
(function(root){'use strict';
const score=root.FiftyTwoJokerScoreMode,actions=root.FiftyTwoJokerActions;
if(!score||!actions)throw new Error('JOKER layout dependencies missing');
const suits=['♠','♥','♦','♣'];
function create(game,{reset,hasProgress,label,hiddenDeck=false,rankMutation=false,peekFormat=null,singleSuit=false,deckLabel='山札'}={}){
 if(typeof label!=='function')throw new TypeError('card label callback required');
 const mode=score.create(game,{reset,hasProgress});
 function active(){return mode.mode==='joker'&&!!mode.joker}
 function effectType(){return active()?actions.type(mode.joker):null}
 function rank(card){return card&&(rankMutation&&active()?actions.effectiveCard(mode.joker,card).r:card.r)}
 function canRescue(used){return active()&&actions.canRescue(mode.joker,used)}
 function refresh({base=0,finished=false,win=false,moves=0,deck=[],recommendation=''}={}){
  const t=effectType();
  let abilityText='';
  if(active()){
   if(t==='peekNext'&&hiddenDeck){
    const seen=actions.peek(mode.joker,deck);
    abilityText='👁 '+(peekFormat?peekFormat(seen):'次の'+deckLabel+'：'+(seen.length?label(seen.at(-1)):deckLabel+'は空'));
   }else if(t==='revealCount'&&hiddenDeck){
    const counts=actions.suitCounts(mode.joker,deck)||[0,0,0,0];
    abilityText='📊 未公開の'+deckLabel+'：'+(singleSuit?'♠ '+counts[0]+'枚':counts.map((n,i)=>suits[i]+' '+n+'枚').join(' / '));
   }else if(t==='hintChance'){
    abilityText=recommendation?'💡 推奨手：'+recommendation:'💡 今は推奨できる手がありません';
   }else if(rankMutation&&(t==='upgradeRank'||t==='downgradeRank')){
    abilityText='🧬 場札と捨て札の数字が'+(t==='upgradeRank'?'+1':'-1')+'（A〜Kで固定）。表示も判定も変化';
   }else if(['eraseMistake','reviveOnce','shieldMistake'].includes(t)&&rankMutation){
    abilityText='🪄 山札が尽きて手詰まりになると、公開中の場札を1枚だけ救済除去できます';
   }else{
    abilityText='この作品では終了時の得点補正として発動。カード操作への効果はありません';
   }
  }
  return mode.refresh({base,finished,win,round:Math.max(1,moves),totalRounds:Math.max(2,moves+1),abilityText});
 }
 return Object.freeze({begin:mode.begin,refresh,rank,canRescue,effectType,get mode(){return mode.mode},get joker(){return mode.joker}});
}
const api=Object.freeze({create});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FiftyTwoJokerLayoutMode=api;
})(typeof window!=='undefined'?window:globalThis);
