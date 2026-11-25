import {actions} from './actions.mjs';
import {resources} from './economy.mjs';
// Optional per-action equipment and law multipliers; neutral until chapter data unlocks them.
export function validateProduction(s){const p=s.production;if(p===undefined)return;if(!p||typeof p!=='object'||Array.isArray(p))throw Error('invalid production');for(const key of ['equipment','law']){const map=p[key]??{};if(!map||typeof map!=='object'||Array.isArray(map)||Object.entries(map).some(([id,v])=>!Object.hasOwn(actions,id)||!Number.isFinite(v)||v<1||v>100))throw Error('invalid multiplier');}if(p.stopAtCap!==undefined&&typeof p.stopAtCap!=='boolean')throw Error('invalid cap policy');}
export function output(s,id){const a=actions[id],p=s.production;const multiplier=(p?.equipment?.[id]??1)*(p?.law?.[id]??1);return Object.fromEntries(Object.entries(a.gain??{}).map(([k,v])=>[k,v*multiplier]));}
export function hasRoom(s,id){const gain=output(s,id);return !s.production?.stopAtCap||!Object.keys(gain).length||Object.keys(gain).some(k=>s.resources[k]<s.caps[k]);}
export function expandStorage(s,key,cap){if(!resources.includes(key)||key==='abyss'||!Number.isFinite(cap)||cap<s.caps[key]||cap>Number.MAX_SAFE_INTEGER)throw Error('invalid storage');s.caps[key]=cap;}
