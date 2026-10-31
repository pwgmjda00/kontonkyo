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
/** Reaction judgment uses the contact timestamp, never the eventual release/click. */
export function judgeContact(prompt:'go'|'stop', at:number, deadline:number):'success'|'failure' {
  if(!Number.isFinite(at)||!Number.isFinite(deadline))throw new Error('Invalid round timing');
  if(at>=deadline)return prompt==='stop'?'success':'failure';
  return prompt==='go'?'success':'failure';
}

/** Aggregates independently sampled model odds without changing the draws. */
export function machineRoundStatistics(events: readonly Pick<MachineDrawEntry,'numerator'|'denominator'>[] = MACHINE_EVENTS){
  let expectedHits=0;
  let none=1;
  for(const entry of events){
    const p=Number(entry.numerator)/Number(entry.denominator);
    if(!Number.isFinite(p)||p<0||p>1)throw new RangeError('Invalid chance in model catalog');
    expectedHits+=p;
    none*=1-p;
  }
  return {expectedHits,atLeastOne:1-none};
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
