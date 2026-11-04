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
  const damage=Math.max(2,3+cost*4+(tier%3));
  c.desc='防御を3削り、敵に'+damage+'ダメージ'+(cost===5?'を2回':'')+'。';
  c.act=cost===5?(a,b,ctx)=>{b.block=Math.max(0,b.block-3);ctx.hit(b,damage);ctx.hit(b,damage)}:(a,b,ctx)=>{b.block=Math.max(0,b.block-3);ctx.hit(b,damage)};
 }else if(theme.id==='guard'){
  const block=2+cost*2,damage=2+cost*3+(tier%2);
  c.desc='防御'+block+'。敵に'+damage+'ダメージ。'+(cost>=4?'HP2回復。':'');
  c.act=(a,b,ctx)=>{a.block+=block;ctx.hit(b,damage);if(cost>=4)a.hp=Math.min(a.maxHp,a.hp+2)};
 }else if(theme.id==='fate'){
  const damage=2+cost*3+(tier%2),fate=cost>=4?2:1;
  c.desc='敵に'+damage+'ダメージ。因果+'+fate+'。'+(cost>=3?'1枚引く。':'');
  c.act=(a,b,ctx)=>{ctx.hit(b,damage);a.fate+=fate;if(cost>=3)ctx.draw(a,1)};
 }else if(theme.id==='blood'){
  const damage=3+cost*5+(tier%3),loss=cost===0?1:Math.max(1,Math.ceil(cost/2));
  c.desc='HP'+loss+'を失い、敵に'+damage+'ダメージ。'+(cost>=4?'因果+1。':'');
  c.act=(a,b,ctx)=>{a.hp-=loss;ctx.hit(b,damage);if(cost>=4)a.fate++};
 }
}
