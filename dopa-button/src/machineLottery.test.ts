import { describe, expect, it } from 'vitest';
import { MACHINE_EVENTS, isUltraRare, drawEveryMachine, judgeContact } from './machineLottery';

describe('Real-machine jackpot catalog', () => {
  it('judges contact at touch-down, not finger release, including deadline boundaries', () => {
    expect(judgeContact('go',1499,1500)).toBe('success');
    expect(judgeContact('go',1500,1500)).toBe('failure');
    expect(judgeContact('go',1501,1500)).toBe('failure');
    expect(judgeContact('stop',1499,1500)).toBe('failure');
    expect(judgeContact('stop',1500,1500)).toBe('success');
    expect(judgeContact('stop',1501,1500)).toBe('success');
    expect(() => judgeContact('go',Number.NaN,1500)).toThrow();
  });
  it('has valid IDs and positive odds with a source for each entry', () => {
    expect(MACHINE_EVENTS.length).toBeGreaterThan(250);
    expect(new Set(MACHINE_EVENTS.map(item=>item.id)).size).toBe(MACHINE_EVENTS.length);
    for (const item of MACHINE_EVENTS) {
      expect(item.machine.length).toBeGreaterThan(0);
      expect(item.sourceUrl).toMatch(/^https:\/\//);
      expect(item.kind==='pachinko'||item.kind==='pachislot').toBe(true);
      const a=BigInt(item.numerator), b=BigInt(item.denominator);
      expect(a>0n&&a<=b).toBe(true);
    }
  });
  it('marks only odds strictly rarer than 1 in 666', () => {
    expect(isUltraRare({numerator:'1',denominator:'665'})).toBe(false);
    expect(isUltraRare({numerator:'1',denominator:'666'})).toBe(false);
    expect(isUltraRare({numerator:'1',denominator:'667'})).toBe(true);
    expect(isUltraRare({numerator:'2',denominator:'1332'})).toBe(false);
    expect(isUltraRare({numerator:'2',denominator:'1333'})).toBe(true);
  });
  it('draws each provided machine exactly once and preserves order and exact odds', () => {
    const list=MACHINE_EVENTS.slice(0,3);
    const draws=drawEveryMachine(list);
    expect(draws.length).toBe(list.length);
    expect(draws.map(x=>x.event.id)).toEqual(list.map(x=>x.id));
    expect(draws.every(x=>typeof x.hit==='boolean')).toBe(true);
  });
});
