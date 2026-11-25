import {settleChapterBoss} from './chapter-one.mjs';
import {fixture,advance} from './simulation.mjs';
import {startBattle,advanceBattle} from './battle.mjs';
import {resources,transact} from './economy.mjs';
export function createWorld(seed=1){if(!Number.isInteger(seed)||seed<1||seed>0xffffffff)throw Error('invalid seed');return {...fixture(),rngState:seed,battle:null};}
export function engage(s,allies,enemies,reward={}){if(s.battle&&!s.battle.result)throw Error('battle active');for(const [k,v] of Object.entries(reward))if(!resources.includes(k)||!Number.isFinite(v)||v<0)throw Error('invalid reward');if(allies.some(u=>s.observers?.includes(u.id)||s.slots?.some(p=>p.owner==='companion'&&p.worker===u.id)))throw Error('worker busy');s.battle=startBattle(allies,enemies);s.battle.reward={...reward};s.battle.settled=false;}
function settle(s){const b=s.battle;if(b?.result&&!b.settled){if(b.result==='win')transact(s,{},b.reward??{});settleChapterBoss(s,b);b.settled=true;}}
// Shared clock: production precedes combat on ties. Reward can unblock production at the next interval.
export function advanceWorld(s,ms){if(!Number.isSafeInteger(ms)||ms<0)throw Error('invalid duration');settle(s);while(ms>0){const b=s.battle;const dt=b&&!b.result?Math.min(ms,...[...b.allies,...b.enemies].filter(u=>u.hp>0).map(u=>u.remaining)):ms;advance(s,dt);if(b&&!b.result)advanceBattle(b,dt);settle(s);ms-=dt;}return s;}
