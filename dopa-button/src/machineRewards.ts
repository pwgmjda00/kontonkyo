import { MACHINE_EVENTS, type MachineDrawEntry, type MachineHit } from './machineLottery';
import type { VirtualKind } from './machineWallet';

export const REWARD_KEY='dopa-collector-rewards-v1';
export const OLD_DISCOVERIES_KEY='dopa-machine-emoji-discoveries-v1';
const ID_SET=new Set(MACHINE_EVENTS.map(m=>m.id));
export interface RewardProfile {
  version:1;
  counts: Record<string,number>;
  rounds:number;
  dryRounds:number;
  fails:number;
  bestStreak:number;
  featuredId:string|null;
  equippedBadge:string|null;
  alias:string;
}
export const EMPTY_REWARDS: RewardProfile={version:1,counts:{},rounds:0,dryRounds:0,fails:0,bestStreak:0,featuredId:null,equippedBadge:null,alias:''};
export type RewardBadge={id:string;emoji:string;name:string;description:string;check:(profile:RewardProfile)=>boolean;};
export function ownedCount(p:RewardProfile){return Object.keys(p.counts).filter(id=>ID_SET.has(id)&&p.counts[id]>0).length;}
export function totalRewardHits(p:RewardProfile){return Object.values(p.counts).reduce((n,count)=>n+count,0);}
export function stickerLevel(count:number){return count>=10?4:count>=5?3:count>=2?2:count>=1?1:0;}
export const STICKER_TIERS=[
  {name:'未発見',emoji:'❔'},
  {name:'ノーマル',emoji:'🎟️'},
  {name:'キラ',emoji:'✨'},
  {name:'ホログラム',emoji:'🌈'},
  {name:'レジェンド',emoji:'👑'},
] as const;
const kinds:Record<VirtualKind,string[]>={pachinko:MACHINE_EVENTS.filter(x=>x.kind==='pachinko').map(x=>x.id),pachislot:MACHINE_EVENTS.filter(x=>x.kind==='pachislot').map(x=>x.id)};
const has=(p:RewardProfile,kind:VirtualKind)=>kinds[kind].some(id=>(p.counts[id]??0)>0);
const copies=(p:RewardProfile,min:number)=>Object.values(p.counts).some(count=>count>=min);
export const BADGES:readonly RewardBadge[]=[
  {id:'first',emoji:'🎉',name:'最初の一撃',description:'はじめて機種を獲得',check:p=>ownedCount(p)>=1},
  {id:'five',emoji:'🎟️',name:'ステッカー集め',description:'5機種をコレクション',check:p=>ownedCount(p)>=5},
  {id:'twenty',emoji:'💎',name:'確率の蒐集家',description:'20機種をコレクション',check:p=>ownedCount(p)>=20},
  {id:'fifty',emoji:'👑',name:'機種図鑑の主',description:'50機種をコレクション',check:p=>ownedCount(p)>=50},
  {id:'hundred',emoji:'🌌',name:'遍く確率の旅人',description:'100機種をコレクション',check:p=>ownedCount(p)>=100},
  {id:'ball',emoji:'🟠',name:'玉の住人',description:'パチンコ機種を獲得',check:p=>has(p,'pachinko')},
  {id:'medal',emoji:'🪙',name:'メダルの住人',description:'パチスロ機種を獲得',check:p=>has(p,'pachislot')},
  {id:'both',emoji:'🎭',name:'二つの世界を知る者',description:'玉とメダル、両方で獲得',check:p=>has(p,'pachinko')&&has(p,'pachislot')},
  {id:'twice',emoji:'✨',name:'再会のキラ',description:'同じ機種が2回当たる',check:p=>copies(p,2)},
  {id:'fivecopies',emoji:'🌈',name:'ホロの覚醒',description:'同じ機種が5回当たる',check:p=>copies(p,5)},
  {id:'tencopies',emoji:'👑',name:'推ししか勝たん',description:'同じ機種が10回当たる',check:p=>copies(p,10)},
  {id:'dry10',emoji:'🗑️',name:'当たりを知らぬ者',description:'当選ゼロの成功を累計10回',check:p=>p.dryRounds>=10},
  {id:'dry50',emoji:'🌪️',name:'不運という才能',description:'当選ゼロの成功を累計50回',check:p=>p.dryRounds>=50},
  {id:'failed10',emoji:'💪',name:'転んでもPUSH',description:'反射失敗10回。まだ押せる',check:p=>p.fails>=10},
  {id:'rounds50',emoji:'🔥',name:'百折不撓の途中',description:'成功を累計50回',check:p=>p.rounds>=50},
  {id:'streak10',emoji:'⚡',name:'反射神経の怪物',description:'反射スコア10を達成',check:p=>p.bestStreak>=10},
  {id:'director',emoji:'🎬',name:'演出ディレクター',description:'20機種獲得で演出テーマの応募権',check:p=>ownedCount(p)>=20},
] as const;
export function earnedBadges(p:RewardProfile){return BADGES.filter(b=>b.check(p));}
export function getEquippedBadge(p:RewardProfile){
  return BADGES.find(b=>b.id===p.equippedBadge&&b.check(p))??earnedBadges(p)[0]??null;
}
const clampInt=(v:unknown,max=1_000_000):number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?Math.min(v,max):0;
const aliasText=(str:unknown)=>typeof str==='string'?[...str.trim()].slice(0,16).join(''):''; 
export function sanitizeRewards(input:unknown,legacy:unknown=[]):RewardProfile{
  const source=input&&typeof input==='object'?(input as Partial<RewardProfile>):{};
  const counts:Record<string,number>={};
  if(source.counts&&typeof source.counts==='object'&&!Array.isArray(source.counts)){
    for(const [id,value] of Object.entries(source.counts))if(ID_SET.has(id)){
      const count=clampInt(value);if(count>0)counts[id]=count;
    }
  }
  if(Array.isArray(legacy))for(const id of legacy)if(typeof id==='string'&&ID_SET.has(id)&&!counts[id])counts[id]=1;
  const base:RewardProfile={
    version:1,counts,
    rounds:clampInt(source.rounds),dryRounds:clampInt(source.dryRounds),
    fails:clampInt(source.fails),bestStreak:clampInt(source.bestStreak,10000),
    featuredId:typeof source.featuredId==='string'&&counts[source.featuredId]>0?source.featuredId:null,
    equippedBadge:typeof source.equippedBadge==='string'?source.equippedBadge:null,
    alias:aliasText(source.alias),
  };
  if(!base.equippedBadge||!BADGES.some(b=>b.id===base.equippedBadge&&b.check(base)))base.equippedBadge=null;
  return base;
}
export function loadRewards():RewardProfile{
  try{
    const saved=JSON.parse(localStorage.getItem(REWARD_KEY)||'null');
    const legacy=JSON.parse(localStorage.getItem(OLD_DISCOVERIES_KEY)||'[]');
    return sanitizeRewards(saved,legacy);
  }catch{return sanitizeRewards(null);}
}
export function saveRewards(p:RewardProfile){
  try{localStorage.setItem(REWARD_KEY,JSON.stringify(p));}catch{/* disabled storage */}
}
export function winRewards(profile:RewardProfile,hits:readonly MachineHit[]):RewardProfile{
  const counts={...profile.counts};
  for(const h of hits)if(h.hit&&ID_SET.has(h.event.id))counts[h.event.id]=Math.min(1_000_000,(counts[h.event.id]??0)+1);
  const first=hits.find(h=>h.hit&&ID_SET.has(h.event.id))?.event.id;
  return {...profile,counts,rounds:profile.rounds+1,dryRounds:profile.dryRounds+(hits.length?0:1),featuredId:profile.featuredId??first??null};
}
export function failRewards(profile:RewardProfile,streak:number):RewardProfile{
  return {...profile,fails:profile.fails+1,bestStreak:Math.max(profile.bestStreak,streak)};
}
export function decorateProfile(profile:RewardProfile,changes:Partial<Pick<RewardProfile,'alias'|'featuredId'|'equippedBadge'>>):RewardProfile{
  const next=sanitizeRewards({...profile,...changes});
  return next;
}
export function newEarnedBadges(before:RewardProfile,after:RewardProfile){
  const was=new Set(earnedBadges(before).map(b=>b.id));
  return earnedBadges(after).filter(b=>!was.has(b.id));
}
export function getFavoriteMachine(profile:RewardProfile):MachineDrawEntry|null{
  return MACHINE_EVENTS.find(m=>m.id===profile.featuredId&&profile.counts[m.id]>0)??null;
}
