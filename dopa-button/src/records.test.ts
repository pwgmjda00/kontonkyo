import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EVENTS } from './probability';
import { createRecords, recordPlay, recordSuccess, recordGameOver, saveRecords, loadRecords, sanitizeRecords, HISTORY_LIMIT, hundredTrialChance, compareRarity } from './records';

describe('honest browser records', () => {
  beforeEach(() => {
    const data = new Map<string, string>();
    vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) });
  });

  it('shares the normal/dopa best and keeps gaming separate', () => {
    let state = recordPlay(createRecords(), 'normal');
    state = recordGameOver(state, 'normal', 12);
    state = recordGameOver(state, 'dopa', 9);
    state = recordGameOver(state, 'gaming', 30);
    expect(state.best).toEqual({ shared: 12, gaming: 30 });
    expect(state.totals.plays).toBe(1);
  });

  it('counts every actual hit while bounding only history', () => {
    let state = createRecords();
    const hits = EVENTS.slice(0, 200);
    state = recordSuccess(state, { mode: 'normal', score: 1, wasStop: true, hits, at: '2026-01-01T00:00:00.000Z' });
    expect(Object.keys(state.discoveries)).toHaveLength(200);
    expect(state.history).toHaveLength(HISTORY_LIMIT);
    expect(state.totals.successes).toBe(1);
    expect(state.totals.stopSuccesses).toBe(1);
    const next = recordSuccess(state, { mode: 'dopa', score: 2, wasStop: false, hits: [hits[0]], at: '2026-01-02T00:00:00.000Z' });
    expect(next.discoveries[hits[0].id].count).toBe(2);
    expect(state.discoveries[hits[0].id].count).toBe(1);
    expect(next.discoveries[hits[0].id].firstAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('gaming never unlocks mathematical events', () => {
    const state = recordSuccess(createRecords(), { mode: 'gaming', score: 7, wasStop: true, hits: EVENTS });
    expect(state.discoveries).toEqual({});
    expect(state.history).toHaveLength(0);
    expect(state.rarestId).toBeNull();
    expect(state.best.gaming).toBe(7);
    expect(state.totals.successes).toBe(1);
  });

  it('deduplicates a repeated event within one round, not across rounds', () => {
    let state = recordSuccess(createRecords(), { mode: 'normal', score: 1, wasStop: false, hits: [EVENTS[0], EVENTS[0]] });
    expect(state.discoveries[EVENTS[0].id].count).toBe(1);
    state = recordSuccess(state, { mode: 'normal', score: 2, wasStop: false, hits: [EVENTS[0]] });
    expect(state.discoveries[EVENTS[0].id].count).toBe(2);
  });

  it('persists counters independently of truncated history', () => {
    const state = recordSuccess(recordPlay(createRecords(), 'dopa'), { mode: 'dopa', score: 1, wasStop: false, hits: EVENTS.slice(0, 220) });
    expect(saveRecords(state)).toBe(true);
    const restored = loadRecords();
    expect(restored.discoveries).toEqual(state.discoveries);
    expect(restored.history).toHaveLength(HISTORY_LIMIT);
    expect(restored.totals).toEqual(state.totals);
    expect(restored.rarestId).toEqual(state.rarestId);
  });

  it('survives corrupt or unavailable storage', () => {
    localStorage.setItem('dopa-button-records-v1', '{broken');
    expect(loadRecords()).toEqual(createRecords());
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } });
    expect(loadRecords()).toEqual(createRecords());
    expect(saveRecords(createRecords())).toBe(false);
  });

  it('ignores unknown event ids and impossible numeric values in saved state', () => {
    const state = createRecords();
    const invalid = { ...state, best: { shared: Infinity, gaming: -20 }, discoveries: { fake: { count: 100, firstAt: '2026-01-01', lastAt: '2026-01-01' } }, history: [{ eventId: 'fake', mode: 'normal', at: '2026-01-01', score: 2 }] };
    const clean = sanitizeRecords(invalid);
    expect(clean.best).toEqual({ shared: 0, gaming: 0 });
    expect(clean.discoveries).toEqual({});
    expect(clean.history).toEqual([]);
  });

  it('orders rarity with cross multiplication and calculates display-only 100-trial chance', () => {
    const event = EVENTS[0]; // 1/16.
    expect(hundredTrialChance(event)).toBeCloseTo(1 - (15 / 16) ** 100, 12);
    const tiny = EVENTS.reduce((a, b) => compareRarity(a, b) <= 0 ? a : b);
    expect(hundredTrialChance(tiny)).toBeGreaterThan(0);
    expect(hundredTrialChance(tiny)).toBeLessThan(1);
  });
});
