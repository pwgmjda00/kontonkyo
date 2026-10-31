import type { MachineDrawEntry, MachineHit } from './machineLottery';

export type VirtualKind = 'pachinko' | 'pachislot';
export interface WalletSettings {
  /** Pachinko baseline break-even spins per 250 balls; not an individual machine's published border. */
  pachinkoBorder: number;
  /** Actual simulated spins per 250 balls. */
  pachinkoSpins: number;
  /** Assumed slot theoretical payout percentage; not an individual machine's published percentage. */
  slotReturnPct: number;
  /** Assumed normal-state spins per 50 medals, including average small-role payouts. */
  slotGamesPer50: number;
}
export const DEFAULT_WALLET_SETTINGS: Readonly<WalletSettings> = Object.freeze({
  pachinkoBorder: 18,
  pachinkoSpins: 18,
  slotReturnPct: 97,
  slotGamesPer50: 32,
});
export interface VirtualWallet {
  /** Cumulative independent machine spins, not physical button presses. */
  spins: number;
  rounds: number;
  wins: number;
  /** Gross input units: balls effectively spent to create one spin, or slot medals BET. */
  wagerUnits: number;
  /** All credits/balls won, including normal-role baseline return for slot. */
  payoutUnits: number;
  /** Only jackpot/bonus credit, excluding the normal-role baseline on slots. */
  hitPayoutUnits: number;
  /** Virtual cash borrowed in ¥1,000 blocks; never real money. */
  cashDepositedYen: number;
}
export function emptyVirtualWallet(): VirtualWallet {
  return {spins:0,rounds:0,wins:0,wagerUnits:0,payoutUnits:0,hitPayoutUnits:0,cashDepositedYen:0};
}
export const UNIT_RATES: Readonly<Record<VirtualKind,number>>=Object.freeze({pachinko:4,pachislot:20});
export function validateWalletSettings(s: WalletSettings): WalletSettings {
  const valid=(v:number,a:number,b:number)=>Number.isFinite(v)&&v>=a&&v<=b;
  if(!valid(s.pachinkoBorder,10,30)||!valid(s.pachinkoSpins,10,30)
      ||!valid(s.slotReturnPct,80,120)||!valid(s.slotGamesPer50,20,55)){
    throw new RangeError('Invalid virtual wallet assumptions');
  }
  return s;
}
export function validateVirtualWallet(value: unknown): VirtualWallet {
  if(!value || typeof value!=='object')return emptyVirtualWallet();
  const found=value as Record<string,unknown>;
  const keys: readonly (keyof VirtualWallet)[]=['spins','rounds','wins','wagerUnits','payoutUnits','hitPayoutUnits','cashDepositedYen'];
  if(keys.some(k=>typeof found[k]!=='number'||!Number.isFinite(found[k])||(found[k] as number)<0)
    ||!Number.isInteger(Number(found.spins))||!Number.isInteger(Number(found.rounds))||!Number.isInteger(Number(found.wins))
    ||(found.wins as number)>(found.spins as number))return emptyVirtualWallet();
  return found as unknown as VirtualWallet;
}
function chance(entry:Pick<MachineDrawEntry,'numerator'|'denominator'>):number{
  const p=Number(entry.numerator)/Number(entry.denominator);
  if(!(p>0&&p<=1)||!Number.isFinite(p))throw new RangeError('Invalid machine probability');
  return p;
}
/** Pachinko models one machine-spin's ball expenditure; slot models a 3-medal gross BET. */
export function stakePerSpin(kind:VirtualKind,s:WalletSettings):number{
  validateWalletSettings(s);
  return kind==='pachinko'?250/s.pachinkoSpins:3;
}
/** Slot baseline small-role return chosen to yield the assumed 50-medal game base. */
export function slotNormalReturnPerSpin(s:WalletSettings):number{
  validateWalletSettings(s);
  return 3-50/s.slotGamesPer50;
}
/** A fictional payout calibrated so the model's EXPECTED value matches chosen border or slot rate.
 * The source catalog has initial hit odds only, not real payout distributions / RUSH branches.
 */
export function modelJackpotPayout(event: Pick<MachineDrawEntry,'kind'|'numerator'|'denominator'>,s:WalletSettings):number{
  const p=chance(event);
  validateWalletSettings(s);
  if(event.kind==='pachinko')return (250/s.pachinkoBorder)/p;
  const bonusExpected=3*s.slotReturnPct/100-slotNormalReturnPerSpin(s);
  return Math.max(0,bonusExpected)/p;
}
export function theoreticalReturnPct(kind:VirtualKind,s:WalletSettings):number{
  validateWalletSettings(s);
  return kind==='pachinko' ? 100*s.pachinkoSpins/s.pachinkoBorder : s.slotReturnPct;
}
export interface WalletRound {
  wallet: VirtualWallet;
  wagerUnits: number;
  payoutUnits: number;
  jackpotUnits: number;
  spins: number;
  wins: number;
}
export function applyVirtualRound(
  wallet: VirtualWallet, kind:VirtualKind,
  events:readonly MachineDrawEntry[], hits:readonly MachineHit[],
  settings:WalletSettings
):WalletRound{
  validateWalletSettings(settings);
  const existing=validateVirtualWallet(wallet);
  if(events.some(x=>x.kind!==kind)||hits.some(x=>x.event.kind!==kind||!x.hit)){
    throw new Error('Machine kind mismatch in virtual wallet');
  }
  const ids=new Set(events.map(x=>x.id));
  if(new Set(hits.map(x=>x.event.id)).size!==hits.length||hits.some(h=>!ids.has(h.event.id))){
    throw new Error('Virtual payout must use once-per-model real draws');
  }
  const wagerUnits=events.length*stakePerSpin(kind,settings);
  const jackpotUnits=hits.reduce((acc,hit)=>acc+modelJackpotPayout(hit.event,settings),0);
  const baseUnits=kind==='pachislot'?events.length*slotNormalReturnPerSpin(settings):0;
  const payoutUnits=baseUnits+jackpotUnits;
  const next:VirtualWallet={
    spins:existing.spins+events.length,rounds:existing.rounds+1,wins:existing.wins+hits.length,
    wagerUnits:existing.wagerUnits+wagerUnits,
    payoutUnits:existing.payoutUnits+payoutUnits,
    hitPayoutUnits:existing.hitPayoutUnits+jackpotUnits,
    cashDepositedYen:existing.cashDepositedYen,
  };
  const rate=UNIT_RATES[kind];
  const borrowingUnits=1000/rate;
  const currentBalance=existing.cashDepositedYen/rate+existing.payoutUnits-existing.wagerUnits;
  const shortfall=Math.max(0,wagerUnits-currentBalance);
  const purchaseBlocks=Math.ceil(Math.max(0,shortfall-1e-8)/borrowingUnits);
  next.cashDepositedYen+=purchaseBlocks*1000;
  return {wallet:next,wagerUnits,payoutUnits,jackpotUnits,spins:events.length,wins:hits.length};
}
export function walletYen(wallet:VirtualWallet,kind:VirtualKind){
  const rate=UNIT_RATES[kind];
  const balanceUnits=wallet.cashDepositedYen/rate+wallet.payoutUnits-wallet.wagerUnits;
  return {
    investment:wallet.cashDepositedYen,
    /** Redeem all virtual held units now; not gross hit payouts. */
    recovered:Math.max(0,balanceUnits)*rate,
    profit:(wallet.payoutUnits-wallet.wagerUnits)*rate,
    netUnits:wallet.payoutUnits-wallet.wagerUnits,
    balanceUnits:Math.max(0,balanceUnits),
    averagePayout:wallet.wins?wallet.hitPayoutUnits/wallet.wins:0,
    totalWagerYen:wallet.wagerUnits*rate,
    totalPayoutYen:wallet.payoutUnits*rate,
  };
}
