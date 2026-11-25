import {skillRank} from './skills.mjs';
import {actions} from './actions.mjs';
import {available} from './progression.mjs';
import {effectiveCost} from './mastery.mjs';
import {slotCost,pastLife} from './automation.mjs';
import {elements,affinity} from './combat.mjs';
export function shortages(s,cost,life){return Object.entries(cost).map(([resource,amount])=>({resource,amount:Math.max(0,amount-(resource==='hp'&&life?(life.hp??10):s.resources[resource]))})).filter(x=>x.amount>1e-9);}
export function analyzeAction(s,id){const rank=skillRank(s,'scholar:1');if(!rank||!available(s,id))return [];return shortages(s,effectiveCost(s,id,actions[id].cost)).slice(0,rank).map(x=>({...x,producers:Object.keys(actions).filter(a=>available(s,a)&&!actions[a].once&&actions[a].gain?.[x.resource]>0).slice(0,rank)}));}
export function observeBattle(s){const b=s.battle;if(!b||b.result)return {};const r=skillRank(s,'observer:0'),w=skillRank(s,'observer:1');const enemies=b.enemies.filter(u=>u.hp>0);return {next:r?[...enemies].sort((a,b)=>a.remaining-b.remaining).slice(0,r).map(u=>({id:u.id,remaining:u.remaining,element:u.element})):[],weakness:w?enemies.slice(0,w).map(u=>({id:u.id,element:elements.find(e=>affinity(e,u.element)>1)})):[]};}
export function observeWorkers(s){const rank=skillRank(s,'omniscient:3');if(!rank)return [];return (s.slots??[]).map(p=>({worker:p.worker,id:p.id,missing:shortages(s,slotCost(s,p.id,p),pastLife(s,p))})).filter(p=>p.missing.length).map(p=>({...p,missing:p.missing.slice(0,rank)}));}

export function discoverLaws(s){const rank=skillRank(s,'omniscient:1');if(!rank)return [];const f=s.worldFlags??{}, base=['lawConservation','lawTime','lawLife','lawCausality','lawExistence','lawObservation'];return [...base,'lawSynthesis','lawEdit'].filter(id=>!f[id]).slice(0,rank).map(id=>({id,ready:available(s,id),cost:effectiveCost(s,id,actions[id].cost),condition:base.includes(id)?'法則観測':id==='lawSynthesis'?'基本法則を3つ研究':'法則合成'}));}
export function analyzeChains(s){const rank=skillRank(s,'omniscient:2');if(!rank)return [];const tasks=[...(s.action?[{id:s.action}]:[]),...(s.slots??[])];return tasks.flatMap(p=>shortages(s,p.owner?slotCost(s,p.id,p):effectiveCost(s,p.id,actions[p.id].cost),pastLife(s,p)).map(m=>({id:p.id,resource:m.resource,producers:Object.keys(actions).filter(id=>available(s,id)&&!actions[id].once&&actions[id].gain?.[m.resource]>0).slice(0,rank).map(id=>({id,missing:shortages(s,effectiveCost(s,id,actions[id].cost)).slice(0,rank)}))}))).slice(0,rank);}
