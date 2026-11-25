import {advance} from './simulation.mjs';
export const endingText={order:'今日も、誰一人として予定外の幸福を知らなかった。',chaos:'神は初めて、明日を楽しみにした。',void:'記録すべき現象は存在しません。',nameless:'世界は、あなたの作品ではなくなった。'};
// Provisional autonomy: isolated 60-second production trial, no hero or hero-owned slots.
export function autonomyReport(s){if(s.chapter!==6||!s.worldFlags?.universeChoice)return {ready:false,missing:[]};const t=structuredClone(s);t.action=null;t.repeat=false;t.progress=0;delete t.job;t.slots=(t.slots??[]).filter(p=>p.owner!=='hero');const keys=['food','material','knowledge','mana','causality'];for(const k of keys)t.resources[k]=Math.min(t.resources[k],t.caps[k]/2);const before={...t.resources};advance(t,60000);const growth=['food','knowledge','causality'];
const missing=keys.filter(k=>growth.includes(k)?t.resources[k]<=before[k]:t.resources[k]<before[k]);
return {ready:!missing.length,missing};}
export function autonomy(s){return autonomyReport(s).ready;}
export function unlockNameless(s){
  const {ready,missing}=autonomyReport(s);
  if(!ready){
    const requirements={food:'食料を増やす',material:'素材を維持する',knowledge:'知識を増やす',mana:'魔力を維持する',causality:'因果を増やす'};
    throw Error(missing.length?'自律観測（60秒）で未達：'+missing.map(k=>requirements[k]).join('・'):'宇宙の選択が必要');
  }
if(!s.unlocked.includes('discardName'))s.unlocked.push('discardName');}
export function chooseEnding(s,id){if(s.chapter!==6||!s.worldFlags?.universeChoice||!Object.hasOwn(endingText,id)||id==='nameless'&&(!s.worldFlags.discardName||!autonomy(s)))throw Error('ending locked');s.endings??=[];if(!s.endings.includes(id))s.endings.push(id);return endingText[id];}
