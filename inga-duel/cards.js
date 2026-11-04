'use strict';
/* Card effects receive an explicit battle context; no direct battle globals. */
const cards=[
['裂界',1,'敵に7ダメージ。', (a,b,ctx)=>ctx.hit(b,7)],
['処刑宣告',3,'敵に17ダメージ。敵HPが半分以下なら24。',(a,b,ctx)=>ctx.hit(b,b.hp<=20?24:17)],
['絶対障壁',2,'防御14。',(a,b,ctx)=>a.block+=14],
['反逆',2,'防御8。敵に8ダメージ。',(a,b,ctx)=>{a.block+=8;ctx.hit(b,8)}],
['代償契約',0,'HPを5失い、エネルギー+3、因果+2。',(a,b,ctx)=>{a.hp-=5;a.energy+=3;a.fate+=2}],
['略奪',1,'敵に5ダメージ。2枚引く。',(a,b,ctx)=>{ctx.hit(b,5);ctx.draw(a,2)}],
['鏡面',2,'敵の予告攻撃を反射し、その攻撃を無効化。',(a,b,ctx)=>{if(ctx.intent.kind==='attack'||ctx.intent.kind==='burst'){ctx.hit(b,ctx.intent.value);ctx.intent={kind:'none',name:'攻撃を反射された',desc:'敵は行動できない'};}else a.block+=8}],
['時間停止',3,'敵の予告行動をキャンセル。因果+2。',(a,b,ctx)=>{ctx.intent={kind:'none',name:'時間停止',desc:'敵は行動できない'};a.fate+=2}],
['予言破り',2,'敵に9ダメージ。予告が攻撃ならさらに9。',(a,b,ctx)=>ctx.hit(b,(ctx.intent.kind==='attack'||ctx.intent.kind==='burst')?18:9)],
['血の祭壇',1,'HPを4失い、敵に16ダメージ。',(a,b,ctx)=>{a.hp-=4;ctx.hit(b,16)}],
['崩壊',3,'敵に22ダメージ。自分の防御を0にする。',(a,b,ctx)=>{a.block=0;ctx.hit(b,22)}],
['神経接続',1,'因果+3。1枚引く。',(a,b,ctx)=>{a.fate+=3;ctx.draw(a,1)}],
['量子跳躍',2,'手札をすべて捨て、4枚引く。エネルギー+1。',(a,b,ctx)=>{a.discard.push(...a.hand.splice(0));ctx.draw(a,4);a.energy++}],
['二重螺旋',2,'敵に6ダメージを3回。',(a,b,ctx)=>{for(let i=0;i<3;i++)ctx.hit(b,6)}],
['断罪',4,'敵に28ダメージ。自分も6ダメージ。',(a,b,ctx)=>{ctx.hit(b,28);a.hp-=6}],
['再起動',2,'HPを12回復。因果+1。',(a,b,ctx)=>{a.hp=Math.min(a.maxHp,a.hp+12);a.fate++}],
['天秤',1,'HPが敵より低ければ敵に14ダメージ、そうでなければ防御12。',(a,b,ctx)=>{if(a.hp<b.hp)ctx.hit(b,14);else a.block+=12}],
['過剰演算',0,'エネルギー+2。敵に4ダメージ。',(a,b,ctx)=>{a.energy+=2;ctx.hit(b,4)}],
['破城・砕牙',2,'敵に10ダメージ。防御を先に5削る。',(a,b,ctx)=>{b.block=Math.max(0,b.block-5);ctx.hit(b,10);}],
['破城・天穿',2,'敵に12ダメージ。因果+1。',(a,b,ctx)=>{ctx.hit(b,12);a.fate++;}],
['破城・鉄雨',2,'敵に14ダメージ。HPを2回復。',(a,b,ctx)=>{ctx.hit(b,14);a.hp=Math.min(40,a.hp+2);}],
['破城・烈風',2,'敵に16ダメージ。防御を先に5削る。',(a,b,ctx)=>{b.block=Math.max(0,b.block-5);ctx.hit(b,16);}],
['破城・雷槍',2,'敵に18ダメージ。因果+1。',(a,b,ctx)=>{ctx.hit(b,18);a.fate++;}],
['破城・焔斬',2,'敵に20ダメージ。HPを2回復。',(a,b,ctx)=>{ctx.hit(b,20);a.hp=Math.min(40,a.hp+2);}],
['破城・月蝕',2,'敵に22ダメージ。防御を先に5削る。',(a,b,ctx)=>{b.block=Math.max(0,b.block-5);ctx.hit(b,22);}],
['破城・星砕',2,'敵に24ダメージ。因果+1。',(a,b,ctx)=>{ctx.hit(b,24);a.fate++;}],
['破城・終焉',2,'敵に26ダメージ。HPを2回復。',(a,b,ctx)=>{ctx.hit(b,26);a.hp=Math.min(40,a.hp+2);}],
['守護・星盾',2,'防御8。因果+1。',(a,b,ctx)=>{a.block+=8;a.fate++;}],
['守護・逆鱗',2,'防御10。HPを3回復。',(a,b,ctx)=>{a.block+=10;a.hp=Math.min(40,a.hp+3);}],
['守護・金剛',2,'防御12。敵に4ダメージ。',(a,b,ctx)=>{a.block+=12;ctx.hit(b,4);}],
['守護・白夜',2,'防御14。因果+1。',(a,b,ctx)=>{a.block+=14;a.fate++;}],
['守護・玄武',2,'防御16。HPを3回復。',(a,b,ctx)=>{a.block+=16;a.hp=Math.min(40,a.hp+3);}],
['守護・虚壁',2,'防御18。敵に4ダメージ。',(a,b,ctx)=>{a.block+=18;ctx.hit(b,4);}],
['守護・不動',2,'防御20。因果+1。',(a,b,ctx)=>{a.block+=20;a.fate++;}],
['守護・天蓋',2,'防御22。HPを3回復。',(a,b,ctx)=>{a.block+=22;a.hp=Math.min(40,a.hp+3);}],
['守護・聖域',2,'防御24。敵に4ダメージ。',(a,b,ctx)=>{a.block+=24;ctx.hit(b,4);}],
['因果・追跡',1,'因果+1。1枚引く。',(a,b,ctx)=>{a.fate+=1;ctx.draw(a,1); }],
['因果・逸脱',1,'因果+2。敵に5ダメージ。',(a,b,ctx)=>{a.fate+=2;ctx.hit(b,5); }],
['因果・転写',1,'因果+3。エネルギー+1。',(a,b,ctx)=>{a.fate+=3;a.energy++; }],
['因果・予知',1,'因果+1。1枚引く。',(a,b,ctx)=>{a.fate+=1;ctx.draw(a,1); }],
['因果・束縛',1,'因果+2。敵に8ダメージ。',(a,b,ctx)=>{a.fate+=2;ctx.hit(b,8); }],
['因果・接続',1,'因果+3。エネルギー+1。',(a,b,ctx)=>{a.fate+=3;a.energy++; }],
['因果・分岐',1,'因果+1。1枚引く。',(a,b,ctx)=>{a.fate+=1;ctx.draw(a,1); }],
['因果・反証',1,'因果+2。敵に11ダメージ。',(a,b,ctx)=>{a.fate+=2;ctx.hit(b,11); }],
['因果・確定',1,'因果+3。エネルギー+1。',(a,b,ctx)=>{a.fate+=3;a.energy++; }],
['血盟・赤月',0,'HPを2失う。エネルギー+3。',(a,b,ctx)=>{a.hp-=2;a.energy+=3;}],
['血盟・痛覚',0,'HPを3失う。敵に12ダメージ。',(a,b,ctx)=>{a.hp-=3;ctx.hit(b,12);}],
['血盟・供物',0,'HPを4失う。因果+3、2枚引く。',(a,b,ctx)=>{a.hp-=4;a.fate+=3;ctx.draw(a,2);}],
['血盟・血霧',0,'HPを5失う。エネルギー+3。',(a,b,ctx)=>{a.hp-=5;a.energy+=3;}],
['血盟・献身',0,'HPを6失う。敵に18ダメージ。',(a,b,ctx)=>{a.hp-=6;ctx.hit(b,18);}],
['血盟・絶叫',0,'HPを7失う。因果+3、2枚引く。',(a,b,ctx)=>{a.hp-=7;a.fate+=3;ctx.draw(a,2);}],
['血盟・殉教',0,'HPを8失う。エネルギー+3。',(a,b,ctx)=>{a.hp-=8;a.energy+=3;}],
['血盟・黒涙',0,'HPを9失う。敵に24ダメージ。',(a,b,ctx)=>{a.hp-=9;ctx.hit(b,24);}],
['血盟・覚醒',0,'HPを10失う。因果+3、2枚引く。',(a,b,ctx)=>{a.hp-=10;a.fate+=3;ctx.draw(a,2);}],
['変則・零式',2,'敵の予告行動を消去。因果+1。',(a,b,ctx)=>{ctx.intent={kind:'none',name:'予告破棄',desc:'敵は行動できない'};a.fate+=1;}],
['変則・逆算',2,'敵の防御を0にし、9ダメージ。',(a,b,ctx)=>{b.block=0;ctx.hit(b,9);}],
['変則・因数',2,'敵の攻撃予告を反射。攻撃以外なら防御10。',(a,b,ctx)=>{if(ctx.intent.kind==='attack'||ctx.intent.kind==='burst'){ctx.hit(b,ctx.intent.value);ctx.intent={kind:'none',name:'反射済',desc:'敵は行動できない'}}else a.block+=10}],
['変則・無音',2,'敵の予告行動を消去。因果+2。',(a,b,ctx)=>{ctx.intent={kind:'none',name:'予告破棄',desc:'敵は行動できない'};a.fate+=2;}],
['変則・不在',2,'敵の防御を0にし、12ダメージ。',(a,b,ctx)=>{b.block=0;ctx.hit(b,12);}],
['変則・空白',2,'敵の攻撃予告を反射。攻撃以外なら防御13。',(a,b,ctx)=>{if(ctx.intent.kind==='attack'||ctx.intent.kind==='burst'){ctx.hit(b,ctx.intent.value);ctx.intent={kind:'none',name:'反射済',desc:'敵は行動できない'}}else a.block+=13}],
['変則・残像',2,'敵の予告行動を消去。因果+3。',(a,b,ctx)=>{ctx.intent={kind:'none',name:'予告破棄',desc:'敵は行動できない'};a.fate+=3;}],
['変則・無限',2,'敵の防御を0にし、15ダメージ。',(a,b,ctx)=>{b.block=0;ctx.hit(b,15);}],
['変則・矛盾',2,'敵の攻撃予告を反射。攻撃以外なら防御16。',(a,b,ctx)=>{if(ctx.intent.kind==='attack'||ctx.intent.kind==='burst'){ctx.hit(b,ctx.intent.value);ctx.intent={kind:'none',name:'反射済',desc:'敵は行動できない'}}else a.block+=16}],
['博打・丁半',1,'確率50%。成功なら18ダメージ、失敗なら2自傷。',(a,b,ctx)=>{if(ctx.random()<0.5)ctx.hit(b,18);else a.hp-=2}],
['博打・乱数',1,'確率65%。成功なら21ダメージ、失敗なら3自傷。',(a,b,ctx)=>{if(ctx.random()<0.65)ctx.hit(b,21);else a.hp-=3}],
['博打・大穴',1,'確率80%。成功なら24ダメージ、失敗なら4自傷。',(a,b,ctx)=>{if(ctx.random()<0.8)ctx.hit(b,24);else a.hp-=4}],
['博打・背水',1,'確率50%。成功なら27ダメージ、失敗なら5自傷。',(a,b,ctx)=>{if(ctx.random()<0.5)ctx.hit(b,27);else a.hp-=5}],
['博打・賽子',1,'確率65%。成功なら30ダメージ、失敗なら6自傷。',(a,b,ctx)=>{if(ctx.random()<0.65)ctx.hit(b,30);else a.hp-=6}],
['博打・奇跡',1,'確率80%。成功なら33ダメージ、失敗なら7自傷。',(a,b,ctx)=>{if(ctx.random()<0.8)ctx.hit(b,33);else a.hp-=7}],
['博打・混沌',1,'確率50%。成功なら36ダメージ、失敗なら8自傷。',(a,b,ctx)=>{if(ctx.random()<0.5)ctx.hit(b,36);else a.hp-=8}],
['博打・幸運',1,'確率65%。成功なら39ダメージ、失敗なら9自傷。',(a,b,ctx)=>{if(ctx.random()<0.65)ctx.hit(b,39);else a.hp-=9}],
['博打・破滅',1,'確率80%。成功なら42ダメージ、失敗なら10自傷。',(a,b,ctx)=>{if(ctx.random()<0.8)ctx.hit(b,42);else a.hp-=10}],
['連鎖・三叉',3,'敵に3ダメージを3回。',(a,b,ctx)=>{for(let j=0;j<3;j++)ctx.hit(b,3)}],
['連鎖・四連',3,'敵に4ダメージを3回。',(a,b,ctx)=>{for(let j=0;j<3;j++)ctx.hit(b,4)}],
['連鎖・百裂',3,'敵に5ダメージを4回。',(a,b,ctx)=>{for(let j=0;j<4;j++)ctx.hit(b,5)}],
['連鎖・流星',3,'敵に6ダメージを4回。',(a,b,ctx)=>{for(let j=0;j<4;j++)ctx.hit(b,6)}],
['連鎖・連環',3,'敵に3ダメージを5回。',(a,b,ctx)=>{for(let j=0;j<5;j++)ctx.hit(b,3)}],
['連鎖・飛燕',3,'敵に4ダメージを5回。',(a,b,ctx)=>{for(let j=0;j<5;j++)ctx.hit(b,4)}],
['連鎖・輪廻',3,'敵に5ダメージを6回。',(a,b,ctx)=>{for(let j=0;j<6;j++)ctx.hit(b,5)}],
['連鎖・千撃',3,'敵に6ダメージを6回。',(a,b,ctx)=>{for(let j=0;j<6;j++)ctx.hit(b,6)}],
['連鎖・万象',3,'敵に3ダメージを7回。',(a,b,ctx)=>{for(let j=0;j<7;j++)ctx.hit(b,3)}],
['再生・春風',2,'HPを5回復。1枚引く。',(a,b,ctx)=>{a.hp=Math.min(40,a.hp+5);ctx.draw(a,1);}],
['再生・蘇生',2,'HPを7回復。防御5。',(a,b,ctx)=>{a.hp=Math.min(40,a.hp+7);a.block+=5;}],
['再生・逆流',2,'HPを9回復。因果+2。',(a,b,ctx)=>{a.hp=Math.min(40,a.hp+9);a.fate+=2;}],
['再生・生命',2,'HPを11回復。1枚引く。',(a,b,ctx)=>{a.hp=Math.min(40,a.hp+11);ctx.draw(a,1);}],
['再生・慈雨',2,'HPを13回復。防御5。',(a,b,ctx)=>{a.hp=Math.min(40,a.hp+13);a.block+=5;}],
['再生・再誕',2,'HPを15回復。因果+2。',(a,b,ctx)=>{a.hp=Math.min(40,a.hp+15);a.fate+=2;}],
['再生・回帰',2,'HPを17回復。1枚引く。',(a,b,ctx)=>{a.hp=Math.min(40,a.hp+17);ctx.draw(a,1);}],
['再生・不死',2,'HPを19回復。防御5。',(a,b,ctx)=>{a.hp=Math.min(40,a.hp+19);a.block+=5;}],
['再生・黎明',2,'HPを21回復。因果+2。',(a,b,ctx)=>{a.hp=Math.min(40,a.hp+21);a.fate+=2;}],
['加速・点火',1,'エネルギー+1。1枚引く。',(a,b,ctx)=>{a.energy+=1;ctx.draw(a,1);}],
['加速・暴走',1,'エネルギー+2。敵に4ダメージ。',(a,b,ctx)=>{a.energy+=2;ctx.hit(b,4);}],
['加速・共鳴',1,'エネルギー+3。防御5。',(a,b,ctx)=>{a.energy+=3;a.block+=5;}],
['加速・瞬動',1,'エネルギー+1。1枚引く。',(a,b,ctx)=>{a.energy+=1;ctx.draw(a,1);}],
['加速・爆速',1,'エネルギー+2。敵に7ダメージ。',(a,b,ctx)=>{a.energy+=2;ctx.hit(b,7);}],
['加速・神速',1,'エネルギー+3。防御5。',(a,b,ctx)=>{a.energy+=3;a.block+=5;}],
['加速・転移',1,'エネルギー+1。1枚引く。',(a,b,ctx)=>{a.energy+=1;ctx.draw(a,1);}],
['加速・閃光',1,'エネルギー+2。敵に10ダメージ。',(a,b,ctx)=>{a.energy+=2;ctx.hit(b,10);}],
['加速・超越',1,'エネルギー+3。防御5。',(a,b,ctx)=>{a.energy+=3;a.block+=5;}]
].map(([name,cost,desc,act],id)=>({name,cost,desc,act,id}));

const starter=[
['練習斬り',1,'敵に5ダメージ。',(a,b,ctx)=>ctx.hit(b,5)],
['木製盾',1,'防御6。',(a,b,ctx)=>a.block+=6],
['小さな反撃',2,'防御5。敵に5ダメージ。',(a,b,ctx)=>{a.block+=5;ctx.hit(b,5)}],
['火花',2,'敵に9ダメージ。',(a,b,ctx)=>ctx.hit(b,9)],
['応急処置',2,'HPを7回復。',(a,b,ctx)=>a.hp=Math.min(40,a.hp+7)],
['深呼吸',1,'因果+1。1枚引く。',(a,b,ctx)=>{a.fate++;ctx.draw(a,1)}],
['手探り',1,'1枚引く。防御3。',(a,b,ctx)=>{ctx.draw(a,1);a.block+=3}],
['小突き',0,'敵に3ダメージ。',(a,b,ctx)=>ctx.hit(b,3)],
['受け流し',2,'防御9。',(a,b,ctx)=>a.block+=9],
['集中',1,'エネルギー+1。因果+1。',(a,b,ctx)=>{a.energy++;a.fate++}],
['牽制',2,'敵に7ダメージ。防御3。',(a,b,ctx)=>{ctx.hit(b,7);a.block+=3}],
['賭けの一撃',2,'50%で14ダメージ、失敗なら0。',(a,b,ctx)=>{if(ctx.random()<.5)ctx.hit(b,14)}]
].map(([name,cost,desc,act],i)=>({name,cost,desc,act,id:-i-1}));
const STARTER_SLOTS=starter.map(c=>c.id);

// Four distinct 30-card archetypes; IDs 1000-1119, independent of legacy catalog.
const duelThemes=[
 {id:'ruin',name:'⚔️ 破滅',description:'高火力と連撃で押し切る',cards:Array.from({length:30},(_,i)=>1000+0*30+i)},
 {id:'guard',name:'🛡️ 守護',description:'防御・回復・反撃で耐える',cards:Array.from({length:30},(_,i)=>1000+1*30+i)},
 {id:'fate',name:'🌀 因果',description:'ドローと因果操作で連鎖する',cards:Array.from({length:30},(_,i)=>1000+2*30+i)},
 {id:'blood',name:'🩸 血盟',description:'自傷を代償に爆発力を得る',cards:Array.from({length:30},(_,i)=>1000+3*30+i)},
];
cards.push({id:1000,name:'斬撃',cost:1,desc:'敵に5ダメージを2回。',act:(a,b,ctx)=>{ctx.hit(b,5);ctx.hit(b,5)}});
cards.push({id:1001,name:'裂傷',cost:2,desc:'敵に7ダメージ。',act:(a,b,ctx)=>ctx.hit(b,7)});
cards.push({id:1002,name:'断空',cost:3,desc:'敵に9ダメージ。',act:(a,b,ctx)=>ctx.hit(b,9)});
cards.push({id:1003,name:'破砕',cost:1,desc:'敵に11ダメージ。',act:(a,b,ctx)=>ctx.hit(b,11)});
cards.push({id:1004,name:'閃刃',cost:2,desc:'敵に13ダメージ。',act:(a,b,ctx)=>ctx.hit(b,13)});
cards.push({id:1005,name:'天墜',cost:3,desc:'敵に15ダメージを2回。',act:(a,b,ctx)=>{ctx.hit(b,15);ctx.hit(b,15)}});
cards.push({id:1006,name:'凶星',cost:1,desc:'敵に5ダメージ。',act:(a,b,ctx)=>ctx.hit(b,5)});
cards.push({id:1007,name:'月牙',cost:2,desc:'敵に7ダメージ。',act:(a,b,ctx)=>ctx.hit(b,7)});
cards.push({id:1008,name:'滅界',cost:3,desc:'敵に9ダメージ。',act:(a,b,ctx)=>ctx.hit(b,9)});
cards.push({id:1009,name:'絶刀',cost:1,desc:'敵に11ダメージ。',act:(a,b,ctx)=>ctx.hit(b,11)});
cards.push({id:1010,name:'突撃',cost:2,desc:'敵に13ダメージを2回。',act:(a,b,ctx)=>{ctx.hit(b,13);ctx.hit(b,13)}});
cards.push({id:1011,name:'雷撃',cost:3,desc:'敵に15ダメージ。',act:(a,b,ctx)=>ctx.hit(b,15)});
cards.push({id:1012,name:'震撃',cost:1,desc:'敵に5ダメージ。',act:(a,b,ctx)=>ctx.hit(b,5)});
cards.push({id:1013,name:'強襲',cost:2,desc:'敵に7ダメージ。',act:(a,b,ctx)=>ctx.hit(b,7)});
cards.push({id:1014,name:'逆鱗',cost:3,desc:'敵に9ダメージ。',act:(a,b,ctx)=>ctx.hit(b,9)});
cards.push({id:1015,name:'火刑',cost:1,desc:'敵に11ダメージを2回。',act:(a,b,ctx)=>{ctx.hit(b,11);ctx.hit(b,11)}});
cards.push({id:1016,name:'斬月',cost:2,desc:'敵に13ダメージ。',act:(a,b,ctx)=>ctx.hit(b,13)});
cards.push({id:1017,name:'焔舞',cost:3,desc:'敵に15ダメージ。',act:(a,b,ctx)=>ctx.hit(b,15)});
cards.push({id:1018,name:'穿孔',cost:1,desc:'敵に5ダメージ。',act:(a,b,ctx)=>ctx.hit(b,5)});
cards.push({id:1019,name:'連撃',cost:2,desc:'敵に7ダメージ。',act:(a,b,ctx)=>ctx.hit(b,7)});
cards.push({id:1020,name:'雷霆',cost:3,desc:'敵に9ダメージを2回。',act:(a,b,ctx)=>{ctx.hit(b,9);ctx.hit(b,9)}});
cards.push({id:1021,name:'轟雷',cost:1,desc:'敵に11ダメージ。',act:(a,b,ctx)=>ctx.hit(b,11)});
cards.push({id:1022,name:'虚斬',cost:2,desc:'敵に13ダメージ。',act:(a,b,ctx)=>ctx.hit(b,13)});
cards.push({id:1023,name:'終撃',cost:3,desc:'敵に15ダメージ。',act:(a,b,ctx)=>ctx.hit(b,15)});
cards.push({id:1024,name:'神罰',cost:1,desc:'敵に5ダメージ。',act:(a,b,ctx)=>ctx.hit(b,5)});
cards.push({id:1025,name:'魔弾',cost:2,desc:'敵に7ダメージを2回。',act:(a,b,ctx)=>{ctx.hit(b,7);ctx.hit(b,7)}});
cards.push({id:1026,name:'戦慄',cost:3,desc:'敵に9ダメージ。',act:(a,b,ctx)=>ctx.hit(b,9)});
cards.push({id:1027,name:'烈火',cost:1,desc:'敵に11ダメージ。',act:(a,b,ctx)=>ctx.hit(b,11)});
cards.push({id:1028,name:'剛撃',cost:2,desc:'敵に13ダメージ。',act:(a,b,ctx)=>ctx.hit(b,13)});
cards.push({id:1029,name:'終末',cost:3,desc:'敵に15ダメージ。',act:(a,b,ctx)=>ctx.hit(b,15)});
cards.push({id:1030,name:'鉄壁',cost:1,desc:'防御6、HPを3回復。',act:(a,b,ctx)=>{a.block+=6;a.hp=Math.min(a.maxHp,a.hp+3);}});
cards.push({id:1031,name:'星盾',cost:2,desc:'防御7、敵に3ダメージ。',act:(a,b,ctx)=>{a.block+=7;ctx.hit(b,3);}});
cards.push({id:1032,name:'護法',cost:3,desc:'防御8。',act:(a,b,ctx)=>{a.block+=8;}});
cards.push({id:1033,name:'結界',cost:1,desc:'防御9、HPを3回復。',act:(a,b,ctx)=>{a.block+=9;a.hp=Math.min(a.maxHp,a.hp+3);}});
cards.push({id:1034,name:'聖盾',cost:2,desc:'防御10、敵に3ダメージ。',act:(a,b,ctx)=>{a.block+=10;ctx.hit(b,3);}});
cards.push({id:1035,name:'守護',cost:3,desc:'防御11。',act:(a,b,ctx)=>{a.block+=11;}});
cards.push({id:1036,name:'白銀',cost:1,desc:'防御12、HPを3回復。',act:(a,b,ctx)=>{a.block+=12;a.hp=Math.min(a.maxHp,a.hp+3);}});
cards.push({id:1037,name:'天蓋',cost:2,desc:'防御13、敵に3ダメージ。',act:(a,b,ctx)=>{a.block+=13;ctx.hit(b,3);}});
cards.push({id:1038,name:'金剛',cost:3,desc:'防御6。',act:(a,b,ctx)=>{a.block+=6;}});
cards.push({id:1039,name:'防壁',cost:1,desc:'防御7、HPを3回復。',act:(a,b,ctx)=>{a.block+=7;a.hp=Math.min(a.maxHp,a.hp+3);}});
cards.push({id:1040,name:'反射',cost:2,desc:'防御8、敵に3ダメージ。',act:(a,b,ctx)=>{a.block+=8;ctx.hit(b,3);}});
cards.push({id:1041,name:'再生',cost:3,desc:'防御9。',act:(a,b,ctx)=>{a.block+=9;}});
cards.push({id:1042,name:'癒光',cost:1,desc:'防御10、HPを3回復。',act:(a,b,ctx)=>{a.block+=10;a.hp=Math.min(a.maxHp,a.hp+3);}});
cards.push({id:1043,name:'回帰',cost:2,desc:'防御11、敵に3ダメージ。',act:(a,b,ctx)=>{a.block+=11;ctx.hit(b,3);}});
cards.push({id:1044,name:'浄化',cost:3,desc:'防御12。',act:(a,b,ctx)=>{a.block+=12;}});
cards.push({id:1045,name:'庇護',cost:1,desc:'防御13、HPを3回復。',act:(a,b,ctx)=>{a.block+=13;a.hp=Math.min(a.maxHp,a.hp+3);}});
cards.push({id:1046,name:'障壁',cost:2,desc:'防御6、敵に3ダメージ。',act:(a,b,ctx)=>{a.block+=6;ctx.hit(b,3);}});
cards.push({id:1047,name:'慈愛',cost:3,desc:'防御7。',act:(a,b,ctx)=>{a.block+=7;}});
cards.push({id:1048,name:'玄武',cost:1,desc:'防御8、HPを3回復。',act:(a,b,ctx)=>{a.block+=8;a.hp=Math.min(a.maxHp,a.hp+3);}});
cards.push({id:1049,name:'聖域',cost:2,desc:'防御9、敵に3ダメージ。',act:(a,b,ctx)=>{a.block+=9;ctx.hit(b,3);}});
cards.push({id:1050,name:'逆襲',cost:3,desc:'防御10。',act:(a,b,ctx)=>{a.block+=10;}});
cards.push({id:1051,name:'天守',cost:1,desc:'防御11、HPを3回復。',act:(a,b,ctx)=>{a.block+=11;a.hp=Math.min(a.maxHp,a.hp+3);}});
cards.push({id:1052,name:'不屈',cost:2,desc:'防御12、敵に3ダメージ。',act:(a,b,ctx)=>{a.block+=12;ctx.hit(b,3);}});
cards.push({id:1053,name:'祝福',cost:3,desc:'防御13。',act:(a,b,ctx)=>{a.block+=13;}});
cards.push({id:1054,name:'鉄城',cost:1,desc:'防御6、HPを3回復。',act:(a,b,ctx)=>{a.block+=6;a.hp=Math.min(a.maxHp,a.hp+3);}});
cards.push({id:1055,name:'回復',cost:2,desc:'防御7、敵に3ダメージ。',act:(a,b,ctx)=>{a.block+=7;ctx.hit(b,3);}});
cards.push({id:1056,name:'防衛',cost:3,desc:'防御8。',act:(a,b,ctx)=>{a.block+=8;}});
cards.push({id:1057,name:'月守',cost:1,desc:'防御9、HPを3回復。',act:(a,b,ctx)=>{a.block+=9;a.hp=Math.min(a.maxHp,a.hp+3);}});
cards.push({id:1058,name:'護輪',cost:2,desc:'防御10、敵に3ダメージ。',act:(a,b,ctx)=>{a.block+=10;ctx.hit(b,3);}});
cards.push({id:1059,name:'永劫',cost:3,desc:'防御11。',act:(a,b,ctx)=>{a.block+=11;}});
cards.push({id:1060,name:'予知',cost:1,desc:'因果+2。1枚引く。',act:(a,b,ctx)=>{a.fate+=2;ctx.draw(a,1)}});
cards.push({id:1061,name:'分岐',cost:2,desc:'エネルギー+1。1枚引く。',act:(a,b,ctx)=>{a.energy++;ctx.draw(a,1)}});
cards.push({id:1062,name:'逆説',cost:3,desc:'敵に7ダメージ。因果+2。',act:(a,b,ctx)=>{ctx.hit(b,7);a.fate+=2}});
cards.push({id:1063,name:'転写',cost:1,desc:'因果+2。1枚引く。',act:(a,b,ctx)=>{a.fate+=2;ctx.draw(a,1)}});
cards.push({id:1064,name:'改竄',cost:2,desc:'エネルギー+1。1枚引く。',act:(a,b,ctx)=>{a.energy++;ctx.draw(a,1)}});
cards.push({id:1065,name:'観測',cost:3,desc:'敵に7ダメージ。因果+2。',act:(a,b,ctx)=>{ctx.hit(b,7);a.fate+=2}});
cards.push({id:1066,name:'跳躍',cost:1,desc:'因果+2。1枚引く。',act:(a,b,ctx)=>{a.fate+=2;ctx.draw(a,1)}});
cards.push({id:1067,name:'追跡',cost:2,desc:'エネルギー+1。1枚引く。',act:(a,b,ctx)=>{a.energy++;ctx.draw(a,1)}});
cards.push({id:1068,name:'因数',cost:3,desc:'敵に7ダメージ。因果+2。',act:(a,b,ctx)=>{ctx.hit(b,7);a.fate+=2}});
cards.push({id:1069,name:'干渉',cost:1,desc:'因果+2。1枚引く。',act:(a,b,ctx)=>{a.fate+=2;ctx.draw(a,1)}});
cards.push({id:1070,name:'確率',cost:2,desc:'エネルギー+1。1枚引く。',act:(a,b,ctx)=>{a.energy++;ctx.draw(a,1)}});
cards.push({id:1071,name:'時差',cost:3,desc:'敵に7ダメージ。因果+2。',act:(a,b,ctx)=>{ctx.hit(b,7);a.fate+=2}});
cards.push({id:1072,name:'接続',cost:1,desc:'因果+2。1枚引く。',act:(a,b,ctx)=>{a.fate+=2;ctx.draw(a,1)}});
cards.push({id:1073,name:'再演',cost:2,desc:'エネルギー+1。1枚引く。',act:(a,b,ctx)=>{a.energy++;ctx.draw(a,1)}});
cards.push({id:1074,name:'逸脱',cost:3,desc:'敵に7ダメージ。因果+2。',act:(a,b,ctx)=>{ctx.hit(b,7);a.fate+=2}});
cards.push({id:1075,name:'循環',cost:1,desc:'因果+2。1枚引く。',act:(a,b,ctx)=>{a.fate+=2;ctx.draw(a,1)}});
cards.push({id:1076,name:'演算',cost:2,desc:'エネルギー+1。1枚引く。',act:(a,b,ctx)=>{a.energy++;ctx.draw(a,1)}});
cards.push({id:1077,name:'記録',cost:3,desc:'敵に7ダメージ。因果+2。',act:(a,b,ctx)=>{ctx.hit(b,7);a.fate+=2}});
cards.push({id:1078,name:'破局',cost:1,desc:'因果+2。1枚引く。',act:(a,b,ctx)=>{a.fate+=2;ctx.draw(a,1)}});
cards.push({id:1079,name:'連環',cost:2,desc:'エネルギー+1。1枚引く。',act:(a,b,ctx)=>{a.energy++;ctx.draw(a,1)}});
cards.push({id:1080,name:'収束',cost:3,desc:'敵に7ダメージ。因果+2。',act:(a,b,ctx)=>{ctx.hit(b,7);a.fate+=2}});
cards.push({id:1081,name:'逆算',cost:1,desc:'因果+2。1枚引く。',act:(a,b,ctx)=>{a.fate+=2;ctx.draw(a,1)}});
cards.push({id:1082,name:'共鳴',cost:2,desc:'エネルギー+1。1枚引く。',act:(a,b,ctx)=>{a.energy++;ctx.draw(a,1)}});
cards.push({id:1083,name:'時空',cost:3,desc:'敵に7ダメージ。因果+2。',act:(a,b,ctx)=>{ctx.hit(b,7);a.fate+=2}});
cards.push({id:1084,name:'転移',cost:1,desc:'因果+2。1枚引く。',act:(a,b,ctx)=>{a.fate+=2;ctx.draw(a,1)}});
cards.push({id:1085,name:'宿命',cost:2,desc:'エネルギー+1。1枚引く。',act:(a,b,ctx)=>{a.energy++;ctx.draw(a,1)}});
cards.push({id:1086,name:'反証',cost:3,desc:'敵に7ダメージ。因果+2。',act:(a,b,ctx)=>{ctx.hit(b,7);a.fate+=2}});
cards.push({id:1087,name:'選択',cost:1,desc:'因果+2。1枚引く。',act:(a,b,ctx)=>{a.fate+=2;ctx.draw(a,1)}});
cards.push({id:1088,name:'零式',cost:2,desc:'エネルギー+1。1枚引く。',act:(a,b,ctx)=>{a.energy++;ctx.draw(a,1)}});
cards.push({id:1089,name:'確定',cost:3,desc:'敵に7ダメージ。因果+2。',act:(a,b,ctx)=>{ctx.hit(b,7);a.fate+=2}});
cards.push({id:1090,name:'供物',cost:0,desc:'HP2を失い、敵に11ダメージ。',act:(a,b,ctx)=>{a.hp-=2;ctx.hit(b,11)}});
cards.push({id:1091,name:'血霧',cost:2,desc:'HP3を失い、エネルギー+2。',act:(a,b,ctx)=>{a.hp-=3;a.energy+=2}});
cards.push({id:1092,name:'契約',cost:1,desc:'HP4を失い、2枚引く。',act:(a,b,ctx)=>{a.hp-=4;ctx.draw(a,2)}});
cards.push({id:1093,name:'赤月',cost:2,desc:'HP5を失い、敵に14ダメージ。',act:(a,b,ctx)=>{a.hp-=5;ctx.hit(b,14)}});
cards.push({id:1094,name:'痛覚',cost:0,desc:'HP2を失い、エネルギー+2。',act:(a,b,ctx)=>{a.hp-=2;a.energy+=2}});
cards.push({id:1095,name:'覚醒',cost:2,desc:'HP3を失い、2枚引く。',act:(a,b,ctx)=>{a.hp-=3;ctx.draw(a,2)}});
cards.push({id:1096,name:'狂宴',cost:1,desc:'HP4を失い、敵に11ダメージ。',act:(a,b,ctx)=>{a.hp-=4;ctx.hit(b,11)}});
cards.push({id:1097,name:'吸魂',cost:2,desc:'HP5を失い、エネルギー+2。',act:(a,b,ctx)=>{a.hp-=5;a.energy+=2}});
cards.push({id:1098,name:'献身',cost:0,desc:'HP2を失い、2枚引く。',act:(a,b,ctx)=>{a.hp-=2;ctx.draw(a,2)}});
cards.push({id:1099,name:'赤雨',cost:2,desc:'HP3を失い、敵に14ダメージ。',act:(a,b,ctx)=>{a.hp-=3;ctx.hit(b,14)}});
cards.push({id:1100,name:'禁忌',cost:1,desc:'HP4を失い、エネルギー+2。',act:(a,b,ctx)=>{a.hp-=4;a.energy+=2}});
cards.push({id:1101,name:'黒涙',cost:2,desc:'HP5を失い、2枚引く。',act:(a,b,ctx)=>{a.hp-=5;ctx.draw(a,2)}});
cards.push({id:1102,name:'紅蓮',cost:0,desc:'HP2を失い、敵に11ダメージ。',act:(a,b,ctx)=>{a.hp-=2;ctx.hit(b,11)}});
cards.push({id:1103,name:'復讐',cost:2,desc:'HP3を失い、エネルギー+2。',act:(a,b,ctx)=>{a.hp-=3;a.energy+=2}});
cards.push({id:1104,name:'呪印',cost:1,desc:'HP4を失い、2枚引く。',act:(a,b,ctx)=>{a.hp-=4;ctx.draw(a,2)}});
cards.push({id:1105,name:'代償',cost:2,desc:'HP5を失い、敵に14ダメージ。',act:(a,b,ctx)=>{a.hp-=5;ctx.hit(b,14)}});
cards.push({id:1106,name:'心臓',cost:0,desc:'HP2を失い、エネルギー+2。',act:(a,b,ctx)=>{a.hp-=2;a.energy+=2}});
cards.push({id:1107,name:'犠牲',cost:2,desc:'HP3を失い、2枚引く。',act:(a,b,ctx)=>{a.hp-=3;ctx.draw(a,2)}});
cards.push({id:1108,name:'血潮',cost:1,desc:'HP4を失い、敵に11ダメージ。',act:(a,b,ctx)=>{a.hp-=4;ctx.hit(b,11)}});
cards.push({id:1109,name:'生贄',cost:2,desc:'HP5を失い、エネルギー+2。',act:(a,b,ctx)=>{a.hp-=5;a.energy+=2}});
cards.push({id:1110,name:'背水',cost:0,desc:'HP2を失い、2枚引く。',act:(a,b,ctx)=>{a.hp-=2;ctx.draw(a,2)}});
cards.push({id:1111,name:'夜叉',cost:2,desc:'HP3を失い、敵に14ダメージ。',act:(a,b,ctx)=>{a.hp-=3;ctx.hit(b,14)}});
cards.push({id:1112,name:'黒翼',cost:1,desc:'HP4を失い、エネルギー+2。',act:(a,b,ctx)=>{a.hp-=4;a.energy+=2}});
cards.push({id:1113,name:'不死',cost:2,desc:'HP5を失い、2枚引く。',act:(a,b,ctx)=>{a.hp-=5;ctx.draw(a,2)}});
cards.push({id:1114,name:'飢餓',cost:0,desc:'HP2を失い、敵に11ダメージ。',act:(a,b,ctx)=>{a.hp-=2;ctx.hit(b,11)}});
cards.push({id:1115,name:'終血',cost:2,desc:'HP3を失い、エネルギー+2。',act:(a,b,ctx)=>{a.hp-=3;a.energy+=2}});
cards.push({id:1116,name:'魔契',cost:1,desc:'HP4を失い、2枚引く。',act:(a,b,ctx)=>{a.hp-=4;ctx.draw(a,2)}});
cards.push({id:1117,name:'冥府',cost:2,desc:'HP5を失い、敵に14ダメージ。',act:(a,b,ctx)=>{a.hp-=5;ctx.hit(b,14)}});
cards.push({id:1118,name:'赤鎖',cost:0,desc:'HP2を失い、エネルギー+2。',act:(a,b,ctx)=>{a.hp-=2;a.energy+=2}});
cards.push({id:1119,name:'血王',cost:2,desc:'HP3を失い、2枚引く。',act:(a,b,ctx)=>{a.hp-=3;ctx.draw(a,2)}});

for(const theme of duelThemes)for(const id of theme.cards){const c=cards.find(c=>c.id===id);c.job=theme.id}

/* PvP mana curve: 30 cards per class, identical cost distribution but different effects.
   Costs: 0x2, 1x8, 2x10, 3x6, 4x3, 5x1. */
const PVP_CURVE=[0,0,...Array(8).fill(1),...Array(10).fill(2),...Array(6).fill(3),...Array(3).fill(4),5];
for(const theme of duelThemes)for(let i=0;i<theme.cards.length;i++){
 const c=cards.find(x=>x.id===theme.cards[i]),cost=PVP_CURVE[i],tier=i%5;
 c.cost=cost;
 if(theme.id==='ruin'){
  const damage=Math.max(2,4+cost*4+(tier%3));
  const seal=(b)=>{if(cost>=2&&b.fate>0)b.fate=Math.max(0,b.fate-2)};
  c.desc='防御を3削り、敵に'+damage+'ダメージ'+(cost===5?'を2回':'')+'。'+(cost>=2?'相手の因果を最大2削る。':'');
  c.act=cost===5?(a,b,ctx)=>{b.block=Math.max(0,b.block-3);ctx.hit(b,damage);ctx.hit(b,damage);seal(b)}:(a,b,ctx)=>{b.block=Math.max(0,b.block-3);ctx.hit(b,damage);seal(b)};
 }else if(theme.id==='guard'){
  const block=1+cost*2,damage=4+cost*3+(tier%2);
  c.desc='防御'+block+'。敵に'+damage+'ダメージ。'+(cost>=4?'HP2回復。':'');
  c.act=(a,b,ctx)=>{a.block+=block;ctx.hit(b,damage);if(cost>=4)a.hp=Math.min(a.maxHp,a.hp+2)};
 }else if(theme.id==='fate'){
  const damage=4+cost*3+(tier%2),fate=cost>=4?2:1;
  c.desc='敵の防御を2削り、敵に'+damage+'ダメージ。因果+'+fate+'。'+(cost>=4?'1枚引く。':'');
  c.act=(a,b,ctx)=>{b.block=Math.max(0,b.block-2);ctx.hit(b,damage);a.fate+=fate;if(cost>=4)ctx.draw(a,1)};
 }else if(theme.id==='blood'){
  const damage=4+cost*5+(tier%3),loss=cost===0?1:Math.max(1,Math.ceil(cost/2));
  c.desc='HP'+loss+'を失い、敵に'+damage+'ダメージ。'+(cost>=4?'因果+1。':'');
  c.act=(a,b,ctx)=>{a.hp-=loss;ctx.hit(b,damage);if(cost>=4)a.fate++};
 }
}


/* PvP tactical identities v2.1: 24 mechanics x 5 variations.
   Zero-cost cards never draw or generate energy. All effects are bounded. */
const PVP_TACTICS={
 ruin:[
  (c,k)=>{const n=2+c.cost*3+k%2;c.desc='敵の防御を'+n+'削る。削った量×2ダメージ（最低2）。';c.act=(a,b,x)=>{const z=Math.min(n,b.block);b.block-=z;x.hit(b,Math.max(2+c.cost*2,z*2))}},
  (c,k)=>{const n=2+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。相手の因果が4以上なら追加5ダメージ。';c.act=(a,b,x)=>{x.hit(b,n+(b.fate>=4?5:0))}},
  (c,k)=>{const n=4+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。相手の因果を最大2削る。削れなければ自分の因果+1。';c.act=(a,b,x)=>{x.hit(b,n);const z=Math.min(2,b.fate);b.fate-=z;if(!z)a.fate=Math.min(12,a.fate+1)}},
  (c,k)=>{const n=2+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。相手の防御が残っていれば、さらに防御を4削る。';c.act=(a,b,x)=>{x.hit(b,n);b.block=Math.max(0,b.block-4)}},
  (c,k)=>{const n=4+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。自分の防御があれば全消費し、追加で最大6ダメージ。';c.act=(a,b,x)=>{const z=Math.min(6,a.block);a.block=0;x.hit(b,n+z)}},
  (c,k)=>{const n=2+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。敵HPが自分より高ければ2回攻撃、そうでなければ因果+1。';c.act=(a,b,x)=>{const behind=b.hp>a.hp;x.hit(b,n);if(behind)x.hit(b,n);else a.fate=Math.min(12,a.fate+1)}}
 ],
 guard:[
  (c,k)=>{const n=2+c.cost*3+k%2;c.desc='防御'+n+'。自分の防御が12以上になれば因果+1。';c.act=(a,b,x)=>{a.block+=n;if(a.block>=12)a.fate=Math.min(12,a.fate+1)}},
  (c,k)=>{const n=2+c.cost*3+k%2;c.desc='防御'+n+'。現在の防御の半分（最大10）を敵に与える。';c.act=(a,b,x)=>{a.block+=n;x.hit(b,Math.min(10,Math.floor(a.block/2)))}},
  (c,k)=>{const n=3+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。防御が0なら防御+6。';c.act=(a,b,x)=>{x.hit(b,n);if(a.block===0)a.block+=6}},
  (c,k)=>{const n=6+c.cost*3+k%2;c.desc='防御'+n+'。HP30以下ならHP3回復。';c.act=(a,b,x)=>{a.block+=n;if(a.hp<=30)a.hp=Math.min(a.maxHp,a.hp+3)}},
  (c,k)=>{const n=3+c.cost*3+k%2;c.desc='防御'+n+'。自分の防御を最大5消費し、消費量×2ダメージ。';c.act=(a,b,x)=>{a.block+=n;const z=Math.min(5,a.block);a.block-=z;x.hit(b,z*2)}},
  (c,k)=>{const n=3+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。自分のHPが相手以下なら防御+8、上なら因果+1。';c.act=(a,b,x)=>{const low=a.hp<=b.hp;x.hit(b,n);if(low)a.block+=8;else a.fate=Math.min(12,a.fate+1)}}
 ],
 fate:[
  (c,k)=>{const n=2+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。因果+1。因果6以上なら追加3ダメージ。';c.act=(a,b,x)=>{a.fate=Math.min(12,a.fate+1);x.hit(b,n+(a.fate>=6?3:0))}},
  (c,k)=>{const n=6+c.cost*3+k%2;c.desc='因果を最大2消費し、敵に'+n+'＋消費量×5ダメージ。';c.act=(a,b,x)=>{const z=Math.min(2,a.fate);a.fate-=z;x.hit(b,n+z*5)}},
  (c,k)=>{const n=2+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。手札が2枚以下なら1枚引く（このカードはコスト1以上）。';c.act=(a,b,x)=>{x.hit(b,n);if(a.hand.length<=2&&c.cost>0)x.draw(a,1)}},
  (c,k)=>{const n=2+c.cost*3+k%2;c.desc='防御'+n+'。因果が3以上なら追加防御5、そうでなければ因果+1。';c.act=(a,b,x)=>{a.block+=n;if(a.fate>=3)a.block+=5;else a.fate=Math.min(12,a.fate+1)}},
  (c,k)=>{const n=3+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。相手の因果を1奪う。相手が0なら自分の防御+4。';c.act=(a,b,x)=>{x.hit(b,n);if(b.fate>0){b.fate--;a.fate=Math.min(12,a.fate+1)}else a.block+=4}},
  (c,k)=>{const n=3+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。自分の因果が偶数なら防御+5、奇数なら因果+1。';c.act=(a,b,x)=>{x.hit(b,n);if(a.fate%2===0)a.block+=5;else a.fate=Math.min(12,a.fate+1)}}
 ],
 blood:[
  (c,k)=>{const n=6+c.cost*4+k%2;c.desc='HP2を失い、敵に'+n+'ダメージ。HP20以下なら追加4。';c.act=(a,b,x)=>{a.hp-=2;x.hit(b,n+(a.hp<=20?4:0))}},
  (c,k)=>{const n=5+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。自分のHPが相手より低ければ因果+2。';c.act=(a,b,x)=>{x.hit(b,n);if(a.hp<b.hp)a.fate=Math.min(12,a.fate+2)}},
  (c,k)=>{const n=8+c.cost*3+k%2;c.desc='防御を最大6消費し、敵に'+n+'＋消費量×2ダメージ。';c.act=(a,b,x)=>{const z=Math.min(6,a.block);a.block-=z;x.hit(b,n+z*2)}},
  (c,k)=>{const n=8+c.cost*3+k%2;c.desc='HP3を失い、敵に'+n+'ダメージ。与えたHPダメージの半分（最大5）回復。';c.act=(a,b,x)=>{a.hp-=3;const z=x.hit(b,n);a.hp=Math.min(a.maxHp,a.hp+Math.min(5,Math.floor((z.dealt||0)/2)))}},
  (c,k)=>{const n=4+c.cost*4+k%2;c.desc='HP2を失い、敵に'+n+'ダメージ。手札が1枚以下なら1枚引く（コスト1以上）。';c.act=(a,b,x)=>{a.hp-=2;x.hit(b,n);if(a.hand.length<=1&&c.cost>0)x.draw(a,1)}},
  (c,k)=>{const n=5+c.cost*3+k%2;c.desc='敵に'+n+'ダメージ。自分のHPが15以下なら2回攻撃、そうでなければHP1を失う。';c.act=(a,b,x)=>{const low=a.hp<=15;x.hit(b,n);if(low)x.hit(b,n);else a.hp--}}
 ]
};
for(const theme of duelThemes)for(let i=0;i<30;i++){
 const c=cards.find(x=>x.id===theme.cards[i]);
 PVP_TACTICS[theme.id][Math.floor(i/5)](c,i%5);
 // Keep the original 0..5 shared mana curve, and bound all effects to a single action.
}

/* Individual PvP signatures: 120 per-card conditional riders. */
{const c=cards.find(c=>c.id===1000),base=c.act;c.desc+=' 【余震の証人】敵の防御を追加で2削る。';c.act=(a,b,x)=>{base(a,b,x);b.block=Math.max(0,b.block-2)}}
{const c=cards.find(c=>c.id===1001),base=c.act;c.desc+=' 【余命の前払い】敵HPが30以下なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp<=30)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1002),base=c.act;c.desc+=' 【防壁の利息】防御が10以上なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.block>=10)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1003),base=c.act;c.desc+=' 【底の抜けた山札】山札が5枚以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.deck.length<=5)a.block+=4}}
{const c=cards.find(c=>c.id===1004),base=c.act;c.desc+=' 【因果の端数】因果が3以下なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate<=3)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1005),base=c.act;c.desc+=' 【偶数の傷跡】因果が偶数なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate%2===0)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1006),base=c.act;c.desc+=' 【残額の祈り】HPが15以下ならHP2回復。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<=15)a.hp=Math.min(a.maxHp,a.hp+2)}}
{const c=cards.find(c=>c.id===1007),base=c.act;c.desc+=' 【割り切れない夜】敵HPが奇数なら追加2ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp%2!==0)x.hit(b,2)}}
{const c=cards.find(c=>c.id===1008),base=c.act;c.desc+=' 【二枚目の遺書】手札が2枚以下なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hand.length<=2)a.block+=3}}
{const c=cards.find(c=>c.id===1009),base=c.act;c.desc+=' 【反証の灯台】敵HPが自分より高ければ因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp>a.hp)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1010),base=c.act;c.desc+=' 【手札の葬列】手札が空なら防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.hand.length===0)a.block+=5}}
{const c=cards.find(c=>c.id===1011),base=c.act;c.desc+=' 【三手目の噂】このターン2枚以上使用済みなら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.cardsPlayed>=2)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1012),base=c.act;c.desc+=' 【裸の王冠】敵の防御が0なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.block===0)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1013),base=c.act;c.desc+=' 【逆さの領収書】敵の因果が2以上なら1奪う。';c.act=(a,b,x)=>{base(a,b,x);if(b.fate>=2){b.fate--;a.fate=Math.min(12,a.fate+1)}}}
{const c=cards.find(c=>c.id===1014),base=c.act;c.desc+=' 【後手の勲章】自分のHPが敵より低ければ防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<b.hp)a.block+=5}}
{const c=cards.find(c=>c.id===1015),base=c.act;c.desc+=' 【破れた契約】敵の防御が5以上なら追加で3削る。';c.act=(a,b,x)=>{base(a,b,x);if(b.block>=5)b.block-=3}}
{const c=cards.find(c=>c.id===1016),base=c.act;c.desc+=' 【守られた傷】自分に防御があればHP1回復。';c.act=(a,b,x)=>{base(a,b,x);if(a.block>0)a.hp=Math.min(a.maxHp,a.hp+1)}}
{const c=cards.find(c=>c.id===1017),base=c.act;c.desc+=' 【決着の余熱】敵HPが15以下なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp<=15)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1018),base=c.act;c.desc+=' 【奇数の恩赦】因果が奇数なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate%2===1)a.block+=4}}
{const c=cards.find(c=>c.id===1019),base=c.act;c.desc+=' 【不均衡の判決】敵の因果が自分より多ければ因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.fate>a.fate)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1020),base=c.act;c.desc+=' 【空席の証人】敵の手札が3枚以下なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.hand.length<=3)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1021),base=c.act;c.desc+=' 【薄い城壁】防御が5以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.block<=5)a.block+=4}}
{const c=cards.find(c=>c.id===1022),base=c.act;c.desc+=' 【失効した盾】自分の防御が0なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.block===0)a.block+=3}}
{const c=cards.find(c=>c.id===1023),base=c.act;c.desc+=' 【露出した心臓】敵の防御が0なら追加2ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.block===0)x.hit(b,2)}}
{const c=cards.find(c=>c.id===1024),base=c.act;c.desc+=' 【半身の証明】自分のHPが偶数なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp%2===0)a.block+=3}}
{const c=cards.find(c=>c.id===1025),base=c.act;c.desc+=' 【勝者の保険】自分のHPが敵以上なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp>=b.hp)a.block+=3}}
{const c=cards.find(c=>c.id===1026),base=c.act;c.desc+=' 【片肺の国境】自分のHPが30以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<=30)a.block+=4}}
{const c=cards.find(c=>c.id===1027),base=c.act;c.desc+=' 【無因の果実】因果が0なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate===0)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1028),base=c.act;c.desc+=' 【初手の墓標】ターン最初のカードなら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.cardsPlayed===0)a.block+=4}}
{const c=cards.find(c=>c.id===1029),base=c.act;c.desc+=' 【余剰の因果】因果が6以上なら防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate>=6)a.block+=5}}
{const c=cards.find(c=>c.id===1030),base=c.act;c.desc+=' 【逆さの領収書】敵の因果が2以上なら1奪う。';c.act=(a,b,x)=>{base(a,b,x);if(b.fate>=2){b.fate--;a.fate=Math.min(12,a.fate+1)}}}
{const c=cards.find(c=>c.id===1031),base=c.act;c.desc+=' 【後手の勲章】自分のHPが敵より低ければ防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<b.hp)a.block+=5}}
{const c=cards.find(c=>c.id===1032),base=c.act;c.desc+=' 【破れた契約】敵の防御が5以上なら追加で3削る。';c.act=(a,b,x)=>{base(a,b,x);if(b.block>=5)b.block-=3}}
{const c=cards.find(c=>c.id===1033),base=c.act;c.desc+=' 【守られた傷】自分に防御があればHP1回復。';c.act=(a,b,x)=>{base(a,b,x);if(a.block>0)a.hp=Math.min(a.maxHp,a.hp+1)}}
{const c=cards.find(c=>c.id===1034),base=c.act;c.desc+=' 【決着の余熱】敵HPが15以下なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp<=15)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1035),base=c.act;c.desc+=' 【奇数の恩赦】因果が奇数なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate%2===1)a.block+=4}}
{const c=cards.find(c=>c.id===1036),base=c.act;c.desc+=' 【不均衡の判決】敵の因果が自分より多ければ因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.fate>a.fate)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1037),base=c.act;c.desc+=' 【空席の証人】敵の手札が3枚以下なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.hand.length<=3)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1038),base=c.act;c.desc+=' 【薄い城壁】防御が5以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.block<=5)a.block+=4}}
{const c=cards.find(c=>c.id===1039),base=c.act;c.desc+=' 【失効した盾】自分の防御が0なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.block===0)a.block+=3}}
{const c=cards.find(c=>c.id===1040),base=c.act;c.desc+=' 【露出した心臓】敵の防御が0なら追加2ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.block===0)x.hit(b,2)}}
{const c=cards.find(c=>c.id===1041),base=c.act;c.desc+=' 【半身の証明】自分のHPが偶数なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp%2===0)a.block+=3}}
{const c=cards.find(c=>c.id===1042),base=c.act;c.desc+=' 【勝者の保険】自分のHPが敵以上なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp>=b.hp)a.block+=3}}
{const c=cards.find(c=>c.id===1043),base=c.act;c.desc+=' 【片肺の国境】自分のHPが30以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<=30)a.block+=4}}
{const c=cards.find(c=>c.id===1044),base=c.act;c.desc+=' 【無因の果実】因果が0なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate===0)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1045),base=c.act;c.desc+=' 【初手の墓標】ターン最初のカードなら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.cardsPlayed===0)a.block+=4}}
{const c=cards.find(c=>c.id===1046),base=c.act;c.desc+=' 【余剰の因果】因果が6以上なら防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate>=6)a.block+=5}}
{const c=cards.find(c=>c.id===1047),base=c.act;c.desc+=' 【余震の証人】敵の防御を追加で2削る。';c.act=(a,b,x)=>{base(a,b,x);b.block=Math.max(0,b.block-2)}}
{const c=cards.find(c=>c.id===1048),base=c.act;c.desc+=' 【余命の前払い】敵HPが30以下なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp<=30)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1049),base=c.act;c.desc+=' 【防壁の利息】防御が10以上なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.block>=10)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1050),base=c.act;c.desc+=' 【底の抜けた山札】山札が5枚以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.deck.length<=5)a.block+=4}}
{const c=cards.find(c=>c.id===1051),base=c.act;c.desc+=' 【因果の端数】因果が3以下なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate<=3)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1052),base=c.act;c.desc+=' 【偶数の傷跡】因果が偶数なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate%2===0)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1053),base=c.act;c.desc+=' 【残額の祈り】HPが15以下ならHP2回復。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<=15)a.hp=Math.min(a.maxHp,a.hp+2)}}
{const c=cards.find(c=>c.id===1054),base=c.act;c.desc+=' 【割り切れない夜】敵HPが奇数なら追加2ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp%2!==0)x.hit(b,2)}}
{const c=cards.find(c=>c.id===1055),base=c.act;c.desc+=' 【二枚目の遺書】手札が2枚以下なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hand.length<=2)a.block+=3}}
{const c=cards.find(c=>c.id===1056),base=c.act;c.desc+=' 【反証の灯台】敵HPが自分より高ければ因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp>a.hp)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1057),base=c.act;c.desc+=' 【手札の葬列】手札が空なら防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.hand.length===0)a.block+=5}}
{const c=cards.find(c=>c.id===1058),base=c.act;c.desc+=' 【三手目の噂】このターン2枚以上使用済みなら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.cardsPlayed>=2)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1059),base=c.act;c.desc+=' 【裸の王冠】敵の防御が0なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.block===0)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1060),base=c.act;c.desc+=' 【片肺の国境】自分のHPが30以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<=30)a.block+=4}}
{const c=cards.find(c=>c.id===1061),base=c.act;c.desc+=' 【無因の果実】因果が0なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate===0)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1062),base=c.act;c.desc+=' 【初手の墓標】ターン最初のカードなら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.cardsPlayed===0)a.block+=4}}
{const c=cards.find(c=>c.id===1063),base=c.act;c.desc+=' 【余剰の因果】因果が6以上なら防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate>=6)a.block+=5}}
{const c=cards.find(c=>c.id===1064),base=c.act;c.desc+=' 【余震の証人】敵の防御を追加で2削る。';c.act=(a,b,x)=>{base(a,b,x);b.block=Math.max(0,b.block-2)}}
{const c=cards.find(c=>c.id===1065),base=c.act;c.desc+=' 【余命の前払い】敵HPが30以下なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp<=30)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1066),base=c.act;c.desc+=' 【防壁の利息】防御が10以上なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.block>=10)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1067),base=c.act;c.desc+=' 【底の抜けた山札】山札が5枚以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.deck.length<=5)a.block+=4}}
{const c=cards.find(c=>c.id===1068),base=c.act;c.desc+=' 【因果の端数】因果が3以下なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate<=3)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1069),base=c.act;c.desc+=' 【偶数の傷跡】因果が偶数なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate%2===0)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1070),base=c.act;c.desc+=' 【残額の祈り】HPが15以下ならHP2回復。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<=15)a.hp=Math.min(a.maxHp,a.hp+2)}}
{const c=cards.find(c=>c.id===1071),base=c.act;c.desc+=' 【割り切れない夜】敵HPが奇数なら追加2ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp%2!==0)x.hit(b,2)}}
{const c=cards.find(c=>c.id===1072),base=c.act;c.desc+=' 【二枚目の遺書】手札が2枚以下なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hand.length<=2)a.block+=3}}
{const c=cards.find(c=>c.id===1073),base=c.act;c.desc+=' 【反証の灯台】敵HPが自分より高ければ因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp>a.hp)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1074),base=c.act;c.desc+=' 【手札の葬列】手札が空なら防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.hand.length===0)a.block+=5}}
{const c=cards.find(c=>c.id===1075),base=c.act;c.desc+=' 【三手目の噂】このターン2枚以上使用済みなら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.cardsPlayed>=2)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1076),base=c.act;c.desc+=' 【裸の王冠】敵の防御が0なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.block===0)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1077),base=c.act;c.desc+=' 【逆さの領収書】敵の因果が2以上なら1奪う。';c.act=(a,b,x)=>{base(a,b,x);if(b.fate>=2){b.fate--;a.fate=Math.min(12,a.fate+1)}}}
{const c=cards.find(c=>c.id===1078),base=c.act;c.desc+=' 【後手の勲章】自分のHPが敵より低ければ防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<b.hp)a.block+=5}}
{const c=cards.find(c=>c.id===1079),base=c.act;c.desc+=' 【破れた契約】敵の防御が5以上なら追加で3削る。';c.act=(a,b,x)=>{base(a,b,x);if(b.block>=5)b.block-=3}}
{const c=cards.find(c=>c.id===1080),base=c.act;c.desc+=' 【守られた傷】自分に防御があればHP1回復。';c.act=(a,b,x)=>{base(a,b,x);if(a.block>0)a.hp=Math.min(a.maxHp,a.hp+1)}}
{const c=cards.find(c=>c.id===1081),base=c.act;c.desc+=' 【決着の余熱】敵HPが15以下なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp<=15)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1082),base=c.act;c.desc+=' 【奇数の恩赦】因果が奇数なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate%2===1)a.block+=4}}
{const c=cards.find(c=>c.id===1083),base=c.act;c.desc+=' 【不均衡の判決】敵の因果が自分より多ければ因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.fate>a.fate)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1084),base=c.act;c.desc+=' 【空席の証人】敵の手札が3枚以下なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.hand.length<=3)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1085),base=c.act;c.desc+=' 【薄い城壁】防御が5以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.block<=5)a.block+=4}}
{const c=cards.find(c=>c.id===1086),base=c.act;c.desc+=' 【失効した盾】自分の防御が0なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.block===0)a.block+=3}}
{const c=cards.find(c=>c.id===1087),base=c.act;c.desc+=' 【露出した心臓】敵の防御が0なら追加2ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.block===0)x.hit(b,2)}}
{const c=cards.find(c=>c.id===1088),base=c.act;c.desc+=' 【半身の証明】自分のHPが偶数なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp%2===0)a.block+=3}}
{const c=cards.find(c=>c.id===1089),base=c.act;c.desc+=' 【勝者の保険】自分のHPが敵以上なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp>=b.hp)a.block+=3}}
{const c=cards.find(c=>c.id===1090),base=c.act;c.desc+=' 【反証の灯台】敵HPが自分より高ければ因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp>a.hp)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1091),base=c.act;c.desc+=' 【手札の葬列】手札が空なら防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.hand.length===0)a.block+=5}}
{const c=cards.find(c=>c.id===1092),base=c.act;c.desc+=' 【三手目の噂】このターン2枚以上使用済みなら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.cardsPlayed>=2)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1093),base=c.act;c.desc+=' 【裸の王冠】敵の防御が0なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.block===0)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1094),base=c.act;c.desc+=' 【逆さの領収書】敵の因果が2以上なら1奪う。';c.act=(a,b,x)=>{base(a,b,x);if(b.fate>=2){b.fate--;a.fate=Math.min(12,a.fate+1)}}}
{const c=cards.find(c=>c.id===1095),base=c.act;c.desc+=' 【後手の勲章】自分のHPが敵より低ければ防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<b.hp)a.block+=5}}
{const c=cards.find(c=>c.id===1096),base=c.act;c.desc+=' 【破れた契約】敵の防御が5以上なら追加で3削る。';c.act=(a,b,x)=>{base(a,b,x);if(b.block>=5)b.block-=3}}
{const c=cards.find(c=>c.id===1097),base=c.act;c.desc+=' 【守られた傷】自分に防御があればHP1回復。';c.act=(a,b,x)=>{base(a,b,x);if(a.block>0)a.hp=Math.min(a.maxHp,a.hp+1)}}
{const c=cards.find(c=>c.id===1098),base=c.act;c.desc+=' 【決着の余熱】敵HPが15以下なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp<=15)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1099),base=c.act;c.desc+=' 【奇数の恩赦】因果が奇数なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate%2===1)a.block+=4}}
{const c=cards.find(c=>c.id===1100),base=c.act;c.desc+=' 【不均衡の判決】敵の因果が自分より多ければ因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.fate>a.fate)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1101),base=c.act;c.desc+=' 【空席の証人】敵の手札が3枚以下なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(b.hand.length<=3)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1102),base=c.act;c.desc+=' 【薄い城壁】防御が5以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.block<=5)a.block+=4}}
{const c=cards.find(c=>c.id===1103),base=c.act;c.desc+=' 【失効した盾】自分の防御が0なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.block===0)a.block+=3}}
{const c=cards.find(c=>c.id===1104),base=c.act;c.desc+=' 【露出した心臓】敵の防御が0なら追加2ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.block===0)x.hit(b,2)}}
{const c=cards.find(c=>c.id===1105),base=c.act;c.desc+=' 【半身の証明】自分のHPが偶数なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp%2===0)a.block+=3}}
{const c=cards.find(c=>c.id===1106),base=c.act;c.desc+=' 【勝者の保険】自分のHPが敵以上なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp>=b.hp)a.block+=3}}
{const c=cards.find(c=>c.id===1107),base=c.act;c.desc+=' 【片肺の国境】自分のHPが30以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<=30)a.block+=4}}
{const c=cards.find(c=>c.id===1108),base=c.act;c.desc+=' 【無因の果実】因果が0なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate===0)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1109),base=c.act;c.desc+=' 【初手の墓標】ターン最初のカードなら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.cardsPlayed===0)a.block+=4}}
{const c=cards.find(c=>c.id===1110),base=c.act;c.desc+=' 【余剰の因果】因果が6以上なら防御+5。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate>=6)a.block+=5}}
{const c=cards.find(c=>c.id===1111),base=c.act;c.desc+=' 【余震の証人】敵の防御を追加で2削る。';c.act=(a,b,x)=>{base(a,b,x);b.block=Math.max(0,b.block-2)}}
{const c=cards.find(c=>c.id===1112),base=c.act;c.desc+=' 【余命の前払い】敵HPが30以下なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp<=30)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1113),base=c.act;c.desc+=' 【防壁の利息】防御が10以上なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.block>=10)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1114),base=c.act;c.desc+=' 【底の抜けた山札】山札が5枚以下なら防御+4。';c.act=(a,b,x)=>{base(a,b,x);if(a.deck.length<=5)a.block+=4}}
{const c=cards.find(c=>c.id===1115),base=c.act;c.desc+=' 【因果の端数】因果が3以下なら因果+1。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate<=3)a.fate=Math.min(12,a.fate+1)}}
{const c=cards.find(c=>c.id===1116),base=c.act;c.desc+=' 【偶数の傷跡】因果が偶数なら追加3ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(a.fate%2===0)x.hit(b,3)}}
{const c=cards.find(c=>c.id===1117),base=c.act;c.desc+=' 【残額の祈り】HPが15以下ならHP2回復。';c.act=(a,b,x)=>{base(a,b,x);if(a.hp<=15)a.hp=Math.min(a.maxHp,a.hp+2)}}
{const c=cards.find(c=>c.id===1118),base=c.act;c.desc+=' 【割り切れない夜】敵HPが奇数なら追加2ダメージ。';c.act=(a,b,x)=>{base(a,b,x);if(b.hp%2!==0)x.hit(b,2)}}
{const c=cards.find(c=>c.id===1119),base=c.act;c.desc+=' 【二枚目の遺書】手札が2枚以下なら防御+3。';c.act=(a,b,x)=>{base(a,b,x);if(a.hand.length<=2)a.block+=3}}

/* 120 individually authored PvP mechanics; overrides prior draft effects. */
{const c=cards.find(v=>v.id===1000);c.desc="防御を半分にし、失わせた防御と同じダメージ";c.act=(a,b,x)=>{const n=Math.ceil(b.block/2);b.block-=n;x.hit(b,n)}}
{const c=cards.find(v=>v.id===1001);c.desc="相手の防御が0なら7ダメージ、あれば防御を全消去";c.act=(a,b,x)=>{if(b.block===0)x.hit(b,7);else b.block=0}}
{const c=cards.find(v=>v.id===1002);c.desc="敵の防御を3削り、削れなければ因果を2奪う";c.act=(a,b,x)=>{if(b.block){b.block=Math.max(0,b.block-3)}else{const n=Math.min(2,b.fate);b.fate-=n;a.fate+=n}}}
{const c=cards.find(v=>v.id===1003);c.desc="敵に6ダメージ。相手の手札が5枚以上なら追加4";c.act=(a,b,x)=>{x.hit(b,6+(b.hand.length>=5?4:0))}}
{const c=cards.find(v=>v.id===1004);c.desc="相手の因果を1削り、因果が0になれば10ダメージ";c.act=(a,b,x)=>{b.fate=Math.max(0,b.fate-1);if(b.fate===0)x.hit(b,10)}}
{const c=cards.find(v=>v.id===1005);c.desc="敵に8ダメージ。敵の防御が残れば自分に防御6";c.act=(a,b,x)=>{x.hit(b,8);if(b.block>0)a.block+=6}}
{const c=cards.find(v=>v.id===1006);c.desc="敵に9ダメージ。自分の防御が0なら因果+2";c.act=(a,b,x)=>{x.hit(b,9);if(a.block===0)a.fate+=2}}
{const c=cards.find(v=>v.id===1007);c.desc="敵に5ダメージを2回。2撃ともHPに通れば因果+1";c.act=(a,b,x)=>{const z=x.hit(b,5),w=x.hit(b,5);if(z.dealt&&w.dealt)a.fate++}}
{const c=cards.find(v=>v.id===1008);c.desc="相手の因果を最大3消費させ、消費量×4ダメージ";c.act=(a,b,x)=>{const n=Math.min(3,b.fate);b.fate-=n;x.hit(b,n*4)}}
{const c=cards.find(v=>v.id===1009);c.desc="敵に12ダメージ。相手の防御が10以上なら防御を追加で8削る";c.act=(a,b,x)=>{x.hit(b,12);if(b.block>=10)b.block-=8}}
{const c=cards.find(v=>v.id===1010);c.desc="敵に7ダメージ。敵のHPが偶数ならもう一度4ダメージ";c.act=(a,b,x)=>{x.hit(b,7);if(b.hp%2===0)x.hit(b,4)}}
{const c=cards.find(v=>v.id===1011);c.desc="敵に11ダメージ。相手の因果が自分より多ければ因果を2奪う";c.act=(a,b,x)=>{x.hit(b,11);if(b.fate>a.fate){const n=Math.min(2,b.fate);b.fate-=n;a.fate+=n}}}
{const c=cards.find(v=>v.id===1012);c.desc="敵の防御を5削る。残った防御が0なら15ダメージ";c.act=(a,b,x)=>{b.block=Math.max(0,b.block-5);if(b.block===0)x.hit(b,15)}}
{const c=cards.find(v=>v.id===1013);c.desc="敵に13ダメージ。自分のHPが低ければ自分の防御+7";c.act=(a,b,x)=>{x.hit(b,13);if(a.hp<b.hp)a.block+=7}}
{const c=cards.find(v=>v.id===1014);c.desc="敵に9ダメージ。相手の因果が0なら追加9ダメージ";c.act=(a,b,x)=>{x.hit(b,9+(b.fate===0?9:0))}}
{const c=cards.find(v=>v.id===1015);c.desc="敵に12ダメージ。自分の防御を最大8消費し、消費量×2追加";c.act=(a,b,x)=>{const n=Math.min(8,a.block);a.block-=n;x.hit(b,12+n*2)}}
{const c=cards.find(v=>v.id===1016);c.desc="敵に10ダメージ。相手の防御が0なら因果+3";c.act=(a,b,x)=>{x.hit(b,10);if(b.block===0)a.fate+=3}}
{const c=cards.find(v=>v.id===1017);c.desc="敵に15ダメージ。相手の防御が残れば因果を2削る";c.act=(a,b,x)=>{x.hit(b,15);if(b.block>0)b.fate=Math.max(0,b.fate-2)}}
{const c=cards.find(v=>v.id===1018);c.desc="敵に8ダメージを3回。自分の防御を0にする";c.act=(a,b,x)=>{a.block=0;for(let i=0;i<3;i++)x.hit(b,8)}}
{const c=cards.find(v=>v.id===1019);c.desc="敵に18ダメージ。自分の因果を2消費できなければHP3を失う";c.act=(a,b,x)=>{if(a.fate>=2)a.fate-=2;else a.hp-=3;x.hit(b,18)}}
{const c=cards.find(v=>v.id===1020);c.desc="敵の防御を全消去。消した防御の半分だけ自分に防御を得る";c.act=(a,b,x)=>{const n=b.block;b.block=0;a.block+=Math.floor(n/2)}}
{const c=cards.find(v=>v.id===1021);c.desc="敵に16ダメージ。相手の手札が2枚以下なら追加8";c.act=(a,b,x)=>{x.hit(b,16+(b.hand.length<=2?8:0))}}
{const c=cards.find(v=>v.id===1022);c.desc="敵に20ダメージ。自分の防御が10以上なら半分消費し追加10";c.act=(a,b,x)=>{const z=a.block>=10;a.block=z?Math.floor(a.block/2):a.block;x.hit(b,20+(z?10:0))}}
{const c=cards.find(v=>v.id===1023);c.desc="敵に14ダメージ。相手の因果を2削り、削った分だけ防御+5";c.act=(a,b,x)=>{const n=Math.min(2,b.fate);b.fate-=n;x.hit(b,14);a.block+=n*5}}
{const c=cards.find(v=>v.id===1024);c.desc="敵に22ダメージ。相手の防御が0なら自分の因果を1失う";c.act=(a,b,x)=>{x.hit(b,22);if(b.block===0)a.fate=Math.max(0,a.fate-1)}}
{const c=cards.find(v=>v.id===1025);c.desc="敵に18ダメージ。相手のHPが自分以上なら追加12";c.act=(a,b,x)=>{x.hit(b,18+(b.hp>=a.hp?12:0))}}
{const c=cards.find(v=>v.id===1026);c.desc="敵に11ダメージを2回。相手の防御が残れば3撃目";c.act=(a,b,x)=>{x.hit(b,11);x.hit(b,11);if(b.block>0)x.hit(b,7)}}
{const c=cards.find(v=>v.id===1027);c.desc="敵に26ダメージ。自分の防御を全消費し、消費10以上なら因果+3";c.act=(a,b,x)=>{const n=a.block;a.block=0;x.hit(b,26);if(n>=10)a.fate+=3}}
{const c=cards.find(v=>v.id===1028);c.desc="敵に15ダメージ。相手の因果を全消費し、消費3以上なら追加15";c.act=(a,b,x)=>{const n=b.fate;b.fate=0;x.hit(b,15+(n>=3?15:0))}}
{const c=cards.find(v=>v.id===1029);c.desc="敵に32ダメージ。相手の防御が残ればその防御を自分へ移す";c.act=(a,b,x)=>{x.hit(b,32);if(b.block>0){a.block+=b.block;b.block=0}}}
{const c=cards.find(v=>v.id===1030);c.desc="防御5。相手の防御が自分より高ければさらに防御5";c.act=(a,b,x)=>{a.block+=5;if(b.block>a.block)a.block+=5}}
{const c=cards.find(v=>v.id===1031);c.desc="防御4。相手の因果が4以上なら因果を1奪う";c.act=(a,b,x)=>{a.block+=4;if(b.fate>=4){b.fate--;a.fate++}}}
{const c=cards.find(v=>v.id===1032);c.desc="防御8。自分のHPが奇数ならHP1回復";c.act=(a,b,x)=>{a.block+=8;if(a.hp%2)a.hp=Math.min(a.maxHp,a.hp+1)}}
{const c=cards.find(v=>v.id===1033);c.desc="防御6。相手の手札が5枚以上なら防御+5";c.act=(a,b,x)=>{a.block+=6+(b.hand.length>=5?5:0)}}
{const c=cards.find(v=>v.id===1034);c.desc="防御10。敵の防御が0なら敵に4ダメージ";c.act=(a,b,x)=>{a.block+=10;if(b.block===0)x.hit(b,4)}}
{const c=cards.find(v=>v.id===1035);c.desc="防御7。自分の防御が15以上になれば因果+2";c.act=(a,b,x)=>{a.block+=7;if(a.block>=15)a.fate+=2}}
{const c=cards.find(v=>v.id===1036);c.desc="防御9。敵HPが自分より低ければ敵に6ダメージ";c.act=(a,b,x)=>{a.block+=9;if(b.hp<a.hp)x.hit(b,6)}}
{const c=cards.find(v=>v.id===1037);c.desc="防御5。自分の防御を半分消費して同量のHP回復（最大5）";c.act=(a,b,x)=>{a.block+=5;const n=Math.min(5,Math.floor(a.block/2));a.block-=n;a.hp=Math.min(a.maxHp,a.hp+n)}}
{const c=cards.find(v=>v.id===1038);c.desc="防御12。自分の手札が1枚以下なら1枚引く";c.act=(a,b,x)=>{a.block+=12;if(a.hand.length<=1)x.draw(a,1)}}
{const c=cards.find(v=>v.id===1039);c.desc="防御8。敵の因果を1削り、削れなければ防御+5";c.act=(a,b,x)=>{a.block+=8;if(b.fate)b.fate--;else a.block+=5}}
{const c=cards.find(v=>v.id===1040);c.desc="敵に6ダメージ。実際に与えたHPダメージ分だけ防御獲得（最大8）";c.act=(a,b,x)=>{const z=x.hit(b,6);a.block+=Math.min(8,z.dealt)}}
{const c=cards.find(v=>v.id===1041);c.desc="防御14。自分のHPが30以下なら敵に5ダメージ";c.act=(a,b,x)=>{a.block+=14;if(a.hp<=30)x.hit(b,5)}}
{const c=cards.find(v=>v.id===1042);c.desc="防御11。相手の防御が5以上なら自分の防御+7";c.act=(a,b,x)=>{a.block+=11;if(b.block>=5)a.block+=7}}
{const c=cards.find(v=>v.id===1043);c.desc="防御6。因果を最大2消費し、消費量×6防御追加";c.act=(a,b,x)=>{a.block+=6;const n=Math.min(2,a.fate);a.fate-=n;a.block+=n*6}}
{const c=cards.find(v=>v.id===1044);c.desc="防御16。敵の因果が0ならHP3回復";c.act=(a,b,x)=>{a.block+=16;if(b.fate===0)a.hp=Math.min(a.maxHp,a.hp+3)}}
{const c=cards.find(v=>v.id===1045);c.desc="防御8。防御が20以上になれば敵に10ダメージ";c.act=(a,b,x)=>{a.block+=8;if(a.block>=20)x.hit(b,10)}}
{const c=cards.find(v=>v.id===1046);c.desc="防御10。自分の防御を5消費し敵に14ダメージ（不足なら攻撃なし）";c.act=(a,b,x)=>{a.block+=10;if(a.block>=5){a.block-=5;x.hit(b,14)}}}
{const c=cards.find(v=>v.id===1047);c.desc="防御13。敵HPが自分より高ければ因果+2";c.act=(a,b,x)=>{a.block+=13;if(b.hp>a.hp)a.fate+=2}}
{const c=cards.find(v=>v.id===1048);c.desc="防御15。相手の防御を最大6削り、その分を自分の防御へ";c.act=(a,b,x)=>{const n=Math.min(6,b.block);b.block-=n;a.block+=15+n}}
{const c=cards.find(v=>v.id===1049);c.desc="防御12。自分の防御が25以上ならHP5回復";c.act=(a,b,x)=>{a.block+=12;if(a.block>=25)a.hp=Math.min(a.maxHp,a.hp+5)}}
{const c=cards.find(v=>v.id===1050);c.desc="防御18。敵の因果が自分より多ければ敵に8ダメージ";c.act=(a,b,x)=>{a.block+=18;if(b.fate>a.fate)x.hit(b,8)}}
{const c=cards.find(v=>v.id===1051);c.desc="防御9。敵に自分の防御の3分の1ダメージ（最大12）";c.act=(a,b,x)=>{a.block+=9;x.hit(b,Math.min(12,Math.floor(a.block/3)))}}
{const c=cards.find(v=>v.id===1052);c.desc="防御16。自分のHPが20以下ならさらに防御10";c.act=(a,b,x)=>{a.block+=16;if(a.hp<=20)a.block+=10}}
{const c=cards.find(v=>v.id===1053);c.desc="防御14。相手の手札が2枚以下なら因果+3";c.act=(a,b,x)=>{a.block+=14;if(b.hand.length<=2)a.fate+=3}}
{const c=cards.find(v=>v.id===1054);c.desc="防御20。因果を1消費できればHP4回復";c.act=(a,b,x)=>{a.block+=20;if(a.fate){a.fate--;a.hp=Math.min(a.maxHp,a.hp+4)}}}
{const c=cards.find(v=>v.id===1055);c.desc="防御11。自分の防御が30以上なら敵の因果を3削る";c.act=(a,b,x)=>{a.block+=11;if(a.block>=30)b.fate=Math.max(0,b.fate-3)}}
{const c=cards.find(v=>v.id===1056);c.desc="防御17。自分の防御の半分を失い、失った量だけ敵にダメージ";c.act=(a,b,x)=>{a.block+=17;const n=Math.floor(a.block/2);a.block-=n;x.hit(b,n)}}
{const c=cards.find(v=>v.id===1057);c.desc="防御22。相手の防御が0なら敵に9ダメージ";c.act=(a,b,x)=>{a.block+=22;if(b.block===0)x.hit(b,9)}}
{const c=cards.find(v=>v.id===1058);c.desc="防御19。自分のHPが敵より低ければHP6回復";c.act=(a,b,x)=>{a.block+=19;if(a.hp<b.hp)a.hp=Math.min(a.maxHp,a.hp+6)}}
{const c=cards.find(v=>v.id===1059);c.desc="防御28。自分の防御が40以上なら因果+4";c.act=(a,b,x)=>{a.block+=28;if(a.block>=40)a.fate+=4}}
{const c=cards.find(v=>v.id===1060);c.desc="因果+1。敵の因果が0なら敵に5ダメージ";c.act=(a,b,x)=>{a.fate++;if(!b.fate)x.hit(b,5)}}
{const c=cards.find(v=>v.id===1061);c.desc="因果+1。自分の防御が0なら防御4";c.act=(a,b,x)=>{a.fate++;if(!a.block)a.block+=4}}
{const c=cards.find(v=>v.id===1062);c.desc="因果+2。自分の因果が偶数になれば敵に6ダメージ";c.act=(a,b,x)=>{a.fate+=2;if(a.fate%2===0)x.hit(b,6)}}
{const c=cards.find(v=>v.id===1063);c.desc="因果+1。相手の因果が自分より多ければ1奪う";c.act=(a,b,x)=>{a.fate++;if(b.fate>a.fate){b.fate--;a.fate++}}}
{const c=cards.find(v=>v.id===1064);c.desc="因果+2。敵の防御が0なら追加5ダメージ";c.act=(a,b,x)=>{a.fate+=2;if(b.block===0)x.hit(b,5)}}
{const c=cards.find(v=>v.id===1065);c.desc="因果を最大2消費し、消費量×7ダメージ。消費0なら防御5";c.act=(a,b,x)=>{const n=Math.min(2,a.fate);a.fate-=n;if(n)x.hit(b,n*7);else a.block+=5}}
{const c=cards.find(v=>v.id===1066);c.desc="敵に8ダメージ。自分の因果が3以下なら因果+2";c.act=(a,b,x)=>{x.hit(b,8);if(a.fate<=3)a.fate+=2}}
{const c=cards.find(v=>v.id===1067);c.desc="因果を1消費し、敵の防御をすべて削る。消費できなければ因果+1";c.act=(a,b,x)=>{if(a.fate){a.fate--;b.block=0}else a.fate++}}
{const c=cards.find(v=>v.id===1068);c.desc="敵に10ダメージ。敵の因果が奇数なら1奪う";c.act=(a,b,x)=>{x.hit(b,10);if(b.fate%2){b.fate--;a.fate++}}}
{const c=cards.find(v=>v.id===1069);c.desc="因果を最大3消費し、消費量×6ダメージ。消費3なら1枚引く";c.act=(a,b,x)=>{const n=Math.min(3,a.fate);a.fate-=n;x.hit(b,n*6);if(n===3)x.draw(a,1)}}
{const c=cards.find(v=>v.id===1070);c.desc="敵に6ダメージ。自分の手札が2枚以下なら1枚引く";c.act=(a,b,x)=>{x.hit(b,6);if(a.hand.length<=2)x.draw(a,1)}}
{const c=cards.find(v=>v.id===1071);c.desc="因果+1。自分の山札が5枚以下なら1枚引く";c.act=(a,b,x)=>{a.fate++;if(a.deck.length<=5)x.draw(a,1)}}
{const c=cards.find(v=>v.id===1072);c.desc="敵に9ダメージ。自分の因果が5以上なら防御8";c.act=(a,b,x)=>{x.hit(b,9);if(a.fate>=5)a.block+=8}}
{const c=cards.find(v=>v.id===1073);c.desc="因果を1消費して2枚引く。消費できなければ防御8";c.act=(a,b,x)=>{if(a.fate){a.fate--;x.draw(a,2)}else a.block+=8}}
{const c=cards.find(v=>v.id===1074);c.desc="敵に12ダメージ。相手の因果が0なら1枚引く";c.act=(a,b,x)=>{x.hit(b,12);if(b.fate===0)x.draw(a,1)}}
{const c=cards.find(v=>v.id===1075);c.desc="防御9。自分の因果が偶数なら因果+2";c.act=(a,b,x)=>{a.block+=9;if(a.fate%2===0)a.fate+=2}}
{const c=cards.find(v=>v.id===1076);c.desc="因果を最大2消費し、消費量×8防御獲得";c.act=(a,b,x)=>{const n=Math.min(2,a.fate);a.fate-=n;a.block+=n*8}}
{const c=cards.find(v=>v.id===1077);c.desc="防御12。相手の因果が3以上なら因果を2奪う";c.act=(a,b,x)=>{a.block+=12;if(b.fate>=3){b.fate-=2;a.fate+=2}}}
{const c=cards.find(v=>v.id===1078);c.desc="防御10。自分の因果が6以上ならHP3回復";c.act=(a,b,x)=>{a.block+=10;if(a.fate>=6)a.hp=Math.min(a.maxHp,a.hp+3)}}
{const c=cards.find(v=>v.id===1079);c.desc="因果+2。相手の防御が10以上なら防御+12";c.act=(a,b,x)=>{a.fate+=2;if(b.block>=10)a.block+=12}}
{const c=cards.find(v=>v.id===1080);c.desc="敵に13ダメージ。相手の因果を最大2削り、削った数だけ因果獲得";c.act=(a,b,x)=>{x.hit(b,13);const n=Math.min(2,b.fate);b.fate-=n;a.fate+=n}}
{const c=cards.find(v=>v.id===1081);c.desc="敵に11ダメージ。敵の因果が0なら防御12";c.act=(a,b,x)=>{x.hit(b,11);if(!b.fate)a.block+=12}}
{const c=cards.find(v=>v.id===1082);c.desc="因果を最大3消費し、消費量×7ダメージと消費量×2防御";c.act=(a,b,x)=>{const n=Math.min(3,a.fate);a.fate-=n;x.hit(b,n*7);a.block+=n*2}}
{const c=cards.find(v=>v.id===1083);c.desc="敵に15ダメージ。自分の因果が相手より低ければ因果+3";c.act=(a,b,x)=>{x.hit(b,15);if(a.fate<b.fate)a.fate+=3}}
{const c=cards.find(v=>v.id===1084);c.desc="敵に16ダメージ。相手の因果が2以上なら因果を2奪う";c.act=(a,b,x)=>{x.hit(b,16);if(b.fate>=2){b.fate-=2;a.fate+=2}}}
{const c=cards.find(v=>v.id===1085);c.desc="敵に12ダメージ。自分の因果が奇数なら追加10";c.act=(a,b,x)=>{x.hit(b,12+(a.fate%2?10:0))}}
{const c=cards.find(v=>v.id===1086);c.desc="因果を最大4消費し、消費量×8ダメージ";c.act=(a,b,x)=>{const n=Math.min(4,a.fate);a.fate-=n;x.hit(b,n*8)}}
{const c=cards.find(v=>v.id===1087);c.desc="敵に18ダメージ。相手の因果が自分より多ければ防御+15";c.act=(a,b,x)=>{x.hit(b,18);if(b.fate>a.fate)a.block+=15}}
{const c=cards.find(v=>v.id===1088);c.desc="因果を2消費し、敵に30ダメージ。足りなければ因果+2";c.act=(a,b,x)=>{if(a.fate>=2){a.fate-=2;x.hit(b,30)}else a.fate+=2}}
{const c=cards.find(v=>v.id===1089);c.desc="因果を最大6消費し、消費量×7ダメージ。消費6ならHP5回復";c.act=(a,b,x)=>{const n=Math.min(6,a.fate);a.fate-=n;x.hit(b,n*7);if(n===6)a.hp=Math.min(a.maxHp,a.hp+5)}}
{const c=cards.find(v=>v.id===1090);c.desc="HP1を失い、敵に6ダメージ。HP30以下なら因果+1";c.act=(a,b,x)=>{a.hp--;x.hit(b,6);if(a.hp<=30)a.fate++}}
{const c=cards.find(v=>v.id===1091);c.desc="HP2を失い、敵に8ダメージ。自分の防御が0なら防御3";c.act=(a,b,x)=>{a.hp-=2;x.hit(b,8);if(!a.block)a.block+=3}}
{const c=cards.find(v=>v.id===1092);c.desc="HP2を失い、敵に11ダメージ。HP20以下なら追加5";c.act=(a,b,x)=>{a.hp-=2;x.hit(b,11+(a.hp<=20?5:0))}}
{const c=cards.find(v=>v.id===1093);c.desc="HP3を失い、敵に13ダメージ。相手のHPが自分以上なら因果+2";c.act=(a,b,x)=>{a.hp-=3;x.hit(b,13);if(b.hp>=a.hp)a.fate+=2}}
{const c=cards.find(v=>v.id===1094);c.desc="HP4を失い、敵に17ダメージ。HP10以下ならHP3回復";c.act=(a,b,x)=>{a.hp-=4;x.hit(b,17);if(a.hp<=10)a.hp=Math.min(a.maxHp,a.hp+3)}}
{const c=cards.find(v=>v.id===1095);c.desc="敵に9ダメージ。自分のHPが敵より低ければHP2回復";c.act=(a,b,x)=>{x.hit(b,9);if(a.hp<b.hp)a.hp=Math.min(a.maxHp,a.hp+2)}}
{const c=cards.find(v=>v.id===1096);c.desc="HP2を失い、敵に12ダメージ。敵の防御が残れば防御を5削る";c.act=(a,b,x)=>{a.hp-=2;x.hit(b,12);if(b.block)b.block=Math.max(0,b.block-5)}}
{const c=cards.find(v=>v.id===1097);c.desc="敵に11ダメージ。自分のHPが半分以下なら因果+2";c.act=(a,b,x)=>{x.hit(b,11);if(a.hp<=30)a.fate+=2}}
{const c=cards.find(v=>v.id===1098);c.desc="HP3を失い、敵に16ダメージ。HPが敵より低ければ防御8";c.act=(a,b,x)=>{a.hp-=3;x.hit(b,16);if(a.hp<b.hp)a.block+=8}}
{const c=cards.find(v=>v.id===1099);c.desc="敵に14ダメージ。敵HPが自分より低ければHP3回復";c.act=(a,b,x)=>{x.hit(b,14);if(b.hp<a.hp)a.hp=Math.min(a.maxHp,a.hp+3)}}
{const c=cards.find(v=>v.id===1100);c.desc="自分の防御を最大5消費し、消費量×3ダメージ。消費0ならHP2を失い8ダメージ";c.act=(a,b,x)=>{const n=Math.min(5,a.block);a.block-=n;if(n)x.hit(b,n*3);else{a.hp-=2;x.hit(b,8)}}}
{const c=cards.find(v=>v.id===1101);c.desc="HP2を失い、防御12。HP20以下なら敵に9ダメージ";c.act=(a,b,x)=>{a.hp-=2;a.block+=12;if(a.hp<=20)x.hit(b,9)}}
{const c=cards.find(v=>v.id===1102);c.desc="HP3を失い、敵に18ダメージ。自分の防御をすべて消費し追加最大8";c.act=(a,b,x)=>{a.hp-=3;const n=Math.min(8,a.block);a.block=0;x.hit(b,18+n)}}
{const c=cards.find(v=>v.id===1103);c.desc="敵に15ダメージ。自分のHPが15以下ならHP5回復";c.act=(a,b,x)=>{x.hit(b,15);if(a.hp<=15)a.hp=Math.min(a.maxHp,a.hp+5)}}
{const c=cards.find(v=>v.id===1104);c.desc="HP4を失い、敵に20ダメージ。相手の因果を1削る";c.act=(a,b,x)=>{a.hp-=4;x.hit(b,20);b.fate=Math.max(0,b.fate-1)}}
{const c=cards.find(v=>v.id===1105);c.desc="HP3を失い、敵に14ダメージ。実際に与えたHPダメージの半分を回復（最大7）";c.act=(a,b,x)=>{a.hp-=3;const n=x.hit(b,14).dealt;a.hp=Math.min(a.maxHp,a.hp+Math.min(7,Math.floor(n/2)))}}
{const c=cards.find(v=>v.id===1106);c.desc="HP5を失い、敵に22ダメージ。敵の防御が0ならHP4回復";c.act=(a,b,x)=>{a.hp-=5;x.hit(b,22);if(!b.block)a.hp=Math.min(a.maxHp,a.hp+4)}}
{const c=cards.find(v=>v.id===1107);c.desc="HP2を失い、敵に10ダメージを2回。両方HPに通ればHP3回復";c.act=(a,b,x)=>{a.hp-=2;const n=x.hit(b,10).dealt,m=x.hit(b,10).dealt;if(n&&m)a.hp=Math.min(a.maxHp,a.hp+3)}}
{const c=cards.find(v=>v.id===1108);c.desc="HP4を失い、防御15。自分のHPが敵より低ければ因果+3";c.act=(a,b,x)=>{a.hp-=4;a.block+=15;if(a.hp<b.hp)a.fate+=3}}
{const c=cards.find(v=>v.id===1109);c.desc="HP6を失い、敵に25ダメージ。敵のHPが20以下ならHP5回復";c.act=(a,b,x)=>{a.hp-=6;x.hit(b,25);if(b.hp<=20)a.hp=Math.min(a.maxHp,a.hp+5)}}
{const c=cards.find(v=>v.id===1110);c.desc="HP2を失い、敵に16ダメージ。手札が1枚以下なら1枚引く";c.act=(a,b,x)=>{a.hp-=2;x.hit(b,16);if(a.hand.length<=1)x.draw(a,1)}}
{const c=cards.find(v=>v.id===1111);c.desc="HP3を失い、敵に18ダメージ。山札が3枚以下なら因果+3";c.act=(a,b,x)=>{a.hp-=3;x.hit(b,18);if(a.deck.length<=3)a.fate+=3}}
{const c=cards.find(v=>v.id===1112);c.desc="HP4を失い、敵に21ダメージ。敵の防御があれば自分の防御+10";c.act=(a,b,x)=>{a.hp-=4;x.hit(b,21);if(b.block)a.block+=10}}
{const c=cards.find(v=>v.id===1113);c.desc="HP5を失い、敵に24ダメージ。自分の因果が4以上ならHP5回復";c.act=(a,b,x)=>{a.hp-=5;x.hit(b,24);if(a.fate>=4)a.hp=Math.min(a.maxHp,a.hp+5)}}
{const c=cards.find(v=>v.id===1114);c.desc="HP3を失い、敵に19ダメージ。自分のHPが偶数なら因果+2";c.act=(a,b,x)=>{a.hp-=3;x.hit(b,19);if(a.hp%2===0)a.fate+=2}}
{const c=cards.find(v=>v.id===1115);c.desc="敵に12ダメージを2回。自分のHPが20より高ければHP4を失う";c.act=(a,b,x)=>{x.hit(b,12);x.hit(b,12);if(a.hp>20)a.hp-=4}}
{const c=cards.find(v=>v.id===1116);c.desc="HP5を失い、敵に27ダメージ。HP10以下なら防御20";c.act=(a,b,x)=>{a.hp-=5;x.hit(b,27);if(a.hp<=10)a.block+=20}}
{const c=cards.find(v=>v.id===1117);c.desc="HP6を失い、敵に30ダメージ。敵の因果が0ならHP6回復";c.act=(a,b,x)=>{a.hp-=6;x.hit(b,30);if(!b.fate)a.hp=Math.min(a.maxHp,a.hp+6)}}
{const c=cards.find(v=>v.id===1118);c.desc="HP4を失い、敵に18ダメージを2回。自分の防御を0にする";c.act=(a,b,x)=>{a.hp-=4;a.block=0;x.hit(b,18);x.hit(b,18)}}
{const c=cards.find(v=>v.id===1119);c.desc="HP8を失い、敵に42ダメージ。倒せなければ防御15";c.act=(a,b,x)=>{a.hp-=8;x.hit(b,42);if(b.hp>0)a.block+=15}}
for(const c of cards.filter(c=>c.id>=1000&&c.id<1120)){const act=c.act;c.act=(a,b,x)=>{act(a,b,x);a.fate=Math.max(0,Math.min(12,a.fate));b.fate=Math.max(0,Math.min(12,b.fate))}}

/* PvP balance pass: class modifiers applied to each unique card action.
   All modifiers are displayed in the card description. */
const PVP_CLASS_BALANCE={
 ruin:{damage:0.91,block:1.06,heal:1},
 guard:{damage:1.05,block:1.29,heal:1.12},
 fate:{damage:1.08,block:1.08,heal:1},
 blood:{damage:0.89,block:0.98,heal:0.96}
};
for(const theme of duelThemes){
 const tune=PVP_CLASS_BALANCE[theme.id];
 for(const id of theme.cards){
  const card=cards.find(c=>c.id===id),base=card.act;
  card.act=(a,b,ctx)=>{
   const oldBlock=a.block,oldHp=a.hp;
   const adjusted={...ctx,hit:(target,amount)=>{
    const scaled=target===b?Math.max(0,Math.round(amount*tune.damage)):amount;
    return ctx.hit(target,scaled);
   }};
   base(a,b,adjusted);
   if(a.block>oldBlock)a.block=oldBlock+Math.round((a.block-oldBlock)*tune.block);
   if(a.hp>oldHp)a.hp=Math.min(a.maxHp,oldHp+Math.round((a.hp-oldHp)*tune.heal));
  };
  card.desc+=' ［職業補正：攻撃×'+tune.damage+'、防御×'+tune.block+'、回復×'+tune.heal+'（端数四捨五入）］';
 }
}
