// Original pocket-arcade tones. No recordings, requests, or autoplay.
type Cue = 'count' | 'success' | 'failure' | 'bonus' | 'freeze' | 'numbers' | 'cosmos' | 'gaming' | 'mode';
type Voice = { source: OscillatorNode; gain: GainNode; music: boolean };

let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = true;
let requested = false;
let interval: ReturnType<typeof setInterval> | null = null;
let nextBeat = 0;
let beat = 0;
const voices = new Set<Voice>();
const notes = [72, 0, 76, 79, 0, 74, 72, 67, 69, 0, 72, 76, 79, 0, 74, 71];
const seconds = 60 / 138 / 2;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const canPlay = () => !muted && context?.state === 'running' && !document.hidden;

function stopVoice(voice: Voice) {
  voices.delete(voice);
  try { voice.gain.gain.cancelScheduledValues(context!.currentTime); voice.gain.gain.value = 0; } catch { /* already ended */ }
  try { voice.source.stop(); voice.source.disconnect(); voice.gain.disconnect(); } catch { /* already ended */ }
}

function clearMusic() {
  if (interval !== null) clearInterval(interval);
  interval = null;
  for (const voice of voices) if (voice.music) stopVoice(voice);
}

function silence() {
  clearMusic();
  for (const voice of voices) stopVoice(voice);
}

function tone(midi: number, when: number, duration: number, volume: number, music = false, type: OscillatorType = 'triangle') {
  if (!canPlay() || !context || !master) return;
  try {
    while (voices.size >= 32) stopVoice(voices.values().next().value!);
    const source = context.createOscillator();
    const gain = context.createGain();
    source.type = type;
    source.frequency.value = hz(midi);
    const at = Math.max(context.currentTime + .003, when);
    gain.gain.setValueAtTime(.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + .006);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(gain); gain.connect(master);
    const voice = { source, gain, music };
    voices.add(voice);
    source.onended = () => { voices.delete(voice); source.disconnect(); gain.disconnect(); };
    source.start(at); source.stop(at + duration + .01);
  } catch { /* Optional audio must never stop the game. */ }
}

function pump() {
  if (!canPlay() || !requested || !context) { clearMusic(); return; }
  if (nextBeat < context.currentTime - seconds) nextBeat = context.currentTime + .02;
  while (nextBeat < context.currentTime + .1) {
    const note = notes[beat % notes.length];
    if (note) tone(note, nextBeat, .09, .028, true, 'square');
    if (beat % 2 === 0) tone([48, 53, 55, 48][Math.floor(beat / 4) % 4], nextBeat, .16, .055, true);
    if (beat % 4 === 0) tone(29, nextBeat, .07, .06, true, 'sine');
    beat++;
    nextBeat += seconds;
  }
}

function begin() {
  if (!canPlay() || !requested || interval !== null || !context) return;
  nextBeat = context.currentTime + .02;
  pump();
  interval = setInterval(pump, 30);
}

async function unlock() {
  if (muted || document.hidden) return false;
  try {
    if (!context) {
      const Constructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) return false;
      context = new Constructor();
      master = context.createGain(); master.gain.value = .45;
      const compressor = context.createDynamicsCompressor();
      master.connect(compressor); compressor.connect(context.destination);
      context.addEventListener('statechange', () => { if (context?.state !== 'running') silence(); else begin(); });
    }
    if (context.state !== 'running') await context.resume();
    begin();
    return canPlay();
  } catch { return false; }
}

function setMuted(value: boolean) {
  muted = value;
  if (muted) {
    silence();
    try { void context?.suspend().catch(() => {}); } catch { /* no context */ }
  }
}

function setPlaying(value: boolean) {
  if (requested === value) { if (value) begin(); return; }
  requested = value;
  if (value) { beat = 0; begin(); } else clearMusic();
}

function cue(name: Cue) {
  if (!canPlay() || !context) return;
  const now = context.currentTime + .005;
  const sequences: Record<Cue, number[]> = {
    count: [72], success: [79, 86], failure: [44, 39], bonus: [72, 76, 79, 84, 88],
    freeze: [36, 0, 84], numbers: [72, 74, 76, 79, 84], cosmos: [48, 60, 72, 84],
    gaming: [79, 84, 88, 91], mode: [72, 79],
  };
  sequences[name].forEach((note, i) => { if (note) tone(note, now + i * .075, name === 'failure' ? .17 : .12, .07, false, name === 'failure' ? 'sawtooth' : 'triangle'); });
}

function suspend() {
  requested = false;
  silence();
  try { void context?.suspend().catch(() => {}); } catch { /* no context */ }
}

export const sound = { setMuted, unlock, setPlaying, cue, suspend, hush: silence };
