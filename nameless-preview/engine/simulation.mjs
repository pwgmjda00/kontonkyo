import {available,recordCompletion} from './progression.mjs';
import {output,hasRoom,produce,canSpendProduction} from './production.mjs';
import {resources,speed,transact} from './economy.mjs';
import {award,effectiveCost,readingBonus} from './mastery.mjs';
import {ready,duration,finishParallel,pastLife,slotCost,optimizeAssignments} from './automation.mjs';
import {actions} from './actions.mjs';
// Explicit fixture caps, not production balance. Integer milliseconds for reproducible stepping.
export function fixture(){return {resources:Object.fromEntries(resources.map(k=>[k,k==='hp'?10:0])),caps:Object.fromEntries(resources.map(k=>[k,k==='hp'?10:k==='abyss'?100:1000])),levels:{},stats:{strength:0},action:null,progress:0,elapsed:0,lifeElapsed:0,completed:0,repeat:false,unlocked:['rest','gather','eat','chop']};}
export function select(s,id,repeat=false){if(s.slots?.some(p=>p.id===id&&p.owner!=='past'))throw Error('duplicate action');if(!Object.hasOwn(actions,id)||!available(s,id))throw Error('locked action');if(repeat&&actions[id].once)throw Error('one-time action');if(repeat&&(s.levels[id]??1)<5)throw Error('repeat locked');s.action=id;s.repeat=repeat;s.progress=0;}
function advanceSingle(s,ms){if(!Number.isSafeInteger(ms)||ms<0)throw Error('invalid duration');let left=ms;s.elapsed+=ms;s.lifeElapsed=(s.lifeElapsed??0)+ms;while(left>0&&s.action){if(!s.slots?.length)optimizeAssignments(s);const id=s.action,a=actions[id],d=Math.ceil(a.seconds*1000/speed(s.levels[id]??1));if(!hasRoom(s,id)||!canSpendProduction(s,effectiveCost(s,id,a.cost)))break;const step=Math.min(left,d-s.progress);s.progress+=step;left-=step;if(s.progress===d){if(!produce(s,effectiveCost(s,id,a.cost),output(s,id)))throw Error('transaction failed');if(a.stat)s.stats[a.stat]=(s.stats[a.stat]??0)+1;s.completed++;award(s,id);const bonus=readingBonus(s,s,id);if(bonus?.id)award(s,bonus.id,bonus.rank);recordCompletion(s,id);s.progress=0;if(!s.repeat)s.action=null;}}return s;}

export function advance(s,ms){
 if(!Number.isSafeInteger(ms)||ms<0)throw Error('invalid duration');
 if(!s.slots?.length)return advanceSingle(s,ms);
 while(ms>0){optimizeAssignments(s);const resting=s.slots.filter(p=>{const h=pastLife(s,p);return h&&(h.hp??10)<(slotCost(s,p.id,p).hp??0);});const active=s.slots.filter(p=>ready(s,p.id,p));const primary=s.action&&ready(s,s.action);const dt=Math.min(ms,...resting.map(p=>2000-(p.restProgress??0)),...active.map(p=>duration(s,p.id,p)-p.progress),primary?duration(s,s.action)-s.progress:Infinity);if(dt<=0)throw Error('invalid progress');
 for(const p of resting){p.restProgress=(p.restProgress??0)+dt;if(p.restProgress===2000){const h=pastLife(s,p);h.hp=Math.min(10,(h.hp??10)+3);delete p.restProgress;}}for(const p of active)p.progress+=dt;advanceSingle(s,dt);
 for(const p of active)if(p.progress===duration(s,p.id,p)){if(!finishParallel(s,p))p.progress=0;}
 ms-=dt;
 }return s;
}
