import {earnedTitles} from './engine/titles.mjs';

export function feedbackSnapshot(world) {
  const battle = world.battle;
  const lives = new Map();
  for (const life of [{...world, id: 'hero', elapsed: world.lifeElapsed}, ...(world.lifeHistory ?? [])]) {
    lives.set(life.id, {
      levels: {...life.levels},
      titles: new Set(earnedTitles(life).map(title => title.id))
    });
  }
  return {battle, result: battle?.result, lastEvent: battle?.events?.at(-1), lives};
}

export function feedbackEvents(before, world) {
  const events = [];
  const battle = world.battle;
  if (battle) {
    const log = battle.events ?? [];
    const index = battle === before.battle && before.lastEvent ? log.indexOf(before.lastEvent) : -1;
    for (const hit of log.slice(index + 1)) {
      if (hit.kind === 'damage') events.push({...hit, kind: hit.critical ? 'critical' : 'attack'});
    }
    if (battle.chapterBoss && battle.settled && battle.result === 'win' &&
        (battle !== before.battle || before.result !== 'win')) {
      events.push({kind: 'boss', target: battle.chapterBoss});
    }
  }
  const reborn = (world.lifeHistory ?? []).find(life => !before.lives.has(life.id));
  if (reborn) events.push({kind: 'rebirth', id: reborn.id});
  for (const life of [{...world, id: 'hero', elapsed: world.lifeElapsed}, ...(world.lifeHistory ?? [])]) {
    const previous = before.lives.get(reborn?.id === life.id ? 'hero' : life.id);
    if (!previous || (reborn && life.id === 'hero')) continue;
    for (const [action, level] of Object.entries(life.levels ?? {})) {
      if (level > (previous.levels[action] ?? 1)) {
        events.push({kind: 'mastery', id: life.id, action, level});
      }
    }
    for (const title of earnedTitles(life)) {
      if (!previous.titles.has(title.id)) events.push({kind: 'title', id: life.id, title: title.name});
    }
  }
  return events;
}
