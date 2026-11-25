import {available,recordCompletion} from './progression.mjs';
import {output,hasRoom} from './production.mjs';
import {resources,speed,transact} from './economy.mjs';
import {award,effectiveCost} from './mastery.mjs';
import {ready,duration,finishParallel} from './automation.mjs';
import {actions} from './actions.mjs';
// Explicit fixture caps, not production balance. Integer milliseconds for reproducible stepping.
export function fixture(){return {resources:Object.fromEntries(resources.map(k=>[k,k==='hp'?10:0])),caps:Object.fromEntries(resources.map(k=>[k,k==='hp'?10:k==='abyss'?100:1000])),levels:{},stats:{strength:0},action:null,progress:0,elapsed:0,lifeElapsed:0,completed:0,repeat:false,unlocked:['rest','gather','eat','chop']};}
export function select(s,id,repeat=false){if(s.slots?.some(p=>p.id===id&&p.owner!=='past'))throw Error('duplicate action');if(!Object.hasOwn(actions,id)||!available(s,id))throw Error('locked action');if(repeat&&actions[id].once)throw Error('one-time action');if(repeat&&(s.levels[id]??1)<5)throw Error('repeat locked');s.action=id;s.repeat=repeat;s.progress=0;}
function advanceSingle(s,ms){if(!Number.isSafeInteger(ms)||ms<0)throw Error('invalid duration');let left=ms;s.elapsed+=ms;s.lifeElapsed=(s.lifeElapsed??0)+ms;while(left>0&&s.action){const id=s.action,a=actions[id],d=Math.ceil(a.seconds*1000/speed(s.levels[id]??1));if(!hasRoom(s,id)||Object.entries(effectiveCost(s,id,a.cost)).some(([k,v])=>s.resources[k]<v))break;const step=Math.min(left,d-s.progress);s.progress+=step;left-=step;if(s.progress===d){if(!transact(s,effectiveCost(s,id,a.cost),output(s,id)))throw Error('transaction failed');if(a.stat)s.stats[a.stat]=(s.stats[a.stat]??0)+1;s.completed++;award(s,id);recordCompletion(s,id);s.progress=0;if(!s.repeat)s.action=null;}}return s;}

export function advance(s,ms){
 if(!Number.isSafeInteger(ms)||ms<0)throw Error('invalid duration');
 if(!s.slots?.length)return advanceSingle(s,ms);
 while(ms>0){const active=s.slots.filter(p=>ready(s,p.id,p));const primary=s.action&&ready(s,s.action);const dt=Math.min(ms,...active.map(p=>duration(s,p.id,p)-p.progress),primary?duration(s,s.action)-s.progress:Infinity);if(dt<=0)throw Error('invalid progress');
 for(const p of active)p.progress+=dt;advanceSingle(s,dt);
 for(const p of active)if(p.progress===duration(s,p.id,p)){if(!finishParallel(s,p))p.progress=0;}
 ms-=dt;
 }return s;
}
