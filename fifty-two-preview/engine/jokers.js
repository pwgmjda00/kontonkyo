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
const ruleDescriptions=["勝利時+7点","勝利時+21点","連勝数×5点","失敗時+3点","劣勢なら+30点","偶数ラウンドで得点3倍","最終局面+77点","奇数ラウンドの得点を反転し救済","偶数ラウンド+14点","前半は得点半分・後半2倍","同点時+11点","ラウンド番号×2点","奇数ラウンド+21点","毎ラウンド+7点","最初の3ラウンド+15点","4ラウンド以降+20点","毎ラウンド+3点","第1ラウンド+50点","第3・6・9ラウンド+30点","最終2ラウンド得点3倍","最終ラウンド+100点","第1ラウンド+11点","2連勝以上+20点","3連勝以上+40点","偶数連勝+14点","5連勝以上+77点","敗北時+5点","連勝数の2乗を加算","失敗時+10点","0点なら+15点","得点を常に最低5点にする","奇数得点を0にして偶数得点2倍","失敗時+25点","5の倍数ラウンド+35点","最終ラウンド+66点","得点13以上で+13点","得点7以上で+21点","勝利時+33点","劣勢なら得点4倍","引き分け時+20点","ラウンド番号が素数なら+17点","勝利時得点5倍","毎ラウンド-7〜+7点","毎ラウンド-21〜+21点","毎ラウンド-33〜+33点","得点を0か4倍にする","サイコロ1〜6の10倍を加算","ラウンドで加算量が変動","77点か0点の二択","得点+1","得点-1して2倍","偶数ラウンド+23点","得点が奇数なら3倍","得点を次の10の倍数に切り上げ","得点を2倍して+7","得点を5倍して-10","劣勢なら+10点","劣勢なら+25点","得点が低いほど増幅","勝利時+10点・失敗時+20点","得点が10未満なら+50点","3ラウンドごとに+44点","同点なら+77点","0点なら+11点","失敗時+17点","連勝0なら+30点","第1ラウンド+33点","失敗時+44点","第7ラウンド+77点","最後のラウンドで得点7倍","得点が偶数なら+13点","連勝ごとに+9点","第7ラウンド+77点","3ラウンドごとに+33点","失敗時-10点・勝利時+30点","前ラウンドと同じ得点なら+50点","最終ラウンドで得点を77にする"];
const catalog=Object.freeze(families.flatMap((f,fi)=>f.verbs.map((verb,i)=>Object.freeze({id:'J'+String(fi*7+i+1).padStart(2,'0'),family:f.key,familyName:f.name,name:f.name+'・'+verb,icon:f.icon,accent:f.color,art:'sigil-'+f.key+'-'+(i+1),effect:Object.freeze({type:f.types[i],tier:i+1,power:[1,2,3,4,5,6,7][i],trigger:['対局開始','カード選択','得点計算','ラウンド終了','条件達成','劣勢時','最終局面'][i]}),description:ruleDescriptions[fi*7+i]}))));
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function localDate(d=new Date()){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function daily(date=localDate()){if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('invalid date');const ids=catalog.map((_,i)=>i);let seed=hash('FIFTY-TWO|JOKER77|'+date);function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}for(let i=ids.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]]}return ids.slice(0,7).map(i=>catalog[i])}
function get(id){return catalog.find(c=>c.id===id)||null}
function validateEquip(id,date=localDate()){return !!get(id)&&daily(date).some(c=>c.id===id)}
function resolve(id,context){const c=get(id);if(!c)return {supported:false,reason:'unknown joker'};const supported=Array.isArray(context?.supportedEffects)&&context.supportedEffects.includes(c.effect.type);return supported?{supported:true,joker:c,effect:c.effect}:{supported:false,joker:c,reason:'game has not implemented this effect'} }
function equipped(date=localDate()){let id=null;try{id=localStorage.getItem('fifty-two-joker-equip-'+date)}catch(e){}return validateEquip(id,date)?get(id):null}
function applyScore(joker,base,ctx={}){if(!joker||!Number.isFinite(base)||base<0)return {score:base,delta:0,description:'通常ルール'};const win=!!ctx.win,streak=ctx.streak||0,round=ctx.round||1,totalRounds=Number.isInteger(ctx.totalRounds)&&ctx.totalRounds>0?ctx.totalRounds:10,final=ctx.final===true||round>=totalRounds;let score=base;switch(joker.id){
case 'J01': score=win?base+7:base;break;
case 'J02': score=win?base+21:base;break;
case 'J03': score=base+streak*5;break;
case 'J04': score=win?base:base+3;break;
case 'J05': score=ctx.behind?base+30:base;break;
case 'J06': score=round%2===0?base*3:base;break;
case 'J07': score=final?base+77:base;break;
case 'J08': score=round%2?Math.max(0,15-base):base;break;
case 'J09': score=round%2===0?base+14:base;break;
case 'J10': score=round<=Math.floor(totalRounds/2)?Math.floor(base/2):base*2;break;
case 'J11': score=ctx.tie?base+11:base;break;
case 'J12': score=base+round*2;break;
case 'J13': score=round%2?base+21:base;break;
case 'J14': score=base+7;break;
case 'J15': score=round<=3?base+15:base;break;
case 'J16': score=round>=4?base+20:base;break;
case 'J17': score=base+3;break;
case 'J18': score=round===1?base+50:base;break;
case 'J19': score=round%3===0?base+30:base;break;
case 'J20': score=round>=Math.max(1,totalRounds-1)?base*3:base;break;
case 'J21': score=final?base+100:base;break;
case 'J22': score=round===1?base+11:base;break;
case 'J23': score=streak>=2?base+20:base;break;
case 'J24': score=streak>=3?base+40:base;break;
case 'J25': score=streak>0&&streak%2===0?base+14:base;break;
case 'J26': score=streak>=5?base+77:base;break;
case 'J27': score=win?base:base+5;break;
case 'J28': score=base+streak*streak;break;
case 'J29': score=win?base:base+10;break;
case 'J30': score=base===0?15:base;break;
case 'J31': score=Math.max(5,base);break;
case 'J32': score=base%2===0?base*2:0;break;
case 'J33': score=win?base:base+25;break;
case 'J34': score=round%5===0?base+35:base;break;
case 'J35': score=final?base+66:base;break;
case 'J36': score=base>=13?base+13:base;break;
case 'J37': score=base>=7?base+21:base;break;
case 'J38': score=win?base+33:base;break;
case 'J39': score=ctx.behind?base*4:base;break;
case 'J40': score=ctx.tie?base+20:base;break;
case 'J41': score=[2,3,5,7].includes(round)?base+17:base;break;
case 'J42': score=win?base*5:base;break;
case 'J43': score=base+((hash(joker.id+'|'+round)%15)-7);break;
case 'J44': score=base+((hash(joker.id+'|'+round)%43)-21);break;
case 'J45': score=base+((hash(joker.id+'|'+round)%67)-33);break;
case 'J46': score=hash(joker.id+'|'+round)%2?base*4:0;break;
case 'J47': score=base+((hash(joker.id+'|'+round)%6)+1)*10;break;
case 'J48': score=base+(round*17)%53;break;
case 'J49': score=hash(joker.id+'|'+round)%2?77:0;break;
case 'J50': score=base+1;break;
case 'J51': score=Math.max(0,(base-1)*2);break;
case 'J52': score=round%2===0?base+23:base;break;
case 'J53': score=base%2?base*3:base;break;
case 'J54': score=Math.ceil(base/10)*10;break;
case 'J55': score=base*2+7;break;
case 'J56': score=Math.max(0,base*5-10);break;
case 'J57': score=ctx.behind?base+10:base;break;
case 'J58': score=ctx.behind?base+25:base;break;
case 'J59': score=base+Math.max(0,30-base);break;
case 'J60': score=win?base+10:base+20;break;
case 'J61': score=base<10?base+50:base;break;
case 'J62': score=round%3===0?base+44:base;break;
case 'J63': score=ctx.tie?base+77:base;break;
case 'J64': score=base===0?11:base;break;
case 'J65': score=win?base:base+17;break;
case 'J66': score=streak===0?base+30:base;break;
case 'J67': score=round===1?base+33:base;break;
case 'J68': score=win?base:base+44;break;
case 'J69': score=round===7?base+77:base;break;
case 'J70': score=final?base*7:base;break;
case 'J71': score=base%2===0?base+13:base;break;
case 'J72': score=base+streak*9;break;
case 'J73': score=round===7?base+77:base;break;
case 'J74': score=round%3===0?base+33:base;break;
case 'J75': score=win?base+30:Math.max(0,base-10);break;
case 'J76': score=ctx.previousScore===base?base+50:base;break;
case 'J77': score=final?77:base;break;
}score=Math.max(0,Math.floor(score));return {score,delta:score-base,description:joker.name+'：'+(score-base>=0?'+':'')+(score-base)+'点'} }

const battleRules=["自分の強さ2倍","自分3倍、敵+3","自分+ラウンド×4","自分+30、敵+15","負けるカードを敵+20に","自分4倍からラウンド×2を減算","最終戦777、それ以外-3","双方の数字を15から反転","自分と敵の数字を交換","敵の数字を複写して+1","同値なら自分+22","数字を交換して反転","同じスートなら+33","双方の数字を合算","序盤3戦+25","7戦目以降+40","偶数戦は敵の数字0","初戦のみ99","3戦ごとに+50","最終戦のみ999","第10戦で777","負けるとき敵+2","敵が弱いほど強化","敵の元の数字が小さいほど+3倍","数字差の2倍を追加","敵が偶数なら+50","スート一致で+60","敵が絵札なら+77","敵の強さを0にする","敵の強さ-7","敵が奇数なら0","敵のAを無効化","偶数戦で敵を消去","敵のスペードを消去","敵の絵札とAを消去","自分のKが100","双方のKが最弱","自分の絵札+35","敗北時に王位を簒奪","同値なら+50","自分の7が777","絵札に+77","乱数で自分+0〜30","乱数で敵+0〜20","乱数で自分+70か-7","自分が999か0","ラウンドで+0〜59","自分の数字を1〜15へ変異","3分の1で777","自分の数字+1","自分-1、敵+2","赤いカード+33","同じスートなら+70","敵の数字の2倍を吸収","自分2倍、敵半分","Aだけ1、他は3倍","劣勢カード+20","総得点劣勢なら+50","負けなら引き分け","両者の数字を平均化","敵を自分と同値にする","総得点劣勢なら100","同点なら+77","負けを勝ちに変える","Aなら100（通常のAは14）","3差以内の敗北を+7で逆転","初戦+77","7差以内の敗北を逆転","第7戦で777","常に敵より強くするか+1","偶数戦+50、奇数戦-5","ラウンド×7を加算","7のカードを777、それ以外+7","3戦ごとに333","敗北は0、勝てるなら+40","過去のラウンド数×11","最終戦777、それ以外ラウンド数を加算"];
function battlePower(joker,player,enemy,ctx={}){const p=player?.r===1?14:(player?.r||0),e=enemy?.r===1?14:(enemy?.r||0);if(!joker)return {player:p,enemy:e,note:''};const round=ctx.round||1;let a=p,b=e;switch(joker.id){
case 'J01':a=p*2;break;
case 'J02':a=p*3;b=e+3;break;
case 'J03':a=p+round*4;break;
case 'J04':a=p+30;b=e+15;break;
case 'J05':if(p<e)a=e+20;break;
case 'J06':a=p*4-round*2;break;
case 'J07':a=round===10?777:p-3;break;
case 'J08':a=15-p;b=15-e;break;
case 'J09':a=e;b=p;break;
case 'J10':a=e+1;break;
case 'J11':if(p===e)a=p+22;break;
case 'J12':a=15-e;b=15-p;break;
case 'J13':if(player.si===enemy.si)a+=33;break;
case 'J14':a=p+e;break;
case 'J15':a=round<=3?p+25:p;break;
case 'J16':a=round>=7?p+40:p;break;
case 'J17':b=round%2===0?0:e;break;
case 'J18':a=round===1?99:p;break;
case 'J19':a=round%3===0?p+50:p;break;
case 'J20':a=round===(ctx.totalRounds||10)?999:p;break;
case 'J21':a=round===10?777:p;break;
case 'J22':a=p<e?e+2:p;break;
case 'J23':a=p+Math.max(0,14-e);break;
case 'J24':a=p+(14-(enemy.r||0))*3;break;
case 'J25':a=p+Math.abs(p-e)*2;break;
case 'J26':a=p+((e%2===0)?50:0);break;
case 'J27':a=p+(enemy.si===player.si?60:0);break;
case 'J28':a=p+(e>=11?77:0);break;
case 'J29':b=0;break;
case 'J30':b=Math.max(0,e-7);break;
case 'J31':a=p;b=e%2?0:e;break;
case 'J32':a=p;b=e===14?0:e;break;
case 'J33':b=round%2?e:0;break;
case 'J34':b=enemy.si===0?0:e;break;
case 'J35':b=e>10?0:e;break;
case 'J36':a=player.r===13?100:p;break;
case 'J37':a=player.r===13?0:p;b=enemy.r===13?0:e;break;
case 'J38':a=player.r>=11?p+35:p;break;
case 'J39':a=p<e?e+5:p;break;
case 'J40':a=p===e?p+50:p;break;
case 'J41':a=player.r===7?777:p;break;
case 'J42':a=p+((player.r>=11)?77:0);break;
case 'J43':a=p+(hash(joker.id+'|'+round)%31);break;
case 'J44':b=e+(hash(joker.id+'|'+round)%21);break;
case 'J45':a=p+(hash(joker.id+'|'+round)%2?70:-7);break;
case 'J46':a=hash(joker.id+'|'+round)%2?999:0;break;
case 'J47':a=p+(round*17)%60;break;
case 'J48':a=(hash(joker.id+'|'+round)%15)+1;break;
case 'J49':a=hash(joker.id+'|'+round)%3===0?777:p;break;
case 'J50':a=p+1;break;
case 'J51':a=Math.max(0,p-1);b=e+2;break;
case 'J52':a=player.si===1||player.si===2?p+33:p;break;
case 'J53':a=p+(player.si===enemy.si?70:0);break;
case 'J54':a=p+e*2;break;
case 'J55':a=p*2;b=Math.floor(e/2);break;
case 'J56':a=p===14?1:p*3;break;
case 'J57':a=p<e?p+20:p;break;
case 'J58':a=ctx.behind?p+50:p;break;
case 'J59':a=p<e?e:p;break;
case 'J60':a=Math.ceil((p+e)/2);b=a;break;
case 'J61':a=p;b=p;break;
case 'J62':a=ctx.behind?100:p;break;
case 'J63':a=p===e?p+77:p;break;
case 'J64':if(p<e)a=e+1;break;
case 'J65':a=player.r===1?100:p;break;
case 'J66':a=p<e&&e-p<=3?e+7:p;break;
case 'J67':a=round===1?p+77:p;break;
case 'J68':a=p<e&&e-p<=7?e+1:p;break;
case 'J69':a=round===7?777:p;break;
case 'J70':a=p<e?e+1:p+1;break;
case 'J71':a=round%2===0?p+50:p-5;break;
case 'J72':a=p+round*7;break;
case 'J73':a=player.r===7?777:p+7;break;
case 'J74':a=round%3===0?333:p;break;
case 'J75':a=p<e?0:p+40;break;
case 'J76':a=round>1?p+(round-1)*11:p;break;
case 'J77':a=round===10?777:p+round;break;
}return {player:Math.max(0,Math.floor(a)),enemy:Math.max(0,Math.floor(b)),note:battleDescription(joker)}}
function battleDescription(joker){if(!joker)return '通常ルール';const index=Number(joker.id.slice(1))-1;return Number.isInteger(index)&&index>=0&&index<77?'WAR：'+battleRules[index]:'WAR：未対応'}
function abilityDescription(joker,game){if(!joker)return '';const type=joker.effect.type;if(game==='war')return battleDescription(joker);if(game==='high-low'){switch(type){case 'peekNext':return '次に引くカードを常時公開';case 'reverseRank':return 'HIGHとLOWの正解判定を反転';case 'eraseMistake':case 'reviveOnce':case 'shieldMistake':return '1対局に1回、予想失敗時の失点を無効化';default:return '個別得点効果が適用される';}}return '個別得点効果が適用される'}
function targetPower(joker,player,dealer,limit,ctx={}){if(!joker)return {player,dealer,note:''};const round=ctx.round||1,t=joker.effect.tier;let a=player,b=dealer,note='';switch(joker.family){
case 'berserk':a+=t*2;note='自分の合計を強化';break;
case 'mirror':a=limit-a;note='自分の合計を反転';break;
case 'time':if(round<=3)a+=t*3;note='序盤の合計を強化';break;
case 'vision':if(Math.abs(a-b)<=t*2)a+=t*2;note='接戦を先読み';break;
case 'void':b=Math.max(0,b-t*2);note='敵の合計を削る';break;
case 'royal':if(a>=limit-5)a=limit;note='目標値へ戴冠';break;
case 'chaos':a+=(hash(joker.id+'|'+round+'|'+a)%(t*4+1));note='乱数で合計を変える';break;
case 'mutation':a+=t;note='合計を進化';break;
case 'balance':if(ctx.behind)a+=t*3;note='劣勢で強化';break;
case 'miracle':if(a>limit&&a-limit<=t*2)a=limit;note='バーストを救済';break;
case 'causality':if(round===5)a=limit;note='最終戦で目標値に収束';break;
}return {player:a,dealer:b,note}}
const api=Object.freeze({catalog,families,localDate,daily,get,validateEquip,resolve,equipped,applyScore,battlePower,battleDescription,abilityDescription,targetPower});if(typeof module!=='undefined'&&module.exports)module.exports=api;root.FiftyTwoJokers=api;
})(typeof window!=='undefined'?window:globalThis);
