/* FIFTY-TWO DAILY JOKER 77 · deterministic offline catalog · v1 */
(function(root){'use strict';
const families=[
{key:'berserk',name:'狂戦士',icon:'🩸',color:'#e96477',verbs:['倍賭','背水','猛進','反動','血盟','過熱','決死'],types:['riskMultiplier','lossMultiplier','streakBonus','riskThreshold','comebackBonus','overheatBonus','lastChanceBonus']},
{key:'mirror',name:'鏡像',icon:'🪞',color:'#9bd7eb',verbs:['反射','倒錯','複写','相似','左右','反転','二重'],types:['reverseRank','mirrorScore','copyLast','tieBonus','swapChoice','reverseSuit','duplicateReward']},
{key:'time',name:'時間',icon:'⏳',color:'#e8bf79',verbs:['早鐘','延長','停滞','先刻','遅延','再演','終幕'],types:['shortenRounds','extendRounds','pausePenalty','firstTurnBonus','delayPenalty','replayChance','finalRoundBonus']},
{key:'vision',name:'透視',icon:'👁️',color:'#c6a6f5',verbs:['予兆','残響','遠眼','記録','索敵','読心','開示'],types:['peekNext','revealHistory','revealCount','memoryAssist','hintChance','peekOpponent','revealPool']},
{key:'void',name:'虚無',icon:'🕳️',color:'#b5b5c3',verbs:['無効','忘失','沈黙','空白','断絶','隔離','消滅'],types:['nullifyPenalty','eraseMistake','muteEffect','blankCard','breakStreak','isolateSuit','removeCard']},
{key:'royal',name:'王権',icon:'👑',color:'#f2d778',verbs:['王殺','戴冠','臣従','簒奪','大赦','王命','玉座'],types:['kingWeakest','kingStrongest','faceBonus','stealLead','forgiveTie','forceRank','royalBonus']},
{key:'chaos',name:'混沌',icon:'🎲',color:'#f29cdb',verbs:['乱数','偏向','混線','暴走','賽目','不定','異常'],types:['randomBonus','weightedDraw','shuffleOrder','chaosMultiplier','diceBonus','randomRank','wildRound']},
{key:'mutation',name:'変異',icon:'🧬',color:'#99e7a8',verbs:['進化','退化','変色','擬態','融合','分裂','変質'],types:['upgradeRank','downgradeRank','changeSuit','wildSuit','mergePair','splitReward','transformCard']},
{key:'balance',name:'天秤',icon:'⚖️',color:'#b2d7ff',verbs:['均衡','逆転','補正','分配','相殺','調停','同点'],types:['catchupScore','underdogBonus','scoreNormalize','splitPoints','cancelDifference','balanceHand','tieAdvantage']},
{key:'miracle',name:'奇跡',icon:'🪄',color:'#ffe0c6',verbs:['蘇生','保険','救済','祝福','護符','祈願','再起'],types:['reviveOnce','protectScore','retryChance','blessFirst','shieldMistake','wishBonus','recoverStreak']},
{key:'causality',name:'因果',icon:'🌌',color:'#afa6ff',verbs:['代償','連鎖','宿命','約束','応報','反復','収束'],types:['conditionalBonus','chainReward','destinyRank','pledgeReward','karmaPenalty','repeatBonus','convergeScore']}
];
const catalog=Object.freeze(families.flatMap((f,fi)=>f.verbs.map((verb,i)=>Object.freeze({id:'J'+String(fi*7+i+1).padStart(2,'0'),family:f.key,familyName:f.name,name:f.name+'・'+verb,icon:f.icon,accent:f.color,art:'sigil-'+f.key+'-'+(i+1),effect:Object.freeze({type:f.types[i],tier:i+1,power:[1,2,3,4,5,6,7][i],trigger:['対局開始','カード選択','得点計算','ラウンド終了','条件達成','劣勢時','最終局面'][i]}),description:verb+'：'+['序盤の判断に干渉する','選択の価値を変える','得点の計算を変える','局面の流れを揺らす','条件達成時に作用する','不利な状況で力を発揮する','終盤に特殊な変化を起こす'][i]}))));
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function localDate(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function daily(date=localDate()){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('invalid date');const ids=catalog.map((_,i)=>i);let seed=hash('FIFTY-TWO|JOKER77|'+date);function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}for(let i=ids.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}return ids.slice(0,7).map(i=>catalog[i])}
function get(id){return catalog.find(c=>c.id===id)||null}
function validateEquip(id,date=localDate()){return !!get(id)&&daily(date).some(c=>c.id===id)}
function resolve(id,context){const c=get(id);if(!c)return {supported:false,reason:'unknown joker'};const supported=Array.isArray(context?.supportedEffects)&&context.supportedEffects.includes(c.effect.type);return supported?{supported:true,joker:c,effect:c.effect}:{supported:false,joker:c,reason:'game has not implemented this effect'} }
const api=Object.freeze({catalog,families,localDate,daily,get,validateEquip,resolve});if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FiftyTwoJokers=api;
})(typeof window!=='undefined'?window:globalThis);
