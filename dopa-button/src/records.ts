import { EVENTS, EVENT_BY_ID, type ProbabilityEvent } from './probability';

export type Mode = 'normal' | 'dopa' | 'gaming';
export const RECORDS_KEY = 'dopa-button-records-v1';
export const HISTORY_LIMIT = 100;
const MAX_COUNT = Number.MAX_SAFE_INTEGER;

export interface Discovery {
  count: number;
  firstAt: string;
  lastAt: string;
}

export interface HitHistory {
  id: string;
  eventId: string;
  at: string;
  mode: 'normal' | 'dopa';
  score: number;
}

export interface ModeStats {
  plays: number;
  successes: number;
  stopSuccesses: number;
}

export interface RecordState {
  version: 1;
  best: { shared: number; gaming: number };
  totals: ModeStats;
  modes: Record<Mode, ModeStats>;
  discoveries: Record<string, Discovery>;
  rarestId: string | null;
  history: HitHistory[];
}

/** Optional real-machine records have their own conditions; never enter the math draw. */
export interface MachineReference {
  id: string;
  name: string;
  maker: string;
  model: string | null;
  introduced: string | null;
  probability: { numerator: string; denominator: string; condition: string; approximate: boolean };
  sourceUrl: string;
  checkedAt: string;
}
export const MACHINE_REFERENCES: readonly MachineReference[] = [];

function stats(): ModeStats { return { plays: 0, successes: 0, stopSuccesses: 0 }; }
export function createRecords(): RecordState {
  return {
    version: 1,
    best: { shared: 0, gaming: 0 },
    totals: stats(),
    modes: { normal: stats(), dopa: stats(), gaming: stats() },
    discoveries: {},
    rarestId: null,
    history: [],
  };
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_COUNT, Math.floor(value))) : 0;
}
function increment(value: number, amount = 1): number { return Math.min(MAX_COUNT, value + amount); }
function readStats(value: unknown): ModeStats {
  const source = value && typeof value === 'object' ? value as Partial<ModeStats> : {};
  return { plays: count(source.plays), successes: count(source.successes), stopSuccesses: count(source.stopSuccesses) };
}
function timestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 40 || !Number.isFinite(Date.parse(value))) return null;
  return value;
}
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }

/** Compare rational probabilities without passing their integers through Number. */
export function compareRarity(a: ProbabilityEvent, b: ProbabilityEvent): number {
  const left = BigInt(a.numerator) * BigInt(b.denominator);
  const right = BigInt(b.numerator) * BigInt(a.denominator);
  return left < right ? -1 : left > right ? 1 : 0;
}
function rarest(discoveries: Record<string, Discovery>): string | null {
  let result: ProbabilityEvent | undefined;
  for (const event of EVENTS) {
    if (!discoveries[event.id]?.count) continue;
    if (!result || compareRarity(event, result) < 0) result = event;
  }
  return result?.id ?? null;
}

/** Sanitize storage instead of trusting old or manually edited browser state. */
export function sanitizeRecords(input: unknown): RecordState {
  const result = createRecords();
  if (!object(input) || input.version !== 1) return result;
  if (object(input.best)) result.best = { shared: count(input.best.shared), gaming: count(input.best.gaming) };
  if (object(input.modes)) {
    for (const mode of ['normal', 'dopa', 'gaming'] as const) result.modes[mode] = readStats(input.modes[mode]);
  }
  // Totals are derived from the mode aggregates so a corrupt value cannot disagree.
  for (const mode of Object.values(result.modes)) {
    result.totals.plays = increment(result.totals.plays, mode.plays);
    result.totals.successes = increment(result.totals.successes, mode.successes);
    result.totals.stopSuccesses = increment(result.totals.stopSuccesses, mode.stopSuccesses);
  }
  if (object(input.discoveries)) {
    for (const event of EVENTS) {
      const entry = input.discoveries[event.id];
      if (!object(entry)) continue;
      const firstAt = timestamp(entry.firstAt);
      const lastAt = timestamp(entry.lastAt);
      const amount = count(entry.count);
      if (amount && firstAt && lastAt) result.discoveries[event.id] = { count: amount, firstAt, lastAt };
    }
  }
  if (Array.isArray(input.history)) {
    for (const entry of input.history.slice(-HISTORY_LIMIT)) {
      if (!object(entry) || typeof entry.eventId !== 'string' || !EVENT_BY_ID.has(entry.eventId)) continue;
      if (entry.mode !== 'normal' && entry.mode !== 'dopa') continue;
      const at = timestamp(entry.at);
      if (!at || !result.discoveries[entry.eventId]) continue;
      result.history.push({ id: `${at}-${entry.eventId}-${result.history.length}`, eventId: entry.eventId, at, mode: entry.mode, score: count(entry.score) });
    }
  }
  result.rarestId = rarest(result.discoveries);
  return result;
}

export function loadRecords(): RecordState {
  try { return sanitizeRecords(JSON.parse(localStorage.getItem(RECORDS_KEY) ?? 'null')); }
  catch { return createRecords(); }
}
/** Returns false if persistence is unavailable; the in-memory record still works. */
export function saveRecords(records: RecordState): boolean {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); return true; }
  catch { return false; }
}

function updateStats(state: RecordState, mode: Mode, changes: Partial<ModeStats>): RecordState {
  const modeStats = { ...state.modes[mode] };
  const totals = { ...state.totals };
  for (const key of ['plays', 'successes', 'stopSuccesses'] as const) {
    if (changes[key]) {
      modeStats[key] = increment(modeStats[key], changes[key]);
      totals[key] = increment(totals[key], changes[key]);
    }
  }
  return { ...state, totals, modes: { ...state.modes, [mode]: modeStats } };
}
export function recordPlay(state: RecordState, mode: Mode): RecordState { return updateStats(state, mode, { plays: 1 }); }
export function recordGameOver(state: RecordState, mode: Mode, score: number): RecordState {
  const key = mode === 'gaming' ? 'gaming' : 'shared';
  return { ...state, best: { ...state.best, [key]: Math.max(state.best[key], count(score)) } };
}

export interface SuccessRecord {
  mode: Mode;
  score: number;
  wasStop: boolean;
  hits: readonly ProbabilityEvent[];
  at?: string;
}
export function recordSuccess(state: RecordState, outcome: SuccessRecord): RecordState {
  const { mode } = outcome;
  let next = updateStats(state, mode, { successes: 1, stopSuccesses: outcome.wasStop ? 1 : 0 });
  next = recordGameOver(next, mode, outcome.score);
  // Gaming awards are theatrical only, even if the caller accidentally supplies hits.
  if (mode === 'gaming') return next;
  const at = timestamp(outcome.at) ?? new Date().toISOString();
  const discoveries = { ...state.discoveries };
  const history = [...state.history];
  const seen = new Set<string>();
  for (const hit of outcome.hits) {
    const event = EVENT_BY_ID.get(hit.id);
    if (!event || seen.has(event.id)) continue;
    seen.add(event.id);
    const previous = discoveries[event.id];
    discoveries[event.id] = { count: increment(previous?.count ?? 0), firstAt: previous?.firstAt ?? at, lastAt: at };
    history.push({ id: `${at}-${event.id}-${outcome.score}`, eventId: event.id, at, mode, score: count(outcome.score) });
  }
  return { ...next, discoveries, rarestId: rarest(discoveries), history: history.slice(-HISTORY_LIMIT) };
}

/** Display-only approximation. Sampling never uses this conversion. */
export function hundredTrialChance(event: ProbabilityEvent): number {
  const n = event.numerator.replace(/^0+/, '') || '0';
  const d = event.denominator.replace(/^0+/, '') || '1';
  const np = n.slice(0, 16), dp = d.slice(0, 16);
  const mantissaN = Number(np) / 10 ** (np.length - 1);
  const mantissaD = Number(dp) / 10 ** (dp.length - 1);
  const p = Math.max(0, Math.min(1, mantissaN / mantissaD * 10 ** (n.length - d.length)));
  return p === 1 ? 1 : -Math.expm1(100 * Math.log1p(-p));
}
