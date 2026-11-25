import {available,recordCompletion} from './progression.mjs';
import {output,hasRoom} from './production.mjs';
import {actions} from './actions.mjs';
import {speed,transact} from './economy.mjs';
import {award,effectiveCost} from './mastery.mjs';
export const limits=s=>s.slotLimits??{hero:1,companion:1,past:0};
export function validateSlots(s){const l=limits(s), slots=s.slots??[];if(!['hero','companion','past'].every(k=>Number.isSafeInteger(l[k])&&l[k]>=0)||!Array.isArray(slots))throw Error('invalid slots');const ids=new Set([s.action]),workers=new Set(),counts={hero:0,companion:0,past:0};for(const p of slots){if(!p||!Object.hasOwn(counts,p.owner)||!Object.hasOwn(actions,p.id)||!available(s,p.id)||actions[p.id].once||(p.owner!=='past'&&ids.has(p.id))||!Number.isSafeInteger(p.progress)||p.progress<0||p.progress>=duration(s,p.id,p)||(p.owner==='past'&&s.lifeHistory ? (s.lifeHistory.find(h=>h.id===p.worker)?.levels[p.id]??0)<1 : (s.levels[p.id]??1)<(p.owner==='hero'?25:50)))throw Error('invalid assignment');if(p.owner==='hero'?p.worker!==null:typeof p.worker!=='string'||!p.worker||workers.has(p.worker)||!(p.owner==='past'?s.availablePast??[]:s.availableWorkers??[]).includes(p.worker))throw Error('invalid worker');if(p.owner==='companion'&&(s.observers?.includes(p.worker)||(!s.battle?.result&&s.battle?.allies.some(u=>u.id===p.worker))))throw Error('worker busy');if(p.owner!=='past')ids.add(p.id);if(p.worker!==null)workers.add(p.worker);if(++counts[p.owner]>l[p.owner])throw Error('slot limit');}return slots;}
export function assign(s,id,worker=null,owner=worker===null?'hero':'companion'){const slots=[...(s.slots??[]),{id,worker,owner,progress:0}];validateSlots({...s,slots});s.slots=slots;}
export function clearAssignment(s,id){if(id===undefined)delete s.slots;else s.slots=(s.slots??[]).filter(p=>p.id!==id);}
export function slotCost(s,id,p){const levels=p?.owner==='past'&&s.lifeHistory?s.lifeHistory.find(h=>h.id===p.worker)?.levels??{}:s.levels;return effectiveCost({levels},id,actions[id].cost);}
export function ready(s,id,p){return hasRoom(s,id)&&Object.entries(slotCost(s,id,p)).every(([k,v])=>s.resources[k]>=v);}
export function duration(s,id,p){const lv=p?.owner==='past'&&s.lifeHistory?s.lifeHistory.find(h=>h.id===p.worker)?.levels[id]??1:s.levels[id]??1;return Math.ceil(actions[id].seconds*1000/speed(lv));}
export function finishParallel(s,p){const a=actions[p.id];if(!hasRoom(s,p.id)||!transact(s,slotCost(s,p.id,p),output(s,p.id)))return false;if(a.stat)s.stats[a.stat]=(s.stats[a.stat]??0)+1;s.completed++;if(p.owner!=='past')award(s,p.id);recordCompletion(s,p.id);p.progress=0;return true;}

export function clearWorker(s,worker){s.slots=(s.slots??[]).filter(p=>p.worker!==worker);}
