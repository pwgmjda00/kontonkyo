import machineRecords from '../data/verified_machine_events.json';
import { sampleBelow } from './probability';

export interface MachineDrawEntry {
  id: string;
  machine: string;
  maker: string;
  kind: 'pachinko' | 'pachislot';
  category: string;
  numerator: string;
  denominator: string;
  publishedProbability: string;
  approximate: boolean;
  condition: string;
  sourceUrl: string;
  currentAvailability: string;
}
/** Real spec references, used only for trivia, never as fortune weighting. */
export const MACHINE_EVENTS: readonly MachineDrawEntry[] = machineRecords as MachineDrawEntry[];

export interface FortuneMachine {
  id: string;
  machine: string;
  maker: string;
  kind: 'pachinko' | 'pachislot';
  sourceUrl?: string;
  trivia?: string;
}
export const FORTUNE_POOL: readonly FortuneMachine[] = [
  ...new Map(MACHINE_EVENTS.map(entry => [entry.machine, {
    id: entry.id, machine: entry.machine, maker: entry.maker, kind: entry.kind,
    sourceUrl: entry.sourceUrl, trivia: entry.publishedProbability + '（' + entry.category + '）',
  }])).values(),
];

/** A fair, uniform fortune draw: exactly one machine, with no claims of prediction. */
export function chooseTodaysMachine(pool: readonly FortuneMachine[] = FORTUNE_POOL): FortuneMachine {
  if (pool.length === 0) throw new Error('占いの候補機種がありません');
  return pool[Number(sampleBelow(BigInt(pool.length)))]!;
}
