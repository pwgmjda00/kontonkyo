// Original variations on the ending motif; no external assets.
export const chapterScores=[[48,55,60,64,67,64,60,55],[48,55,62,64,67,62,60,55],[48,54,60,63,66,63,54,48],[48,55,60,55,62,55,60,55],[48,55,62,67,71,67,62,55],[48,55,62,60,55,52,48,null]];
export function musicScene(s,credits=false,hidden=false){return credits||hidden?null:s.battle&&!s.battle.result?'battle':`chapter${Math.max(1,Math.min(6,s.chapter||1))}`;}

const cues = {
  attack: [[42, 0, .09, .13, 'triangle']],
  critical: [[53, 0, .12, .15, 'triangle'], [77, .025, .19, .08]],
  mastery: [[67, 0, .16, .10], [72, .09, .23, .10]],
  title: [[60, 0, .25, .11], [67, .08, .30, .10], [76, .17, .38, .09]],
  rebirth: [[48, 0, .52, .15], [55, .65, .62, .14], [72, 1.30, .65, .12]],
  boss: [[43, 0, .44, .17, 'triangle'], [55, .12, .42, .10], [67, .32, .62, .10]]
};

export function gameAudio() {
  let ctx, bgm, sfx, timer, scene = null, index = 0, enabled = false;
  let musicVolume = .55, effectVolume = .50, muted = false;
  const musicVoices = new Set(), effectVoices = new Set();

  function stopVoices(voices) {
    for (const voice of voices) voice.stop();
    voices.clear();
  }

  function tone(bus, voices, note, time, length, volume, type = 'sine', attack = .012) {
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, time + length);
    oscillator.connect(gain).connect(bus);
    voices.add(oscillator);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(time);
    oscillator.stop(time + length + .02);
  }

  function beat() {
    if (ctx?.state !== 'running') return;
    const battle = scene === 'battle';
    const notes = battle ? [48,55,48,58,48,55,51,58] : chapterScores[Number(scene.slice(7)) - 1];
    const note = notes[index++ % notes.length];
    if (note === null) return;
    for (const [offset, volume] of [[0,.065],[-12,.025],[7,.012]]) {
      tone(bgm, musicVoices, note + offset, ctx.currentTime, battle ? .65 : 2, volume, 'sine', .09);
    }
  }

  function refresh() {
    clearInterval(timer);
    stopVoices(musicVoices);
    if (!scene || muted) stopVoices(effectVoices);
    if (enabled && scene && !muted && musicVolume && ctx?.state === 'running') {
      beat();
      timer = setInterval(beat, scene === 'battle' ? 400 : 1000);
    }
  }

  function applyVolumes() {
    if (!ctx) return;
    bgm.gain.setTargetAtTime(muted ? 0 : musicVolume, ctx.currentTime, .015);
    sfx.gain.setTargetAtTime(muted ? 0 : effectVolume, ctx.currentTime, .015);
  }

  async function unlock() {
    try {
      if (!ctx) {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) return false;
        ctx = new Audio();
        bgm = ctx.createGain();
        sfx = ctx.createGain();
        bgm.gain.value = muted ? 0 : musicVolume;
        sfx.gain.value = muted ? 0 : effectVolume;
        bgm.connect(ctx.destination);
        sfx.connect(ctx.destination);
      }
      if (ctx.state !== 'running') {
        await ctx.resume();
        if (enabled && ctx.state === 'running') refresh();
      }
      return ctx.state === 'running';
    } catch { return false; }
  }

  return {
    unlock,
    async start() { enabled = await unlock(); refresh(); return enabled; },
    stop() { enabled = false; refresh(); },
    setScene(next) {
      if (next === scene) return;
      scene = next;
      index = 0;
      refresh();
    },
    configure(settings) {
      const refreshMusic = muted !== settings.muted || Boolean(musicVolume) !== Boolean(settings.music);
      muted = settings.muted;
      musicVolume = settings.music;
      effectVolume = settings.effects;
      applyVolumes();
      if (!effectVolume) stopVoices(effectVoices);
      if (refreshMusic) refresh();
    },
    stopEffects() { stopVoices(effectVoices); },
    play(kind) {
      if (muted || !effectVolume || !scene || ctx?.state !== 'running') return;
      for (const [note, offset, length, volume, type] of cues[kind]) {
        tone(sfx, effectVoices, note, ctx.currentTime + offset, length, volume, type);
      }
    }
  };
}
