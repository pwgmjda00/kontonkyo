// Records move from the current life to its archive on rebirth. Count each actor once.
export const quests = [
  {id:'timber', name:'橋板を揃える', goal:'素材を累計18生産', need:18, item:'樫の胸当て', effect:'主人公の戦闘HP +15'},
  {id:'notes', name:'司書の余白を埋める', goal:'知識を累計45生産', need:45, item:'朱書きの戦術帖', effect:'主人公の攻撃 +8%'},
  {id:'watch', name:'夜番を引き受ける', goal:'同じ存在で戦闘を4回終える', need:4, item:'夜番の腕甲', effect:'主人公の戦闘耐性 +12'},
  {id:'relay', name:'昨日の手を借りる', goal:'過去世に仕事を1回完了してもらう', need:1, item:'二代目の留め金', effect:'主人公の戦闘HP +10%'},
  {id:'ink', name:'境界の染料を採る', goal:'深淵を累計15生産', need:15, item:'境界の砥石', effect:'主人公の攻撃 +10%'},
  {id:'thread', name:'切れた因果を繕う', goal:'因果を累計25生産', need:25, item:'継ぎ目の護符', effect:'主人公の戦闘HP +15%'},
  {id:'hand', name:'止まった時計を直す', goal:'時間を累計10生産', need:10, item:'半刻の針', effect:'主人公の初撃までの待ち時間を半減'},
  {id:'seal', name:'消える条文を写す', goal:'真理を累計20生産', need:20, item:'封蝋の栞', effect:'敵の特殊回復量を半減'},
  {id:'mirror', name:'同じ真理を読み返す', goal:'一人の真理抽出を熟練Lv.5にする', need:5, item:'曇り鏡', effect:'敵が記憶した属性で再攻撃したときの威力を80%から95%へ'}
];

export function questProgress(s) {
  const progress = {timber:0, notes:0, watch:0, relay:0, ink:0, thread:0, hand:0, seal:0, mirror:0};
  for (const actor of [s, ...(s.lifeHistory ?? [])]) {
    const production = actor.record?.production ?? {};
    progress.timber += production.material ?? 0;
    progress.notes += production.knowledge ?? 0;
    progress.watch = Math.max(progress.watch, actor.record?.battles ?? 0);
    progress.ink += production.abyss ?? 0;
    progress.thread += production.causality ?? 0;
    progress.hand += production.time ?? 0;
    progress.seal += production.truth ?? 0;
    progress.mirror = Math.max(progress.mirror, actor.levels?.truthExtract ?? 0);
    if (actor !== s && Object.keys(actor.growth ?? {}).length > 0) progress.relay = 1;
  }
  return progress;
}

export function claimItem(s, id) {
  const quest = quests.find(q => q.id === id);
  if (!quest || s.questItems?.includes(id) || questProgress(s)[id] < quest.need) return false;
  (s.questItems ??= []).push(id);
  return true;
}

export function validateItems(items) {
  if (items === undefined) return;
  if (!Array.isArray(items) || new Set(items).size !== items.length ||
      items.some(id => !quests.some(q => q.id === id))) throw Error('invalid quest items');
}

export function applyItems(hero, items = []) {
  const has = id => items.includes(id);
  hero.hp = (hero.hp + (has('timber') ? 15 : 0)) *
    (1 + (has('relay') ? .10 : 0) + (has('thread') ? .15 : 0));
  hero.attack *= 1 + (has('notes') ? .08 : 0) + (has('ink') ? .10 : 0);
  if (has('watch')) hero.resistance += 12;
  return hero;
}

export function applyEncounterItems(battle, items = []) {
  const hero = battle.allies.find(unit => unit.id === 'hero');
  if (hero && items.includes('hand')) hero.remaining = Math.ceil(hero.remaining / 2);
  if (items.includes('seal')) {
    for (const enemy of battle.enemies) {
      if (enemy.specialHeal) enemy.specialHeal /= 2;
    }
  }
  if (battle.chapterBoss === 'nameless_boss' && items.includes('mirror')) battle.cloudedMirror = true;
}
