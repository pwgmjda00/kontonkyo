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
 const players=decks.map((deck,i)=>({hp:60,maxHp:60,block:0,energy:4,fate:0,hand:[],deck:shuffle(deck.map(c=>({...c,uid:++serial})),random),discard:[],seat:i,job:deck[0]?.job||'ruin',skillUsed:false,skillDebt:0,extraDrawNext:0,cardsPlayed:0,attacksPlayed:0,relicFlags:{}}));
 const state={version:2,players,active:0,turn:1,over:false,winner:null,log:[],seed:options.seed??1,relics:[[],[]],relicOffer:null};
 draw(players[0],5,random);draw(players[1],5,random);
 return {state,random,getRngState:()=>rngState,setRngState:v=>{rngState=v>>>0}};
}
function draw(p,n,random){for(let i=0;i<n;i++){if(p.hand.length>=12)break;if(!p.deck.length)p.deck=shuffle(p.discard.splice(0),random);if(!p.deck.length)break;p.hand.push(p.deck.pop())}}
const RELICS=[
 {id:'blade',name:'刃の誓い',desc:'最初の攻撃カードに+3ダメージ',effect:'firstHit',value:3},
 {id:'shield',name:'石工の印',desc:'ターン開始時防御+3',effect:'startBlock',value:3},
 {id:'heart',name:'小さな太陽',desc:'ターン開始時HP+2',effect:'startHeal',value:2},
 {id:'battery',name:'余剰電池',desc:'偶数ターン開始時エナジー+1',effect:'evenEnergy',value:1},
 {id:'fate',name:'因果時計',desc:'ターン開始時因果+1',effect:'startFate',value:1},
 {id:'thorn',name:'返し針',desc:'相手の攻撃を受けたとき1反撃',effect:'retaliate',value:1},
 {id:'draw',name:'余白の頁',desc:'3ターンごとに追加で1枚引く',effect:'thirdDraw',value:1},
 {id:'armor',name:'甲冑師の手',desc:'最初の防御獲得に+4',effect:'firstBlock',value:4},
 {id:'spark',name:'火種',desc:'ターン最初の攻撃に+2',effect:'firstHit',value:2},
 {id:'anchor',name:'錨',desc:'防御が0なら開始時防御+4',effect:'emptyBlock',value:4},
 {id:'pulse',name:'鼓動',desc:'HP30以下なら開始時HP+2',effect:'lowHeal',value:2},
 {id:'sprint',name:'短距離走',desc:'3ターンごとにエナジー+1',effect:'thirdEnergy',value:1},
 {id:'memory',name:'記憶片',desc:'因果0なら開始時因果+2',effect:'emptyFate',value:2},
 {id:'prism',name:'万華鏡',desc:'手札2枚以下でターン終了すると次の開始時1枚追加',effect:'lowHandDraw',value:1},
 {id:'ember',name:'残り火',desc:'攻撃カード2枚目に+3',effect:'secondHit',value:3},
 {id:'wall',name:'背水の壁',desc:'HP30以下なら開始時防御+5',effect:'lowBlock',value:5},
 {id:'seed',name:'再生の種',desc:'3ターンごとにHP+4',effect:'thirdHeal',value:4},
 {id:'coin',name:'片面硬貨',desc:'奇数ターン開始時因果+1',effect:'oddFate',value:1},
 {id:'telescope',name:'望遠鏡',desc:'奇数ターン開始時1枚追加ドロー',effect:'oddDraw',value:1},
 {id:'chime',name:'鐘',desc:'ターン最初のカードで因果+1',effect:'firstCardFate',value:1},
 {id:'spike',name:'鉄棘',desc:'攻撃カード3枚目に+5',effect:'thirdHit',value:5},
 {id:'mirror',name:'曇った鏡',desc:'防御が10以上ならターン開始時HP+2',effect:'blockHeal',value:2},
 {id:'dawn',name:'夜明け',desc:'HP満タンなら開始時エナジー+1',effect:'fullEnergy',value:1},
 {id:'ashes',name:'灰の手',desc:'HP30以下なら最初の攻撃+4',effect:'lowHit',value:4},
 {id:'ink',name:'黒インク',desc:'最初のドロー系カード使用時因果+1',effect:'drawFate',value:1},
 {id:'clover',name:'四葉',desc:'因果4以上なら開始時防御+3',effect:'fateBlock',value:3},
 {id:'moon',name:'月の針',desc:'偶数ターン開始時1枚追加ドロー',effect:'evenDraw',value:1},
 {id:'veil',name:'薄衣',desc:'ターン最初の自傷を1軽減',effect:'selfGuard',value:1},
 {id:'soul',name:'魂の紐',desc:'自傷したカードで因果+1',effect:'selfFate',value:1},
 {id:'saw',name:'鋸',desc:'相手に防御があるとき最初の攻撃+3',effect:'blockHit',value:3},
 {id:'lily',name:'白百合',desc:'HP20以下なら開始時HP+4',effect:'criticalHeal',value:4},
 {id:'storm',name:'嵐の瓶',desc:'4ターンごとにエナジー+1',effect:'fourthEnergy',value:1},
 {id:'hourglass',name:'砂時計',desc:'4ターンごとに因果+3',effect:'fourthFate',value:3},
 {id:'shell',name:'貝殻',desc:'手札が3枚以下なら開始時防御+4',effect:'fewHandBlock',value:4},
 {id:'needle',name:'針仕事',desc:'最初の防御カードで因果+1',effect:'blockFate',value:1},
 {id:'glass',name:'ガラス靴',desc:'最初のコスト0カードで防御+3',effect:'zeroBlock',value:3},
 {id:'magnet',name:'磁石',desc:'最初のコスト2以上カードで因果+1',effect:'expensiveFate',value:1},
 {id:'root',name:'根',desc:'防御が残った状態でターン終了するとHP+2',effect:'endBlockHeal',value:2},
 {id:'book',name:'書架',desc:'ターン開始時山札0なら因果+2',effect:'emptyDeckFate',value:2},
 {id:'sail',name:'帆',desc:'開始時エナジーが4未満なら+1',effect:'lowEnergy',value:1},
 {id:'chain',name:'鎖',desc:'最初の攻撃カードで相手の防御を2削る',effect:'breakBlock',value:2},
 {id:'snow',name:'雪片',desc:'開始時HPが相手より低いなら防御+4',effect:'behindBlock',value:4},
 {id:'candle',name:'蝋燭',desc:'開始時HPが相手より低いなら因果+2',effect:'behindFate',value:2},
 {id:'map',name:'地図',desc:'手札が4枚未満なら開始時1枚引く',effect:'fewHandDraw',value:1},
 {id:'drum',name:'太鼓',desc:'カード3枚使用時エナジー+1（毎ターン1回）',effect:'thirdCardEnergy',value:1},
 {id:'echo',name:'反響',desc:'カード2枚使用時因果+1（毎ターン1回）',effect:'secondCardFate',value:1},
 {id:'ribbon',name:'赤い糸',desc:'回復カードを使ったとき防御+3（毎ターン1回）',effect:'healBlock',value:3},
 {id:'crown',name:'紙の王冠',desc:'ターン開始時HPが相手以上なら因果+1',effect:'aheadFate',value:1},
 {id:'compass',name:'方位磁針',desc:'最初のスキル使用後防御+3',effect:'skillBlock',value:3},
 {id:'feather',name:'軽い羽',desc:'最初の因果変換後HP+2',effect:'fateHeal',value:2}
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
 if(action?.type==='fate'){
 const cost={energy:2,draw:3,guard:4}[action.mode];
 if(!cost||a.fate<cost)return {ok:false,reason:'fate'};
 a.fate-=cost;for(const id of s.relics[seat]){const r=RELICS.find(x=>x.id===id);if(r?.effect==='fateHeal'&&!a.relicFlags.fateHeal){a.hp=Math.min(a.maxHp,a.hp+r.value);a.relicFlags.fateHeal=true}}if(action.mode==='energy')a.energy++;if(action.mode==='draw')draw(a,1,match.random);if(action.mode==='guard')a.block+=7;
 if(a.job==='ruin'&&action.mode==='energy')core.damage(b,2);
 if(a.job==='guard'&&action.mode==='guard')a.block+=3;
 if(a.job==='fate'&&action.mode==='draw')a.fate+=1;
 if(a.job==='blood'&&action.mode==='energy')a.hp=Math.min(a.maxHp,a.hp+2);
 if(b.hp<=0){s.over=true;s.winner=seat}
 s.log.push({turn:s.turn,seat,type:'fate',name:action.mode==='energy'?'因果転換：エナジー+1':action.mode==='draw'?'因果観測：1枚引く':'因果結界：防御+7'});
 return {ok:true,state:s};
 }
 if(action?.type==='skill'){
 if(a.energy<2||a.skillUsed)return {ok:false,reason:'skill_unavailable'};
 a.energy-=2;a.skillUsed=true;for(const id of s.relics[seat]){const r=RELICS.find(x=>x.id===id);if(r?.effect==='skillBlock')a.block+=r.value}
 const job=a.job;
 if(job==='ruin'){b.block=Math.max(0,b.block-2);core.damage(b,4)}
 else if(job==='guard'){a.block+=6;if(a.hp<=a.maxHp/2)a.hp=Math.min(a.maxHp,a.hp+2)}
 else if(job==='fate'){a.fate=Math.min(12,a.fate+2);if(a.fate>=4)draw(a,1,match.random)}
 else if(job==='blood'){a.hp-=3;a.energy+=3;a.skillDebt=1}
 else return {ok:false,reason:'invalid_job'};
 s.log.push({turn:s.turn,seat,type:'skill',name:job==='ruin'?'破滅：4ダメージ＋防御2削り':job==='guard'?'守護：防御6＋瀕死時回復2':job==='fate'?'因果：因果2＋条件ドロー':'血盟：HP-3、エナジー+3、次ターン-1'});
 if(a.hp<=0||b.hp<=0){s.over=true;s.winner=a.hp<=0?1-seat:seat}
 return {ok:true,state:s};
 }
 const verdict=core.validateAction({over:s.over,player:a},action);
 if(!verdict.ok)return verdict;
 if(action.type==='play'){
  const idx=a.hand.findIndex(c=>c.uid===action.uid),card=a.hand[idx];
  if(typeof card.act!=='function')return {ok:false,reason:'missing_effect'};
  const savedPlayers=s.players.map(p=>({...p,hand:p.hand.slice(),deck:p.deck.slice(),discard:p.discard.slice()}));
  const savedRng=match.getRngState();
  
  const owned=s.relics[seat].map(id=>RELICS.find(r=>r.id===id)).filter(Boolean);
  const bonus=(effect,condition=true)=>owned.filter(r=>r.effect===effect&&condition).reduce((n,r)=>n+r.value,0);
  const ctx={hit:(target,n)=>core.damage(target,n+(target===b?bonus('firstHit',a.attacksPlayed===0)+bonus('secondHit',a.attacksPlayed===1)+bonus('thirdHit',a.attacksPlayed===2)+bonus('lowHit',a.hp<=30&&a.attacksPlayed===0)+bonus('blockHit',b.block>0&&a.attacksPlayed===0):0)),draw:(p,n)=>draw(p,n,match.random),random:match.random,
   get intent(){return {kind:'none',value:0,name:'対人戦',desc:'相手の手番'}},
   set intent(_v){}};
  const before={hp:a.hp,block:a.block,energy:a.energy,fate:a.fate,enemyHp:b.hp,enemyBlock:b.block};
  try{const outcome=rules.playCard(a,b,action.uid,ctx);if(!outcome.ok)return outcome}catch(_err){s.players=savedPlayers;match.setRngState(savedRng);return {ok:false,reason:'effect_failed'}}
  if(card.desc.includes('ダメージ')||card.desc.includes('敵に'))a.attacksPlayed++;
  a.cardsPlayed++;
  if(a.block>before.block)a.block+=bonus('firstBlock',a.cardsPlayed===1);
  if(a.cardsPlayed===1)a.fate+=bonus('firstCardFate')+bonus('expensiveFate',card.cost>=2);
  if(a.cardsPlayed===2)a.fate+=bonus('secondCardFate');
  if(a.cardsPlayed===3)a.energy+=bonus('thirdCardEnergy');
  if(card.cost===0&&a.cardsPlayed===1)a.block+=bonus('zeroBlock');
  if(a.hp<before.hp){a.fate+=bonus('selfFate');if(a.cardsPlayed===1)a.hp=Math.min(a.maxHp,a.hp+bonus('selfGuard'))}
  if(a.hp>before.hp)a.block+=bonus('healBlock');
  if(card.desc.includes('引く')&&a.cardsPlayed===1)a.fate+=bonus('drawFate');
  if(a.block>before.block)a.fate+=bonus('blockFate',a.cardsPlayed===1);
  if(before.enemyBlock>0&&a.attacksPlayed===1)b.block=Math.max(0,b.block-bonus('breakBlock'));
  if(a.hp<=0||b.hp<=0){s.over=true;s.winner=a.hp<=0&&b.hp<=0?null:a.hp<=0?1-seat:seat}
  s.log.push({turn:s.turn,seat,type:'play',cardId:card.id,name:card.name,damage:Math.max(0,before.enemyHp-b.hp),healing:Math.max(0,a.hp-before.hp),selfDamage:Math.max(0,before.hp-a.hp),block:Math.max(0,a.block-before.block),energy:a.energy-before.energy, fate:a.fate-before.fate});
 }else if(action.type==='fate'){
  const outcome=rules.spendFate(a,b);if(!outcome.ok)return outcome;s.log.push({turn:s.turn,seat,type:'fate',damage:0,name:'因果断絶'});
 }else if(action.type==='end_turn'){
  if(a.hand.length<=2&&s.relics[seat].includes('prism'))a.extraDrawNext=1;
  if(a.block>0){for(const id of s.relics[seat]){const r=RELICS.find(x=>x.id===id);if(r?.effect==='endBlockHeal')a.hp=Math.min(a.maxHp,a.hp+r.value)}}
  a.discard.push(...a.hand.splice(0));s.active=1-seat;
  b.block=0;b.energy=Math.max(1,4-b.skillDebt);b.skillDebt=0;b.skillUsed=false;b.cardsPlayed=0;b.attacksPlayed=0;b.relicFlags={};draw(b,5+b.extraDrawNext,match.random);b.extraDrawNext=0;
  s.log.push({turn:s.turn,seat,type:'end_turn'});s.turn++;
  for(const id of s.relics[s.active]){const r=RELICS.find(x=>x.id===id);if(!r)continue;const e=r.effect,n=r.value;
   if(e==='startBlock'||e==='emptyBlock'&&b.block===0||e==='lowBlock'&&b.hp<=30||e==='fateBlock'&&b.fate>=4||e==='fewHandBlock'&&b.hand.length<=3||e==='behindBlock'&&b.hp<a.hp)b.block+=n;
   if(e==='startHeal'||e==='lowHeal'&&b.hp<=30||e==='criticalHeal'&&b.hp<=20||e==='blockHeal'&&b.block>=10||e==='thirdHeal'&&s.turn%3===0)b.hp=Math.min(b.maxHp,b.hp+n);
   if(e==='startFate'||e==='emptyFate'&&b.fate===0||e==='oddFate'&&s.turn%2===1||e==='fourthFate'&&s.turn%4===0||e==='emptyDeckFate'&&b.deck.length===0||e==='behindFate'&&b.hp<a.hp||e==='aheadFate'&&b.hp>=a.hp)b.fate+=n;
   if(e==='evenEnergy'&&s.turn%2===0||e==='thirdEnergy'&&s.turn%3===0||e==='fourthEnergy'&&s.turn%4===0||e==='fullEnergy'&&b.hp===b.maxHp||e==='lowEnergy'&&b.energy<4)b.energy+=n;
   if(e==='thirdDraw'&&s.turn%3===0||e==='oddDraw'&&s.turn%2===1||e==='evenDraw'&&s.turn%2===0||e==='fewHandDraw'&&b.hand.length<4)draw(b,n,match.random);
  }
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
 const redact=p=>({job:p.job,skillUsed:p.skillUsed,hp:p.hp,maxHp:p.maxHp,block:p.block,energy:p.energy,fate:p.fate,handCount:p.hand.length,deckCount:p.deck.length,discardCount:p.discard.length});
 return {version:s.version,turn:s.turn,active:s.active,over:s.over,winner:s.winner,player:{...redact(own),hand:own.hand.map(c=>({id:c.id,uid:c.uid,name:c.name,cost:c.cost,desc:c.desc}))},opponent:redact(other),log:s.log.slice(-30),relics:s.relics.map(ids=>ids.map(id=>RELICS.find(r=>r.id===id))),relicOffer:s.relicOffer&&s.relicOffer.seat===seat?s.relicOffer.choices.map(id=>RELICS.find(r=>r.id===id)):null,relicPending:!!s.relicOffer};
}
root.IngaDuel=Object.freeze({createMatch,apply,publicView});
})(typeof globalThis!=='undefined'?globalThis:this);
