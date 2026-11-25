import {damage,elements} from './combat.mjs';
// Gauge rate: speed points per second; 100 points per attack. Provisional timing.
export function startBattle(allies,enemies){
 if(!Array.isArray(allies)||!Array.isArray(enemies)||!allies.length||allies.length>5||!enemies.length)throw Error('invalid teams');
 const ids=new Set();const unit=u=>{if(typeof u.id!=='string'||!u.id||ids.has(u.id)||!elements.includes(u.element)||![u.hp,u.attack,u.resistance,u.speed].every(Number.isFinite)||u.hp<=0||u.attack<0||u.resistance<0||u.speed<=0||u.speed>1000)throw Error('invalid unit');ids.add(u.id);return {...u,maxHp:u.hp,period:Math.ceil(100000/u.speed),remaining:Math.ceil(100000/u.speed)};};
 return {allies:allies.map(unit),enemies:enemies.map(unit),elapsed:0,result:null};
}
export function advanceBattle(b,ms){if(!Number.isSafeInteger(ms)||ms<0)throw Error('invalid duration');while(ms>0&&!b.result){const living=[...b.allies,...b.enemies].filter(u=>u.hp>0);const dt=Math.min(ms,...living.map(u=>u.remaining));for(const u of living)u.remaining-=dt;b.elapsed+=dt;ms-=dt;
 // Stable order, allies first on ties (provisional). Dead units cannot act.
 for(const u of living){if(u.hp<=0||u.remaining!==0)continue;const opponents=b.allies.includes(u)?b.enemies:b.allies;const target=opponents.find(v=>v.hp>0);if(!target)break;const hit=damage(u.attack,1,target.resistance,u.element,target.element);const slime=b.allies.includes(target)&&target.id!=='primordial_slime'&&b.allies.find(v=>v.id==='primordial_slime'&&v.hp>0);if(slime&&hit>=target.hp){slime.hp=0;}else target.hp=Math.max(0,target.hp-hit);u.remaining=u.period;}
 if(!b.enemies.some(u=>u.hp>0))b.result='win';else if(!b.allies.some(u=>u.hp>0))b.result='loss';
 }return b;}
