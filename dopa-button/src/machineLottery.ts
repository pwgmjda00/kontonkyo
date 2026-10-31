import machineRecords from '../data/verified_machine_events.json';
import { drawRational } from './probability';

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
export const MACHINE_EVENTS: readonly MachineDrawEntry[] = machineRecords as MachineDrawEntry[];
/** Strictly rarer than 1/666 (not equal). Exact integer comparison. */
export function isUltraRare(event: Pick<MachineDrawEntry, 'numerator' | 'denominator'>): boolean {
  return BigInt(event.numerator) * 666n < BigInt(event.denominator);
}
export interface MachineHit { event: MachineDrawEntry; hit: boolean }
export function drawEveryMachine(events: readonly MachineDrawEntry[] = MACHINE_EVENTS): MachineHit[] {
  return events.map(event => {
    const numerator = BigInt(event.numerator);
    const denominator = BigInt(event.denominator);
    if (numerator < 0n || denominator <= 0n || numerator > denominator) throw new Error('Invalid machine odds: ' + event.id);
    return {event, hit: drawRational(numerator, denominator)};
  });
}
