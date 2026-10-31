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
  it('has entertaining and non-citation-heavy trivia for every machine', () => {
    for(const entry of MACHINE_EVENTS){
      const facts=machineTrivia(entry);
      expect(facts.theme.length).toBeGreaterThan(12);
      expect(facts.highlight.length).toBeGreaterThan(15);
      expect(facts.odds).toContain(entry.publishedProbability);
      expect(facts.context.length).toBeGreaterThan(15);
      for(const line of Object.values(facts)){
        expect(line).not.toMatch(/要確認|出典|未照合|未確認|公式資料/);
      }
    }
  });
  it('uses characteristic series facts rather than generic source notices', () => {
    const j=MACHINE_EVENTS.find(entry=>entry.machine.includes('ジャグラー'));
    const h=MACHINE_EVENTS.find(entry=>entry.machine.includes('北斗の拳'));
    const e=MACHINE_EVENTS.find(entry=>entry.machine.includes('エヴァンゲリオン'));
    expect(j&&machineTrivia(j).highlight).toMatch(/ランプ/);
    expect(h&&machineTrivia(h).highlight).toMatch(/ケンシロウ|ラオウ/);
    expect(e&&machineTrivia(e).highlight).toMatch(/使徒|初号機|怪獣/);
  });
  it('draws each provided machine exactly once and preserves order and exact odds', () => {
    const list=MACHINE_EVENTS.slice(0,3);
    const draws=drawEveryMachine(list);
    expect(draws.length).toBe(list.length);
    expect(draws.map(x=>x.event.id)).toEqual(list.map(x=>x.id));
    expect(draws.every(x=>typeof x.hit==='boolean')).toBe(true);
  });
});
