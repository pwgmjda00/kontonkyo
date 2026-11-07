/* FIFTY-TWO action-oriented JOKER abilities. Pure, deterministic, opt-in helpers. */
(function(root){'use strict';
const types=Object.freeze({
 peekNext:'次に公開するカードを透視',
 revealCount:'未公開カードのマーク別枚数を表示',
 hintChance:'残り札から次の一手を提案',
 eraseMistake:'最初の予想失敗を1回だけ救済',
 reviveOnce:'最初の予想失敗を1回だけ救済',
 shieldMistake:'最初の予想失敗を1回だけ救済',
 upgradeRank:'公開カードの数字を+1（最大K）',
 downgradeRank:'公開カードの数字を-1（最小A）'
});
function type(joker){return joker?.effect?.type||null}
function supports(joker){return Object.hasOwn(types,type(joker))}
function describe(joker){return types[type(joker)]||''}
function effectiveCard(joker,card){
 if(!card)return card;
 const t=type(joker);
 if(t!=='upgradeRank'&&t!=='downgradeRank')return card;
 return {...card,r:Math.max(1,Math.min(13,card.r+(t==='upgradeRank'?1:-1)))};
}
function canRescue(joker,used){return !used&&['eraseMistake','reviveOnce','shieldMistake'].includes(type(joker))}
function peek(joker,cards){return type(joker)==='peekNext'?cards.slice():[]}
function suitCounts(joker,cards){if(type(joker)!=='revealCount')return null;return [0,1,2,3].map(si=>cards.filter(c=>c.si===si).length)}
function highLowHint(joker,current,deck){
 if(type(joker)!=='hintChance')return null;
 const higher=deck.filter(c=>c.r>current.r).length,lower=deck.filter(c=>c.r<current.r).length;
 return {higher,lower,tie:deck.length-higher-lower,choice:higher>=lower?'HIGH':'LOW'};
}
function countdownHint(joker,value,offer){
 if(type(joker)!=='hintChance')return null;
 const options=[];
 offer.forEach((raw,index)=>{const c=effectiveCard(joker,raw);for(const sign of [1,-1]){const after=value+sign*c.r;if(after>=0)options.push({index,sign,after,rank:c.r})}});
 options.sort((a,b)=>Math.abs(a.after)-Math.abs(b.after)||a.after-b.after||a.index-b.index||a.sign-b.sign);
 return options[0]||null;
}
const api=Object.freeze({type,supports,describe,effectiveCard,canRescue,peek,suitCounts,highLowHint,countdownHint});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.FiftyTwoJokerActions=api;
})(typeof window!=='undefined'?window:globalThis);
