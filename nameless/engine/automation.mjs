import {skillRank} from "./skills.mjs";
import {available,recordCompletion} from './progression.mjs';
import {output,hasRoom,produce,productionRoom,canSpendProduction} from './production.mjs';
import {actions} from './actions.mjs';
import {speed,transact} from './economy.mjs';
import {award,effectiveCost,threshold,readingBonus} from './mastery.mjs';
export const pastLife=(s,p)=>p?.owner==='past'?s.lifeHistory?.find(h=>h.id===p.worker):null;
export const requiredMastery=id=>1;
export const advanced=id=>['refine','alchemy','trade','observe','jobTraining'].includes(id);
export const tier=lv=>lv>=100?'達人':lv>=50?'指導者':lv>=25?'専門家':lv>=10?'実務者':'見習い';
const factor=(id,lv)=>!advanced(id)?1:lv<10?0.5:lv>=100?1.5:lv>=25?1.2:1;
export function pastOutput(s,id,h){return Object.fromEntries(Object.entries(output({...s,job:h.job,skillRanks:h.skillRanks},id)).map(([k,v])=>[k,v*factor(id,h.levels[id]??1)]));}
const mentoring=(s,p)=>advanced(p.id)&&(pastLife(s,p)?.levels[p.id]??1)<50&&(s.slots??[]).some(q=>q!==p&&q.id===p.id&&(pastLife(s,q)?.levels[p.id]??1)>=50)?2:1;
export const limits=s=>s.slotLimits??{hero:1,companion:1,past:0};
export function parallelMastery(s,id){const rank=skillRank(s,"observer:3");return rank&&["read","observe","timelineExplore","causalObserve","truthExtract"].includes(id)?25-5*rank:25;}
export function validateSlots(s){const l=limits(s), slots=s.slots??[];if(!['hero','companion','past'].every(k=>Number.isSafeInteger(l[k])&&l[k]>=0)||!Array.isArray(slots))throw Error('invalid slots');const ids=new Set([s.action]),workers=new Set(),counts={hero:0,companion:0,past:0};for(const p of slots){if(!p||(p.queue!==undefined&&(!Array.isArray(p.queue)||p.owner!=='past'||p.queue.length>skillRank(pastLife(s,p)??{},'contractor:0')||p.queue.some(id=>!Object.hasOwn(actions,id)||!available(s,id)||actions[id].once)))||(p.coverOriginal!==undefined&&(p.owner!=='past'||!Object.hasOwn(actions,p.coverOriginal)||!available(s,p.coverOriginal)||actions[p.coverOriginal].once||!(skillRank(pastLife(s,p)??{},'contractor:2')||skillRank(pastLife(s,p)??{},'contractor:1'))))||!Object.hasOwn(counts,p.owner)||!Object.hasOwn(actions,p.id)||!available(s,p.id)||actions[p.id].once||(p.owner!=='past'&&ids.has(p.id))||(p.restProgress!==undefined&&(!Number.isSafeInteger(p.restProgress)||p.restProgress<0||p.restProgress>=2000))||!Number.isSafeInteger(p.progress)||p.progress<0||p.progress>=duration(s,p.id,p)||(p.owner==='past'&&s.lifeHistory ? (s.lifeHistory.find(h=>h.id===p.worker)?.levels[p.id]??1)<requiredMastery(p.id) : (s.levels[p.id]??1)<(p.owner==='hero'?parallelMastery(s,p.id):50)))throw Error('invalid assignment');if(p.owner==='hero'?p.worker!==null:typeof p.worker!=='string'||!p.worker||workers.has(p.worker)||!(p.owner==='past'?s.availablePast??[]:s.availableWorkers??[]).includes(p.worker))throw Error('invalid worker');if((p.owner==='companion'&&s.observers?.includes(p.worker))||(!s.battle?.result&&s.battle?.allies.some(u=>u.id===p.worker)))throw Error('worker busy');if(p.owner!=='past')ids.add(p.id);if(p.worker!==null)workers.add(p.worker);if(++counts[p.owner]>l[p.owner])throw Error('slot limit');}return slots;}
export function assign(s,id,worker=null,owner=worker===null?'hero':'companion'){const slots=[...(s.slots??[]),{id,worker,owner,progress:0}];validateSlots({...s,slots});s.slots=slots;}
export function clearAssignment(s,id){if(id===undefined)delete s.slots;else s.slots=(s.slots??[]).filter(p=>p.id!==id);}
export function slotCost(s,id,p){const levels=p?.owner==='past'&&s.lifeHistory?s.lifeHistory.find(h=>h.id===p.worker)?.levels??{}:s.levels;const life=pastLife(s,p);return effectiveCost({levels,worldFlags:s.worldFlags,job:life?.job??(p?.owner==='past'?undefined:s.job),skillRanks:life?life.skillRanks:s.skillRanks,resources:life?{...s.resources,hp:life.hp??10}:s.resources},id,actions[id].cost);}
export function ready(s,id,p){const life=pastLife(s,p);return (life?true:hasRoom(s,id))&&canSpendProduction(s,Object.fromEntries(Object.entries(slotCost(s,id,p)).filter(([k])=>!life||k!=="hp")))&&Object.entries(slotCost(s,id,p)).every(([k,v])=>(life&&k==='hp'?(life.hp??10):s.resources[k])>=v);}
export function duration(s,id,p){const lv=p?.owner==='past'&&s.lifeHistory?s.lifeHistory.find(h=>h.id===p.worker)?.levels[id]??1:s.levels[id]??1;return Math.ceil(actions[id].seconds*1000/speed(lv)/(p?.owner==='past'&&actions[id].stat?factor(id,lv):1));}
export function finishParallel(s,p){const a=actions[p.id];const life=pastLife(s,p);const cost=slotCost(s,p.id,p),gain=life?pastOutput(s,p.id,life):output(s,p.id);if(life){const hp=life.hp??10;if(hp<(cost.hp??0))return false;const c={...cost},g={...gain};delete c.hp;delete g.hp;if(s.production?.stopAtCap&&Object.keys(g).length&&!Object.keys(g).some(k=>productionRoom(s,k,life)))return false;if(!produce(s,c,g,life))return false;life.hp=Math.min(10,hp-(cost.hp??0)+(gain.hp??0));}else if(!hasRoom(s,p.id)||!produce(s,cost,gain))return false;if(life){life.growth??={};const g=life.growth[p.id]??0;life.growth[p.id]=g+mentoring(s,p)+Math.max(0,...(s.slots??[]).filter(q=>q!==p&&q.id===p.id).map(q=>{const teacher=pastLife(s,q);return teacher&&(teacher.levels[p.id]??1)>=10&&(life.levels[p.id]??1)<10?skillRank(teacher,"scholar:3"):0;}));let lv=life.levels[p.id]??1;while(lv<100&&life.growth[p.id]>=10*(threshold(lv+1)-threshold(lv))){life.growth[p.id]-=10*(threshold(lv+1)-threshold(lv));life.levels[p.id]=++lv;}const bonus=readingBonus(s,life,p.id);if(bonus?.id){const id=bonus.id;life.growth[id]=(life.growth[id]??0)+bonus.rank;let n=life.levels[id]??1;while(n<100&&life.growth[id]>=10*(threshold(n+1)-threshold(n))){life.growth[id]-=10*(threshold(n+1)-threshold(n));life.levels[id]=++n;}}if(a.stat){life.stats??={};life.stats[a.stat]=(life.stats[a.stat]??0)+1;}}else{if(a.stat)s.stats[a.stat]=(s.stats[a.stat]??0)+1;award(s,p.id);const bonus=readingBonus(s,s,p.id);if(bonus?.id)award(s,bonus.id,bonus.rank);}s.completed++;recordCompletion(s,p.id);p.progress=0;if(p.coverOriginal){p.id=p.coverOriginal;delete p.coverOriginal;}else if(p.queue?.length){p.id=p.queue.shift();}return true;}

export function clearWorker(s,worker){s.slots=(s.slots??[]).filter(p=>p.worker!==worker);}

export function groupAssign(s,id,{job, count=Infinity}={}){const candidates=(s.lifeHistory??[]).filter(h=>s.availablePast?.includes(h.id)&&(!job||h.job===job)&&!s.slots?.some(p=>p.worker===h.id)&&!(!s.battle?.result&&s.battle?.allies.some(u=>u.id===h.id))&&(h.levels[id]??1)>=requiredMastery(id));candidates.sort((a,b)=>{const score=h=>Object.values(pastOutput(s,id,h)).reduce((x,y)=>x+y,0)/duration(s,id,{owner:'past',worker:h.id});return score(b)-score(a)||(b.levels[id]??0)-(a.levels[id]??0);});let n=0;for(const h of candidates){if(n>=count||(s.slots??[]).filter(p=>p.owner==='past').length>=limits(s).past)break;assign(s,id,h.id,'past');n++;}return n;}

// Switch only at a cycle boundary, to unlocked basic production with spare capacity.
// A contractor temporarily covers a resting colleague's production at a cycle boundary.
// No extra slot, free output, or transfer of HP. Return to own assignment after each cycle.
export function coverAssignment(s,p){
 const life=pastLife(s,p),rank=life?skillRank(life,'contractor:2'):0;
 if(!rank||p.progress||p.restProgress||p.coverOriginal)return;
 const allowed=['gather','chop','work','farm','read','refine'].slice(0,rank*2);
 const target=(s.slots??[]).find(q=>q!==p&&q.owner==='past'&&!q.coverOriginal&&allowed.includes(q.id)&&q.id!==p.id&&pastLife(s,q)&&(pastLife(s,q).hp??10)<(slotCost(s,q.id,q).hp??0)&&!s.slots.some(r=>r.coverOriginal&&r.id===q.id)&&ready(s,q.id,p));
 if(target){p.coverOriginal=p.id;p.id=target.id;}
}
// Supply a blocked colleague using an ordinary paid production cycle.
export function cooperate(s,p){
 const life=pastLife(s,p),rank=life?skillRank(life,'contractor:1'):0;
 if(!rank||p.progress||p.restProgress||p.coverOriginal)return;
 const suppliers={material:'chop',food:'gather',gold:'work',knowledge:'read',mana:'refine'};
 const allowed=['material','food','gold','knowledge','mana'].slice(0,rank===3?5:rank===2?3:2);
 for(const q of s.slots??[]){if(q===p||q.owner!=='past'||q.coverOriginal)continue;
  const cost=slotCost(s,q.id,q);for(const k of allowed){const id=suppliers[k];if((cost[k]??0)<=s.resources[k]||id===p.id||!available(s,id)||!ready(s,id,p)||s.resources[k]>=s.caps[k]||s.slots.some(r=>r!==p&&r.id===id))continue;
   p.coverOriginal=p.id;p.id=id;return;
  }
 }
}
export function reserveProduction(s,worker,id){
 const p=s.slots?.find(q=>q.worker===worker&&q.owner==='past');
 if(!p)throw Error('assignment required');
 const rank=skillRank(pastLife(s,p)??{},'contractor:0');
 if(!rank||(p.queue?.length??0)>=rank||!Object.hasOwn(actions,id)||!available(s,id)||actions[id].once)throw Error('invalid reservation');
 (p.queue??=[]).push(id);
}
export function renewContract(s,p){
 const life=pastLife(s,p),rank=skillRank(life??{},'contractor:3');
 if(!rank||p.progress||p.restProgress||p.coverOriginal||p.queue?.length)return;
 const keys=Object.keys(pastOutput(s,p.id,life)).filter(k=>k!=='hp');
 if(!keys.length||!keys.every(k=>s.resources[k]>=s.caps[k]))return;
 const ids=['gather','chop','work','farm','read','refine'].slice(0,rank*2);
 const choices=ids.filter(id=>id!==p.id&&available(s,id)&&ready(s,id,p)&&!s.slots.some(q=>q!==p&&q.id===id)&&Object.keys(pastOutput(s,id,life)).some(k=>k!=='hp'&&s.resources[k]<s.caps[k]));
 const stock=id=>Math.min(...Object.keys(pastOutput(s,id,life)).filter(k=>k!=='hp').map(k=>s.resources[k]/s.caps[k]));
 choices.sort((a,b)=>stock(a)-stock(b));if(choices.length)p.id=choices[0];
}
export function optimizeAssignments(s){
 const candidates=['gather','chop','work','read','farm','meditate','refine'];
 const full=(id,life)=>{const g=life?pastOutput(s,id,life):output(s,id);const keys=Object.keys(g).filter(k=>!life||k!=='hp');return keys.length>0&&keys.every(k=>s.resources[k]>=s.caps[k]);};
 const pick=(id,actor,p)=>{const rank=skillRank(actor,'observer:2');if(!rank||!full(id,pastLife(s,p)))return null;const list=candidates.filter(k=>k!==id&&available(s,k)&&!actions[k].once&&(!p?(s.levels[k]??1)>=5&&!s.slots?.some(q=>q.id===k&&q.owner!=='past'):p.owner==='past')&&!full(k,pastLife(s,p))&&ready(s,k,p));const stock=k=>Math.min(...Object.keys(actions[k].gain).map(r=>s.resources[r]/s.caps[r]));if(rank>=2)list.sort((a,b)=>stock(a)-stock(b));if(rank>=3)list.sort((a,b)=>stock(a)-stock(b)||duration(s,a,p)-duration(s,b,p));return list[0]??null;};
 if(s.action&&s.repeat&&s.progress===0){const next=pick(s.action,s);if(next)s.action=next;}
 for(const p of s.slots??[]){const life=pastLife(s,p);if(!life||p.progress!==0||p.restProgress)continue;if(p.coverOriginal||p.queue?.length)continue;coverAssignment(s,p);if(p.coverOriginal)continue;cooperate(s,p);if(p.coverOriginal)continue;renewContract(s,p);if(p.queue?.length)continue;const next=pick(p.id,life,p);if(next)p.id=next;}
}
