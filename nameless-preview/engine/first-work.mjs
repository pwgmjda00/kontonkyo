import {assign} from './automation.mjs';
import {summonPast} from './reincarnation.mjs';

// Both jobs are unlocked immediately after rebirth and contribute a warehouse resource.
export function firstJob(world) {
  const life = world.lifeHistory?.[0];
  if (!life || world.lifeHistory.length !== 1) return null;
  const jobs = [['chop','material'], ['gather','food']];
  const open = jobs.filter(([id, resource]) => world.unlocked.includes(id) &&
    world.resources[resource] < world.caps[resource]);
  open.sort(([a], [b]) => (life.levels[b] ?? 1) - (life.levels[a] ?? 1));
  return open[0]?.[0] ?? null;
}

export function beginFirstWork(world, job) {
  const life = world.lifeHistory?.[0];
  if (!world.firstWork || world.firstWork.receipt || !job || firstJob(world) !== job) {
    throw Error('今の仕事候補を確認してください');
  }
  const next = {...world, availablePast: [...(world.availablePast ?? [])]};
  summonPast(next, life.id);
  assign(next, job, life.id, 'past');
  world.availablePast = next.availablePast;
  world.slotLimits = next.slotLimits;
  world.slots = next.slots;
}
