import {actions} from './actions.mjs';
// Chapter-one provisional prices and narrative triggers. Unlocks persist after spending.
export function refreshUnlocks(s){const f=s.worldFlags??{};const add=id=>{if(!s.unlocked.includes(id))s.unlocked.push(id)};if(s.resources.material>=10)add('work');if(s.resources.gold>=15)add('build');if(f.build){add('read');add('cook');add('farm');}if(f.trust)add('train');if(s.resources.knowledge>=20)add('well');if(f.well)add('star');if(f.star)add('meditate');}
export function recordCompletion(s,id){if(actions[id].once){s.worldFlags??={};s.worldFlags[id]=true;}if(id==='work'){s.worldFlags??={};s.worldFlags.trust=true;}refreshUnlocks(s);}
export const available=(s,id)=>s.unlocked.includes(id)&&!(actions[id]?.once&&s.worldFlags?.[id]);
