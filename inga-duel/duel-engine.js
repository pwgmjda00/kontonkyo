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
 const players=decks.map((deck,i)=>({hp:60,maxHp:60,block:0,energy:4,fate:0,hand:[],deck:shuffle(deck.map(c=>({...c,uid:++serial})),random),discard:[],seat:i,job:deck[0]?.job||'ruin',skillUsed:false}));
 const state={version:2,players,active:0,turn:1,over:false,winner:null,log:[],seed:options.seed??1,relics:[[],[]],relicOffer:null};
 draw(players[0],5,random);draw(players[1],5,random);
 return {state,random,getRngState:()=>rngState,setRngState:v=>{rngState=v>>>0}};
}
function draw(p,n,random){for(let i=0;i<n;i++){if(p.hand.length>=12)break;if(!p.deck.length)p.deck=shuffle(p.discard.splice(0),random);if(!p.deck.length)break;p.hand.push(p.deck.pop())}}
const RELICS=[
 {id:'blade',name:'研ぎ澄まし',desc:'カード攻撃+1'},
 {id:'shield',name:'星の守護',desc:'ターン開始時防御+2'},
 {id:'heart',name:'不死の灯',desc:'ターン開始時HP+1'},
 {id:'battery',name:'過剰動力',desc:'ターン開始時エナジー+1'},
 {id:'fate',name:'因果の歯車',desc:'ターン開始時因果+1'},
 {id:'thorn',name:'反撃の棘',desc:'ターン開始時敵に1ダメージ'},
 {id:'draw',name:'知識の泉',desc:'ターン開始時1枚引く'},
 {id:'armor',name:'永遠の鎧',desc:'カード防御+1'},
 {id:'guard8',name:'黎明の羽根2',desc:'ターン開始時防御+1'},
 {id:'heal9',name:'黄昏の羽根2',desc:'ターン開始時HP+1'},
 {id:'focus10',name:'蒼穹の羽根2',desc:'ターン開始時エナジー+1（2ターンに1回）'},
 {id:'draw11',name:'白夜の羽根2',desc:'3ターンに1回追加で1枚引く'},
 {id:'fate12',name:'残響の羽根2',desc:'ターン開始時因果+1'},
 {id:'tempo13',name:'虚空の羽根2',desc:'ターン開始時敵に1ダメージ'},
 {id:'strike14',name:'黒曜の歯車3',desc:'攻撃カードのダメージ+1（重複可）'},
 {id:'guard15',name:'黎明の歯車3',desc:'ターン開始時防御+1'},
 {id:'heal16',name:'黄昏の歯車3',desc:'ターン開始時HP+1'},
 {id:'focus17',name:'蒼穹の歯車3',desc:'ターン開始時エナジー+1（2ターンに1回）'},
 {id:'draw18',name:'白夜の歯車3',desc:'3ターンに1回追加で1枚引く'},
 {id:'fate19',name:'残響の歯車3',desc:'ターン開始時因果+1'},
 {id:'tempo20',name:'虚空の歯車3',desc:'ターン開始時敵に1ダメージ'},
 {id:'strike21',name:'黒曜の紋章4',desc:'攻撃カードのダメージ+1（重複可）'},
 {id:'guard22',name:'黎明の紋章4',desc:'ターン開始時防御+1'},
 {id:'heal23',name:'黄昏の紋章4',desc:'ターン開始時HP+1'},
 {id:'focus24',name:'蒼穹の紋章4',desc:'ターン開始時エナジー+1（2ターンに1回）'},
 {id:'draw25',name:'白夜の紋章4',desc:'3ターンに1回追加で1枚引く'},
 {id:'fate26',name:'残響の紋章4',desc:'ターン開始時因果+1'},
 {id:'tempo27',name:'虚空の紋章4',desc:'ターン開始時敵に1ダメージ'},
 {id:'strike28',name:'黒曜の鍵5',desc:'攻撃カードのダメージ+1（重複可）'},
 {id:'guard29',name:'黎明の鍵5',desc:'ターン開始時防御+1'},
 {id:'heal30',name:'黄昏の鍵5',desc:'ターン開始時HP+1'},
 {id:'focus31',name:'蒼穹の鍵5',desc:'ターン開始時エナジー+1（2ターンに1回）'},
 {id:'draw32',name:'白夜の鍵5',desc:'3ターンに1回追加で1枚引く'},
 {id:'fate33',name:'残響の鍵5',desc:'ターン開始時因果+1'},
 {id:'tempo34',name:'虚空の鍵5',desc:'ターン開始時敵に1ダメージ'},
 {id:'strike35',name:'黒曜の欠片6',desc:'攻撃カードのダメージ+1（重複可）'},
 {id:'guard36',name:'黎明の欠片6',desc:'ターン開始時防御+1'},
 {id:'heal37',name:'黄昏の欠片6',desc:'ターン開始時HP+1'},
 {id:'focus38',name:'蒼穹の欠片6',desc:'ターン開始時エナジー+1（2ターンに1回）'},
 {id:'draw39',name:'白夜の欠片6',desc:'3ターンに1回追加で1枚引く'},
 {id:'fate40',name:'残響の欠片6',desc:'ターン開始時因果+1'},
 {id:'tempo41',name:'虚空の欠片6',desc:'ターン開始時敵に1ダメージ'},
 {id:'strike42',name:'黒曜の指輪7',desc:'攻撃カードのダメージ+1（重複可）'},
 {id:'guard43',name:'黎明の指輪7',desc:'ターン開始時防御+1'},
 {id:'heal44',name:'黄昏の指輪7',desc:'ターン開始時HP+1'},
 {id:'focus45',name:'蒼穹の指輪7',desc:'ターン開始時エナジー+1（2ターンに1回）'},
 {id:'draw46',name:'白夜の指輪7',desc:'3ターンに1回追加で1枚引く'},
 {id:'fate47',name:'残響の指輪7',desc:'ターン開始時因果+1'},
 {id:'tempo48',name:'虚空の指輪7',desc:'ターン開始時敵に1ダメージ'},
 {id:'strike49',name:'黒曜の羽根8',desc:'攻撃カードのダメージ+1（重複可）'}
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
 a.fate-=cost;if(action.mode==='energy')a.energy++;if(action.mode==='draw')draw(a,1,match.random);if(action.mode==='guard')a.block+=7;
 s.log.push({turn:s.turn,seat,type:'fate',name:action.mode==='energy'?'因果転換：エナジー+1':action.mode==='draw'?'因果観測：1枚引く':'因果結界：防御+7'});
 return {ok:true,state:s};
 }
 if(action?.type==='skill'){
 if(a.energy<1||a.skillUsed)return {ok:false,reason:'skill_unavailable'};
 a.energy--;a.skillUsed=true;
 const job=a.job;
 if(job==='ruin')core.damage(b,5);
 else if(job==='guard')a.block+=7;
 else if(job==='fate'){a.fate=Math.min(12,a.fate+2)}
 else if(job==='blood'){a.hp-=2;a.energy+=2}
 else return {ok:false,reason:'invalid_job'};
 s.log.push({turn:s.turn,seat,type:'skill',name:job==='ruin'?'破滅：追撃5':job==='guard'?'守護：防御+7':job==='fate'?'因果：因果+2':'血盟：HP-2、エナジー+2'});
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
  
  const ctx={hit:(target,n)=>core.damage(target,n+(target===b?(s.relics[seat].includes('blade')?1:0)+s.relics[seat].filter(id=>id.startsWith('strike')).length:0)),draw:(p,n)=>draw(p,n,match.random),random:match.random,
   get intent(){return {kind:'none',value:0,name:'対人戦',desc:'相手の手番'}},
   set intent(_v){/* PvP has no telegraphed CPU action */}};
  const before={hp:a.hp,block:a.block,energy:a.energy,fate:a.fate,enemyHp:b.hp,enemyBlock:b.block};
  try{const outcome=rules.playCard(a,b,action.uid,ctx);if(!outcome.ok)return outcome}catch(_err){s.players=savedPlayers;match.setRngState(savedRng);return {ok:false,reason:'effect_failed'}}
  if(s.relics[seat].includes('armor')&&a.block>before.block)a.block+=1;
  s.log.push({turn:s.turn,seat,type:'play',cardId:card.id,name:card.name,damage:Math.max(0,before.enemyHp-b.hp),healing:Math.max(0,a.hp-before.hp),selfDamage:Math.max(0,before.hp-a.hp),block:Math.max(0,a.block-before.block),energy:a.energy-before.energy, fate:a.fate-before.fate});
 }else if(action.type==='fate'){
  const outcome=rules.spendFate(a,b);if(!outcome.ok)return outcome;s.log.push({turn:s.turn,seat,type:'fate',damage:0,name:'因果断絶'});
 }else if(action.type==='end_turn'){
  a.discard.push(...a.hand.splice(0));s.active=1-seat;
  b.block=0;b.energy=4;b.skillUsed=false;draw(b,5,match.random);
  s.log.push({turn:s.turn,seat,type:'end_turn'});s.turn++;
  if(s.relics[s.active].includes('shield'))b.block+=2;
  if(s.relics[s.active].includes('heart'))b.hp=Math.min(b.maxHp,b.hp+1);
  if(s.relics[s.active].includes('battery'))b.energy++;
  if(s.relics[s.active].includes('fate'))b.fate+=1;
  if(s.relics[s.active].includes('draw'))draw(b,1,match.random);
  if(s.relics[s.active].includes('thorn'))core.damage(a,1);
 for(const id of s.relics[s.active]){const m=/^(strike|guard|heal|focus|draw|fate|tempo)(\\d+)$/.exec(id);if(!m)continue;
 if(m[1]==='guard')b.block++;if(m[1]==='heal')b.hp=Math.min(b.maxHp,b.hp+1);
 if(m[1]==='focus'&&s.turn%2===0)b.energy++;
 if(m[1]==='draw'&&s.turn%3===0)draw(b,1,match.random);
 if(m[1]==='fate')b.fate++;if(m[1]==='tempo')core.damage(a,1);
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
