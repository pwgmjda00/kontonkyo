import { describe, expect, it } from 'vitest';
import rawEvents from '../data/probability_events_1026.json';
import { EVENTS, compareRarity, createCryptoWordSource, drawRational, isBonusEligible, loadEvents, mostRare, rollGaming, rollRound, sampleBelow } from './probability';
import type { ProbabilityEvent, WordSource } from './probability';

function words(...values: number[]): WordSource {
  let cursor = 0;
  return () => {
    if (cursor >= values.length) throw new Error('Test exhausted RNG words');
    return values[cursor++]!;
  };
}
function seeded(seed = 123456789): WordSource {
  return () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return seed >>> 0;
  };
}
function event(id: string, numerator: string, denominator: string): ProbabilityEvent {
  return { id, family: 'test', title: id, condition: 'Test', numerator, denominator, probability: `${numerator}/${denominator}`,
    fact: 'Test', animationId: 'freeze', sourceStatus: 'mathematical', verified: true, bonusEligible: BigInt(numerator) * 257n <= BigInt(denominator) };
}

describe('ZIP data and explicit adapter', () => {
  it('loads all 1026 independent mathematical events, 18 families × 57, without rounding', () => {
    expect(EVENTS).toHaveLength(1026);
    expect(new Set(EVENTS.map(item => item.id)).size).toBe(1026);
    const families = new Map<string, number>();
    for (const item of EVENTS) {
      expect(typeof item.numerator).toBe('string'); expect(typeof item.denominator).toBe('string');
      const a = BigInt(item.numerator); const b = BigInt(item.denominator);
      expect(a > 0n && a <= b).toBe(true);
      expect(item.bonusEligible).toBe(a * 257n <= b);
      families.set(item.family, (families.get(item.family) || 0) + 1);
    }
    expect(families.size).toBe(18);
    expect([...families.values()].every(count => count === 57)).toBe(true);
    expect(EVENTS.filter(isBonusEligible)).toHaveLength(642);
    expect(Math.max(...EVENTS.map(item => item.denominator.length))).toBe(143);
    expect(EVENTS[0]).toEqual(rawEvents[0]);
    expect(Object.isFrozen(EVENTS)).toBe(true);
  });
  it('rejects duplicate IDs, malformed rational strings, invalid range, and inconsistent BONUS metadata', () => {
    expect(() => loadEvents([rawEvents[0], rawEvents[0]])).toThrow(/Duplicate/);
    expect(() => loadEvents([{ ...rawEvents[0], numerator: 1 }])).toThrow();
    expect(() => loadEvents([{ ...rawEvents[0], denominator: '0' }])).toThrow(/range/);
    expect(() => loadEvents([{ ...rawEvents[0], numerator: '100' }])).toThrow(/range/);
    expect(() => loadEvents([{ ...rawEvents[0], probability: '1/17' }])).toThrow(/Inconsistent/);
    expect(() => loadEvents([{ ...rawEvents[0], bonusEligible: true }])).toThrow(/BONUS/);
  });
  it('does not treat 1026 as an upper limit for later verified mathematical events', () => {
    const expanded = [...rawEvents, { ...rawEvents[0], id: 'EV1027' }];
    expect(loadEvents(expanded)).toHaveLength(1027);
  });
  it('uses the exact inclusive 1/257 boundary', () => {
    expect(isBonusEligible(event('a', '1', '257'))).toBe(true);
    expect(isBonusEligible(event('b', '2', '514'))).toBe(true);
    expect(isBonusEligible(event('c', '1', '256'))).toBe(false);
    const huge = 10n ** 100n;
    expect(isBonusEligible(event('d', String(huge), String(257n * huge - 1n)))).toBe(false);
    expect(isBonusEligible(event('e', String(huge), String(257n * huge)))).toBe(true);
  });
});

describe('unbiased BigInt sampling', () => {
  it('rejects the incomplete interval instead of reducing modulo the bound', () => {
    expect(sampleBelow(6n, words(7, 6, 5))).toBe(5n);
    expect(sampleBelow(99n, words(127, 126, 99, 98))).toBe(98n);
    expect(sampleBelow(1n, () => { throw new Error('No entropy needed'); })).toBe(0n);
    expect(sampleBelow(8n, words(7))).toBe(7n);
    expect(() => sampleBelow(0n)).toThrow();
  });
  it('handles integers beyond safe Number range without rounding at a decision boundary', () => {
    const denominator = (1n << 65n) + 1n;
    expect(sampleBelow(denominator, words(2, 0, 0))).toBe(1n << 65n);
    expect(drawRational(1n << 65n, denominator, words(2, 0, 0))).toBe(false);
    expect(drawRational(1n << 65n, denominator, words(1, 0xffffffff, 0xffffffff))).toBe(true);
    expect(drawRational(0n, denominator, () => { throw new Error('No draw'); })).toBe(false);
    expect(drawRational(denominator, denominator, () => { throw new Error('No draw'); })).toBe(true);
    expect(() => drawRational(2n, 1n)).toThrow();
  });
  it('rejects invalid RNG values and invalid crypto pool sizes', () => {
    expect(() => sampleBelow(3n, words(-1))).toThrow(/unsigned/);
    expect(() => sampleBelow(3n, words(.5))).toThrow(/unsigned/);
    expect(() => createCryptoWordSource(16385)).toThrow();
    expect(() => createCryptoWordSource(0)).toThrow();
  });
  it('is statistically consistent with a uniform six-way draw, using a broad deterministic tolerance', () => {
    const rng = seeded(777);
    const bins = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60000; i++) bins[Number(sampleBelow(6n, rng))]!++;
    for (const count of bins) expect(Math.abs(count - 10000)).toBeLessThan(500);
  });
});

describe('independent wins and presentation', () => {
  it('draws equal-valued events separately rather than selecting one event', () => {
    const result = rollRound([event('a', '1', '2'), event('b', '1', '2'), event('c', '1', '2')], words(0, 1, 0, 98));
    expect(result.hits.map(item => item.id)).toEqual(['a', 'c']);
    expect(result.trigger).toBe(false);
    expect(result.candidate).toBe(null);
  });
  it('records all 1026 winners even when the presentation trigger misses', () => {
    let calls = 0;
    const eventWords = EVENTS.reduce((sum, item) => sum + Math.ceil((BigInt(item.denominator) - 1n).toString(2).length / 32), 0);
    const result = rollRound(EVENTS, () => { calls++; return calls <= eventWords ? 0 : 98; });
    expect(result.hits).toHaveLength(1026);
    expect(result.trigger).toBe(false);
    expect(result.candidate).toBe(null);
    expect(calls).toBeGreaterThan(1026);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
  it('trigger miss cannot suppress an independently recorded rare real win', () => {
    const result = rollRound([event('rare', '1', '1024')], words(0, 98));
    expect(result.hits.map(item => item.id)).toEqual(['rare']);
    expect(result.trigger).toBe(false);
    expect(result.candidate).toBe(null);
    expect(result.theater).toBe(false);
  });
  it('a trigger without an eligible win is theater, not a new discovery', () => {
    const result = rollRound([event('rare', '1', '1024')], words(900, 0));
    expect(result.hits).toEqual([]);
    expect(result.trigger).toBe(true);
    expect(result.candidate).toBe(null);
    expect(result.theater).toBe(true);
    const common = rollRound([event('common', '1', '2')], words(0, 0));
    expect(common.hits).toHaveLength(1);
    expect(common.candidate).toBe(null);
    expect(common.theater).toBe(true);
  });
  it('chooses the smallest rational among real BONUS wins with huge values', () => {
    const a = event('a', '1', '9007199254740993');
    const b = event('b', '1', '9007199254740994');
    expect(compareRarity(a, b)).toBeGreaterThan(0);
    expect(mostRare([a, b])).toBe(b);
    expect(mostRare([])).toBe(null);
    const result = rollRound([event('rare', '1', '1024'), event('rarer', '1', '2048')], words(0, 0, 0));
    expect(result.candidate?.id).toBe('rarer');
  });
  it('presentation frequency is about 1/99 and independent of real event wins', () => {
    const rng = seeded(20261031);
    let triggers = 0; let wins = 0; let joint = 0;
    for (let i = 0; i < 99000; i++) {
      const result = rollRound([event('half', '1', '2')], rng);
      if (result.trigger) triggers++;
      if (result.hits.length) wins++;
      if (result.trigger && result.hits.length) joint++;
    }
    expect(Math.abs(triggers - 1000)).toBeLessThan(180);
    expect(Math.abs(wins - 49500)).toBeLessThan(1800);
    expect(Math.abs(joint - 500)).toBeLessThan(130);
  });
  it('runs all events using actual crypto entropy and measures complete-round processing', () => {
    const rng = createCryptoWordSource();
    const durations: number[] = [];
    for (let i = 0; i < 30; i++) {
      const result = rollRound(EVENTS, rng);
      durations.push(result.durationMs);
      expect(result.hits.every(hit => EVENTS.includes(hit))).toBe(true);
      expect(result.trigger || result.candidate === null).toBe(true);
    }
    durations.sort((a, b) => a - b);
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    console.info(`1026-event crypto round: mean ${mean.toFixed(2)} ms; p95 ${durations[28]!.toFixed(2)} ms; max ${durations[29]!.toFixed(2)} ms (${durations.length} rounds, Node)`);
  });
});

describe('gaming-only presentation', () => {
  it('uses exclusive exact 5/20/75 categories at their boundaries', () => {
    expect(rollGaming(words(0))).toBe('super'); expect(rollGaming(words(4))).toBe('super');
    expect(rollGaming(words(5))).toBe('hot'); expect(rollGaming(words(24))).toBe('hot');
    expect(rollGaming(words(25))).toBe('normal'); expect(rollGaming(words(99))).toBe('normal');
    expect(rollGaming(words(127, 100, 0))).toBe('super');
  });
  it('matches broad statistical tolerances without requiring fixed random results', () => {
    const rng = seeded(654321);
    const counts = { super: 0, hot: 0, normal: 0 };
    for (let i = 0; i < 40000; i++) counts[rollGaming(rng)]++;
    expect(Math.abs(counts.super - 2000)).toBeLessThan(300);
    expect(Math.abs(counts.hot - 8000)).toBeLessThan(600);
    expect(Math.abs(counts.normal - 30000)).toBeLessThan(900);
  });
});
