import {createWorld, advanceWorld} from './engine/world.mjs';
import {select} from './engine/simulation.mjs';
import {duration} from './engine/automation.mjs';
import {challenge} from './engine/chapter-one.mjs';

export function trialWorld() {
  const world = createWorld();
  function perform(...jobs) {
    for (const job of jobs) {
      select(world, job);
      advanceWorld(world, duration(world, job));
    }
  }
  for (let i = 0; i < 16; i++) perform('rest', 'chop');
  for (let i = 0; i < 5; i++) perform('rest', 'work');
  perform('build');
  for (let i = 0; i < 10; i++) perform('rest', 'read');
  perform('rest', 'well', 'star');
  for (let i = 0; i < 15; i++) perform('rest', 'gather', 'rest', 'train');
  challenge(world, 'well_guard');
  advanceWorld(world, 60000);
  return world;
}
