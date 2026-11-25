import {skillRank} from './skills.mjs';
import {settleChapterBoss} from './chapter-one.mjs';
import {fixture,advance} from './simulation.mjs';
import {startBattle,advanceBattle} from './battle.mjs';
import {resources,transact} from './economy.mjs';
export function createWorld(seed=1){if(!Number.isInteger(seed)||seed<1||seed>0xffffffff)throw Error('invalid seed');return {...fixture(),rngState:seed,battle:null};}
export function engage(s,allies,enemies,reward={}){if(s.battle&&!s.battle.result)throw Error('battle active');for(const [k,v] of Object.entries(reward))if(!resources.includes(k)||!Number.isFinite(v)||v<0)throw Error('invalid reward');if(allies.some(u=>s.observers?.includes(u.id)||s.slots?.some(p=>p.worker===u.id)))throw Error('worker busy');s.battle=startBattle(allies,enemies);s.battle.reward={...reward};s.battle.settled=false;}
import {recordBattle} from "./life-record.mjs";
function settle(s){const b=s.battle;if(b?.result&&!b.settled){if(b.result==='win'){const rank=Math.max(0,...b.allies.map(u=>skillRank(u,'warrior:3')));if(rank)for(const [k,v] of Object.entries(b.reward??{})){if(k==='hp'||k==='abyss')continue;const excess=Math.max(0,s.resources[k]+v-s.caps[k]);if(excess){s.overflow??={};s.overflow[k]=Math.min(10*rank,(s.overflow[k]??0)+excess);}}transact(s,{},b.reward??{});}settleChapterBoss(s,b);recordBattle(s,b);b.settled=true;}}
// Shared clock: production precedes combat on ties. Reward can unblock production at the next interval.
export function advanceWorld(s,ms){if(!Number.isSafeInteger(ms)||ms<0)throw Error('invalid duration');settle(s);while(ms>0){const b=s.battle;const dt=b&&!b.result?Math.min(ms,...[...b.allies,...b.enemies].filter(u=>u.hp>0).map(u=>u.remaining)):ms;advance(s,dt);if(b&&!b.result)advanceBattle(b,dt,s);settle(s);ms-=dt;}return s;}

// Spend stored time on production only; never advance battle or life clocks.
export function accelerateProduction(s){
 if(!s.unlocked.includes('timeAccelerate'))throw Error('時間加速未解禁');
 if(s.battle&&!s.battle.result)throw Error('戦闘中は加速できません');
 const ids=[s.action,...(s.slots??[]).map(p=>p.id)].filter(Boolean);
 if(!ids.length)throw Error('作業を配置してください');
 if(ids.some(id=>id==='timeStore'||id==='timeAccelerate'))throw Error('時間の蓄積・変換中は加速できません');
 if(!transact(s,{time:5}))throw Error('時間が不足しています');
 const elapsed=s.elapsed,life=s.lifeElapsed;
 advance(s,s.worldFlags?.lawTime?15000:10000);
 s.elapsed=elapsed;s.lifeElapsed=life;return s;
}

// Explicit trade: no production, clock advancement, or overflow loss.
export function tradeTime(s){
 const rank=skillRank(s,'causalMerchant:1');
 if(!rank)throw Error('時間取引未習得');
 const gold=2+2*rank;
 if(s.caps.gold-s.resources.gold<gold)throw Error('金貨の空き容量不足');
 if(!transact(s,{time:2},{gold}))throw Error('時間が不足しています');
 return s;
}

// One outstanding loan and one investment; settlement is explicit and atomic.
export function borrowFuture(s){const r=skillRank(s,'causalMerchant:0');if(!r||s.futureDebt)throw Error('借入不可');const gold=10*r;if(s.caps.gold-s.resources.gold<gold)throw Error('金貨の空き容量不足');transact(s,{}, {gold});s.futureDebt=gold+5;return s;}
export function repayFuture(s){if(!s.futureDebt||!transact(s,{gold:s.futureDebt}))throw Error('返済資金不足または借入なし');delete s.futureDebt;return s;}
export function investPossibility(s){const r=skillRank(s,'causalMerchant:3');if(!r||s.possibilityInvestment||s.futureDebt)throw Error('投資不可');if(!transact(s,{causality:10}))throw Error('因果不足');s.possibilityInvestment={due:s.elapsed+60000,amount:10+2*r};return s;}
export function collectPossibility(s){const p=s.possibilityInvestment;if(!p||s.elapsed<p.due)throw Error('満期前または投資なし');if(s.caps.causality-s.resources.causality<p.amount)throw Error('因果の空き容量不足');transact(s,{}, {causality:p.amount});delete s.possibilityInvestment;return s;}

export function collectOverflow(s){for(const [k,v] of Object.entries(s.overflow??{})){const n=Math.min(v,s.caps[k]-s.resources[k]);s.resources[k]+=n;s.overflow[k]-=n;if(!s.overflow[k])delete s.overflow[k];}}
