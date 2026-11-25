import {identity} from './identity.mjs';
import {earnedTitles} from './titles.mjs';
import {jobs} from './jobs.mjs';
export const creditThemes={order:['秩序','すべての存在は、記録された。'],chaos:['混沌','誰も、同じ明日を選ばなかった。'],void:['虚無','消える前に、ここにいたことを。'],nameless:['無名','世界は、あなたなしでも続いていく。']};
export function creditRows(s){return [...(s.lifeHistory??[]),{...s,id:'hero'}].map(a=>({id:identity(a.id),job:jobs[a.job]?.name??'無職',titles:earnedTitles(a).map(t=>t.name),actions:a.record?.actions??0,kills:a.record?.kills??0,battles:a.record?.battles??0,production:Math.floor(Object.values(a.record?.production??{}).reduce((x,y)=>x+y,0))}));}
