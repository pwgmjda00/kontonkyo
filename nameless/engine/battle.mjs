import {bossDefense,bossHit,bossTurn,bossAfterHit,bossEcho,bossBeforeAttack,bossPeriod} from './boss-rules.mjs';
import {skillRank} from './skills.mjs';
import {damage,affinity,elements} from './combat.mjs';
// Gauge rate: speed points per second; 100 points per attack. Provisional timing.
export function startBattle(allies,enemies){
 if(!Array.isArray(allies)||!Array.isArray(enemies)||!allies.length||allies.length>5||!enemies.length)throw Error('invalid teams');
 const ids=new Set();const unit=u=>{if(typeof u.id!=='string'||!u.id||ids.has(u.id)||!elements.includes(u.element)||![u.hp,u.attack,u.resistance,u.speed].every(Number.isFinite)||u.hp<=0||u.attack<0||u.resistance<0||u.speed<=0||u.speed>1000||(u.specialHeal!==undefined&&(!Number.isFinite(u.specialHeal)||u.specialHeal<0||u.specialHeal>u.hp)))throw Error('invalid unit');ids.add(u.id);return {...u,maxHp:u.hp,period:Math.ceil(100000/u.speed),remaining:Math.ceil(100000/u.speed)};};
 return {allies:allies.map(unit),enemies:enemies.map(unit),elapsed:0,result:null};
}
function record(b,event){if(event.kind==='guard'){const c=b.guardCounts??={};c[event.actor]=(c[event.actor]??0)+1;}(b.events??=[]).push({at:b.elapsed,...event});if(b.events.length>80)b.events.shift();}
export function advanceBattle(b,ms,state){if(!Number.isSafeInteger(ms)||ms<0)throw Error('invalid duration');while(ms>0&&!b.result){const living=[...b.allies,...b.enemies].filter(u=>u.hp>0);const dt=Math.min(ms,...living.map(u=>u.remaining));for(const u of living)u.remaining-=dt;b.elapsed+=dt;ms-=dt;
 // Stable order, allies first on ties (provisional). Dead units cannot act.
 for(const u of living){if(u.hp<=0||u.remaining!==0)continue;const opponents=b.allies.includes(u)?b.enemies:b.allies;const target=opponents.find(v=>v.hp>0);if(!target)break;if(!bossTurn(b,u)){record(b,{kind:'sleep',actor:u.id});u.remaining=bossPeriod(b,u);continue;}const beforeHp=new Map(living.map(v=>[v.id,v.hp]));const rank=(v,id)=>skillRank(v,id);const spend=(key,n)=>{if(!state||state.resources[key]<n)return false;state.resources[key]-=n;record(b,{kind:'spend',actor:u.id,resource:key,amount:n});return true;};const allies=b.allies.includes(u);const team=allies?b.allies:b.enemies;
 if(!allies&&u.specialHeal&&u.hp<u.maxHp){if(u.sealed){delete u.sealed;}else if(!u.healBlocked){u.hp=Math.min(u.maxHp,u.hp+u.specialHeal);}}
 if(u.healBlocked)u.healBlocked--;
 if(allies&&rank(u,'destroyer:0')&&target.specialHeal&&!u.sealUsed){target.sealed=true;u.sealUsed=true;}
 if(allies&&rank(u,'destroyer:2')&&target.specialHeal)target.healBlocked=Math.max(target.healBlocked??0,rank(u,'destroyer:2'));
 if(allies&&rank(u,'heretic:3')&&u.hp<u.maxHp&&spend('abyss',2))u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.05*rank(u,'heretic:3'));
 bossBeforeAttack(b,target);
 let element=u.absorbed??u.element;delete u.absorbed;
 if(rank(u,'spellblade:1'))element=elements.reduce((best,e)=>affinity(e,target.element)>affinity(best,target.element)?e:best,element);
 if(target.mark&&affinity(target.mark,target.element)>affinity(element,target.element))element=target.mark;
 if(allies&&rank(u,'outer:1')&&spend('abyss',4-rank(u,'outer:1')))target.element=elements[(elements.indexOf(element)+1)%5];
 let resistance=rank(u,'destroyer:1')&&target.resistance>=30?target.resistance*(1-rank(u,'destroyer:1')/3):target.resistance;
 resistance=bossDefense(b,target,element,resistance,state);
 let hit=damage(u.attack,1,resistance,element,target.element);
 if(allies&&rank(u,'mage:1')&&spend('mana',2))hit+=damage(u.attack,.25*rank(u,'mage:1'),resistance,'magic',target.element);
 if(rank(u,'destroyer:3')&&target.hp<=target.maxHp*rank(u,'destroyer:3')*.05)hit=Math.max(hit,target.hp);
 hit=bossHit(b,u,target,element,hit,state)+bossEcho(b,u,target);
 if(element==='physical'&&hit>0&&rank(target,'outer:0')>(target.phaseUsed??0)){target.phaseUsed=(target.phaseUsed??0)+1;record(b,{kind:'evade',actor:u.id,target:target.id});u.attacked=true;u.remaining=bossPeriod(b,u);continue;}
 if(!allies&&hit>0&&rank(target,'mage:2')&&spend('mana',2))hit*=1-.2*rank(target,'mage:2');
 const slime=b.allies.includes(target)&&target.id!=='primordial_slime'&&b.allies.find(v=>v.id==='primordial_slime'&&v.hp>0);
 const guard=opponents.find(v=>v!==target&&v.hp>0&&rank(v,'warrior:0')>(v.guardsUsed??0));
 if(slime&&hit>=target.hp){slime.hp=0;record(b,{kind:'guard',actor:slime.id,target:target.id});}else if(guard&&hit>=target.hp){record(b,{kind:'guard',actor:guard.id,target:target.id});guard.guardsUsed=(guard.guardsUsed??0)+1;guard.hp=Math.max(0,guard.hp-hit);}else{
 const before=target.hp;
 if(!allies&&hit>=before&&rank(target,'heretic:1')&&!target.fusionUsed&&state?.worldFlags?.firstContract&&!b.allies.some(v=>v.id==='primordial_slime')&&spend('abyss',8-2*rank(target,'heretic:1'))){target.fusionUsed=true;target.hp=1;}else if(hit>=before&&rank(target,'warrior:2')&&!target.endured){target.endured=true;target.hp=1;}else target.hp=Math.max(0,before-hit);
 bossAfterHit(b,u,target,before);
 if(rank(target,'spellblade:0')&&target.hp>0)target.absorbed=element;
 if(rank(u,'spellblade:2'))target.mark=element;
 if(target.hp===0){if(rank(u,'spellblade:3'))u.hp=Math.min(u.maxHp,u.hp+u.maxHp*.05*rank(u,'spellblade:3'));const next=opponents.find(v=>v.hp>0);if(next&&rank(u,'warrior:1')&&!u.attacked)next.hp=Math.max(0,next.hp-Math.max(0,hit-before)*rank(u,'warrior:1')/3);}
 }for(const v of living){const delta=v.hp-beforeHp.get(v.id);if(delta===0)continue;record(b,{kind:delta<0?'damage':'heal',actor:u.id,target:v.id,amount:Math.abs(delta),element,...(delta<0&&v===target&&affinity(element,target.element)>1?{critical:true}:{})});if(delta<0&&opponents.includes(v)){const stats=(b.contribution??={});const c=(stats[u.id]??={damage:0,kills:0});c.damage-=delta;if(v.hp===0)c.kills++;}if(v.hp===0)record(b,{kind:'down',actor:v.id});}u.attacked=true;u.remaining=bossPeriod(b,u);}
 if(!b.enemies.some(u=>u.hp>0))b.result='win';else if(!b.allies.some(u=>u.hp>0))b.result='loss';
 }return b;}
