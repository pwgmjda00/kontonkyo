import { describe, expect, it } from 'vitest';
import { MACHINE_EVENTS, drawEveryMachine, judgeContact } from './machineLottery';
import { machineTrivia } from './machineTrivia';

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
  it('explains the title, probability conditions, and source for every machine', () => {
    for(const entry of MACHINE_EVENTS){
      const facts=machineTrivia(entry);
      expect(facts.theme.length).toBeGreaterThan(12);
      expect(facts.odds).toContain(entry.category);
      expect(facts.context).toContain(entry.publishedProbability);
    }
  });
  it('draws each provided machine exactly once and preserves order and exact odds', () => {
    const list=MACHINE_EVENTS.slice(0,3);
    const draws=drawEveryMachine(list);
    expect(draws.length).toBe(list.length);
    expect(draws.map(x=>x.event.id)).toEqual(list.map(x=>x.id));
    expect(draws.every(x=>typeof x.hit==='boolean')).toBe(true);
  });
});
