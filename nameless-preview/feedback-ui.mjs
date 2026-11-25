import {identity} from './engine/identity.mjs';

const defaults = {music: .55, effects: .50, muted: false, reduced: false, skip: false};
const key = 'nameless-presentation-v1';
const byId = id => document.getElementById(id);
const ranks = {attack: 0, critical: 1, mastery: 2, title: 3, boss: 4};

export function setupFeedback(audio, names, bossName) {
  const settings = {...defaults};
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    for (const [id, value] of Object.entries(defaults)) {
      const next = stored?.[id];
      if (typeof value === 'boolean' ? typeof next === 'boolean' : Number.isFinite(next) && next >= 0 && next <= 1) {
        settings[id] = next;
      }
    }
  } catch {}

  const dialog = byId('rebirthScene');
  const notice = byId('feedbackNotice');
  const hit = byId('hitNotice');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let timer, noticeTimer, hitTimer, noticeKind, lastHitSound = -Infinity;
  const reduced = () => settings.reduced || motion.matches || settings.skip;
  function closeRebirth() {
    clearTimeout(timer);
    if (dialog.open) dialog.close();
    audio.stopEffects();
  }
  function update() {
    audio.configure(settings);
    document.documentElement.dataset.lowMotion = String(reduced());
    if (settings.skip) {
      hit.hidden = true;
      if (dialog.open) closeRebirth();
    }
  }
  for (const [id, value] of Object.entries(defaults)) {
    const field = byId('pref-' + id), toggle = typeof value === 'boolean';
    if (toggle) field.checked = settings[id];
    else field.value = Math.round(settings[id] * 100);
    field.addEventListener('input', () => {
      settings[id] = toggle ? field.checked : Number(field.value) / 100;
      try {localStorage.setItem(key, JSON.stringify(settings));} catch {}
      update();
    });
  }
  update();
  motion.addEventListener('change', update);
  document.addEventListener('click', () => {
    if (!settings.muted && !document.hidden) void audio.unlock();
  }, {capture: true});
  byId('rebirthSkip').onclick = closeRebirth;
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeRebirth();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (dialog.open) closeRebirth();
      notice.hidden = hit.hidden = true;
    }
  });

  function showNotice(kind, label) {
    clearTimeout(noticeTimer);
    noticeKind = kind;
    notice.dataset.kind = kind;
    notice.textContent = label;
    notice.hidden = false;
    if (!reduced()) notice.animate([{opacity: .55}, {opacity: 1}], {duration: 180});
    noticeTimer = setTimeout(() => { notice.hidden = true; }, kind === 'mastery' ? 1800 : 2700);
  }

  function showRebirth(event, title) {
    const past = identity(event.id);
    const chain = `#000 → ${past} → #000`;
    if (settings.skip) {
      audio.play('rebirth');
      showNotice('rebirth', title ? `${chain}　異名「${title}」` : chain);
      return;
    }
    byId('rebirthPast').textContent = past;
    byId('rebirthChain').setAttribute('aria-label', chain);
    byId('rebirthTitleAward').textContent = title ? `異名「${title}」` : '';
    dialog.showModal();
    audio.play('rebirth');
    timer = setTimeout(closeRebirth, 2400);
  }

  function describeHit(event) {
    return `${bossName(event.target)} −${Number(event.amount.toFixed(1))}${event.kind === 'critical' ? '　弱点・会心' : ''}`;
  }

  function publish(events) {
    if (document.hidden || byId('credits').open || dialog.open) return;
    const rebirth = events.find(event => event.kind === 'rebirth');
    if (rebirth) {
      showRebirth(rebirth, events.find(event => event.kind === 'title' && event.id === rebirth.id)?.title);
      return;
    }
    const damage = events.findLast(event => event.kind === 'critical')
      ?? events.findLast(event => event.kind === 'attack');
    if (damage && !settings.skip) {
      clearTimeout(hitTimer);
      hit.textContent = describeHit(damage);
      hit.dataset.kind = damage.kind;
      hit.hidden = false;
      if (!reduced()) hit.animate([{opacity: .45}, {opacity: 1}], {duration: 140});
      hitTimer = setTimeout(() => { hit.hidden = true; }, 850);
    }

    const milestone = events.reduce((best, event) =>
      ranks[event.kind] >= 2 && (!best || ranks[event.kind] >= ranks[best.kind]) ? event : best, null);
    if (milestone && (notice.hidden || (ranks[noticeKind] ?? 4) <= ranks[milestone.kind])) {
      const {kind, id, target, action, level, title} = milestone;
      const simultaneousTitles = events.filter(event => event.kind === 'title');
      const suffix = simultaneousTitles.length > 1 ? ` ほか${simultaneousTitles.length - 1}件` : '';
      const labels = {
        boss: kind === 'boss' ? `${bossName(target)} 撃破` : '',
        title: `${identity(id)} 異名「${title}」${suffix}`,
        mastery: `${identity(id)} ${names[action]} Lv.${level}`
      };
      const firstTitle = simultaneousTitles[0];
      showNotice(kind, kind === 'boss' && firstTitle
        ? `${labels.boss} ／ ${identity(firstTitle.id)} 異名「${firstTitle.title}」${suffix}`
        : labels[kind]);
      audio.play(kind);
    } else if (damage && performance.now() - lastHitSound >= 170) {
      lastHitSound = performance.now();
      audio.play(damage.kind);
    }
  }

  return {settings, publish, reduced};
}
