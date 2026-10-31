import { describe, expect, it } from 'vitest';
import { MACHINE_EVENTS, drawEveryMachine, judgeContact, machineRoundStatistics } from './machineLottery';
import { machineTrivia } from './machineTrivia';
import { machineEmojiPack, emojiBurst, firstTimeMachineHits } from './machineEmoji';

describe('Real-machine jackpot catalog', () => {
  it('shows simultaneous probability honestly without inflating single-machine draws', () => {
    const stats=machineRoundStatistics([{numerator:'1',denominator:'2'},{numerator:'1',denominator:'4'}]);
    expect(stats.expectedHits).toBeCloseTo(0.75,12);
    expect(stats.atLeastOne).toBeCloseTo(0.625,12);
    const real=machineRoundStatistics();
    expect(real.expectedHits).toBeGreaterThan(0);
    expect(real.atLeastOne).toBeGreaterThan(0);
    expect(real.atLeastOne).toBeLessThan(1);
  });
  it('never converts common bells or CZ odds into jackpot odds', () => {
    const cases = [
      ['スマスロ 押忍！番長4',259.5,'AT初当たり'],
      ['グレートキングハナハナ-30',186,'ボーナス合算'],
      ['スマスロ からくりサーカス',564,'AT初当たり'],
    ] as const;
    for(const [title,denominator,category] of cases){
      const x=MACHINE_EVENTS.find(event=>event.machine===title);
      expect(x,title+' missing').toBeDefined();
      expect(x&&Number(x.denominator)/Number(x.numerator)).toBeCloseTo(denominator,5);
      expect(x?.category).toContain(category);
    }
    expect(MACHINE_EVENTS.filter(x=>x.category.includes('約（設定1参考値）'))).toHaveLength(0);
  });
  it('does not double-count known machine-title aliases', () => {
    const deprecated=[
      'pachiflow-202610-006','pachiflow-202610-010','pachiflow-202610-015',
      'pachiflow-202610-023','pachiflow-202610-033',
      'sync-022fc587f2f37d10','sync-48a3cb6f40861ff9'
    ];
    for(const id of deprecated)expect(MACHINE_EVENTS.some(x=>x.id===id),id).toBe(false);
  });
  it('assigns title-specific emoji themes to every currently listed machine', () => {
    const tokens=new Set<string>();
    for(const machine of MACHINE_EVENTS){
      const pack=machineEmojiPack(machine);
      expect(pack.recognized, machine.machine+' lacked a dedicated emoji motif').toBe(true);
      expect(pack.icons.length).toBeGreaterThanOrEqual(5);
      expect(pack.chant.length).toBeGreaterThan(20);
      tokens.add(pack.icons[0]);
      expect(emojiBurst(pack,12)).toHaveLength(12);
    }
    expect(tokens.size).toBeGreaterThan(35);
    const tokyo=MACHINE_EVENTS.find(x=>x.machine.includes('東京リベンジャーズ'));
    expect(tokyo).toBeDefined();
    if(tokyo){
      const e=machineEmojiPack(tokyo);
      expect(e.icons).toContain('卍');
      expect(e.icons).toContain('🏍️');
      expect(e.chant).toContain('マイキー');
    }
  });
  it('pauses only for first-time hits while repeat machines stay in the rapid flow', () => {
    const [a,b]=MACHINE_EVENTS.slice(0,2);
    const results=[{event:a,hit:true},{event:b,hit:true},{event:a,hit:true},{event:b,hit:false}];
    expect(firstTimeMachineHits(results,new Set()).map(x=>x.event.id)).toEqual([a.id,b.id]);
    expect(firstTimeMachineHits(results,new Set([a.id])).map(x=>x.event.id)).toEqual([b.id]);
    expect(firstTimeMachineHits(results,new Set([a.id,b.id]))).toEqual([]);
    expect(emojiBurst(machineEmojiPack(a),99)).toHaveLength(14);
  });
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
