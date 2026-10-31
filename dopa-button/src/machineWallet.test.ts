import { describe,expect,it } from 'vitest';
import type { MachineDrawEntry } from './machineLottery';
import {
  DEFAULT_WALLET_SETTINGS, emptyVirtualWallet, applyVirtualRound,
  modelJackpotPayout, walletYen, theoreticalReturnPct,
  validateVirtualWallet, slotNormalReturnPerSpin, validateWalletSettings
} from './machineWallet';
const p=(id:string,denominator='100'):MachineDrawEntry=>({
  id,machine:id,maker:'test',kind:'pachinko',category:'test',
  numerator:'1',denominator,publishedProbability:'1/'+denominator,
  approximate:false,condition:'test',sourceUrl:'https://example.com',currentAvailability:'unverified',
});
const s=(id:string,denominator='200'):MachineDrawEntry=>({...p(id,denominator),kind:'pachislot'});
const settings={...DEFAULT_WALLET_SETTINGS,pachinkoBorder:20,pachinkoSpins:20};
describe('Independent virtual ball and medal accounts',()=>{
  it('pachinko: buys virtual balls in ¥1000 units and spends at chosen spin rate',()=>{
    const a=p('a'),b=p('b','200');
    const first=applyVirtualRound(emptyVirtualWallet(),'pachinko',[a,b],[],settings);
    expect(first.wagerUnits).toBeCloseTo(25,12);
    expect(first.payoutUnits).toBe(0);
    expect(first.wallet.spins).toBe(2);
    expect(first.wallet.cashDepositedYen).toBe(1000);
    expect(walletYen(first.wallet,'pachinko').balanceUnits).toBeCloseTo(225,12);
    expect(walletYen(first.wallet,'pachinko').recovered).toBeCloseTo(900,12);
    expect(walletYen(first.wallet,'pachinko').profit).toBeCloseTo(-100,12);
    const second=applyVirtualRound(first.wallet,'pachinko',[a,b],[{event:a,hit:true}],settings);
    expect(second.wallet.cashDepositedYen).toBe(1000);
    expect(second.jackpotUnits).toBeCloseTo(1250,12);
    expect(second.wallet.wins).toBe(1);
    expect(walletYen(second.wallet,'pachinko').profit).toBeCloseTo(4800,12);
    expect(walletYen(second.wallet,'pachinko').averagePayout).toBe(1250);
  });
  it('replenishes balls when insufficient, but does not count jackpot payout as a deposit',()=>{
    const only=p('only');
    let wallet=emptyVirtualWallet();
    for(let i=0;i<22;i++)wallet=applyVirtualRound(wallet,'pachinko',[only],[],settings).wallet;
    expect(wallet.cashDepositedYen).toBe(2000);
    expect(walletYen(wallet,'pachinko').balanceUnits).toBeCloseTo(225,8);
  });
  it('slot: three-medal BET per machine, normal small-role returns, bonus payout and 97% assumed target',()=>{
    const a=s('slot-a'),b=s('slot-b','400');
    const updated=applyVirtualRound(emptyVirtualWallet(),'pachislot',[a,b],[{event:a,hit:true}],DEFAULT_WALLET_SETTINGS);
    expect(updated.wagerUnits).toBe(6);
    expect(slotNormalReturnPerSpin(DEFAULT_WALLET_SETTINGS)).toBeCloseTo(1.4375,12);
    expect(modelJackpotPayout(a,DEFAULT_WALLET_SETTINGS)).toBeCloseTo(294.5,12);
    expect(updated.payoutUnits).toBeCloseTo(297.375,12);
    expect(updated.wallet.cashDepositedYen).toBe(1000);
    expect(updated.wallet.spins).toBe(2);
    expect(walletYen(updated.wallet,'pachislot').balanceUnits).toBeCloseTo(341.375,12);
    expect(walletYen(updated.wallet,'pachislot').profit).toBeCloseTo((297.375-6)*20,10);
    expect(theoreticalReturnPct('pachislot',DEFAULT_WALLET_SETTINGS)).toBeCloseTo(97,12);
  });
  it('keeps both currencies independent and no spin takes place on a failed reaction',()=>{
    const one=p('p');
    const two=s('s');
    const pachinko=applyVirtualRound(emptyVirtualWallet(),'pachinko',[one],[],settings).wallet;
    const slot=applyVirtualRound(emptyVirtualWallet(),'pachislot',[two],[],DEFAULT_WALLET_SETTINGS).wallet;
    expect(pachinko.spins).toBe(1);
    expect(slot.spins).toBe(1);
    expect(walletYen(pachinko,'pachinko').balanceUnits).toBeCloseTo(237.5);
    expect(walletYen(slot,'pachislot').balanceUnits).toBeCloseTo(48.4375);
    expect(pachinko.cashDepositedYen).toBe(1000);
    expect(slot.cashDepositedYen).toBe(1000);
  });
  it('border settings change theoretical profitability, not published hit probability',()=>{
    const event=p('p');
    expect(theoreticalReturnPct('pachinko',{...settings,pachinkoSpins:20,pachinkoBorder:20})).toBe(100);
    expect(theoreticalReturnPct('pachinko',{...settings,pachinkoSpins:15,pachinkoBorder:20})).toBe(75);
    expect(modelJackpotPayout(event,{...settings,pachinkoSpins:15})).toBe(modelJackpotPayout(event,settings));
    expect(()=>validateWalletSettings({...settings,pachinkoBorder:0})).toThrow();
    expect(()=>applyVirtualRound(emptyVirtualWallet(),'pachinko',[p('p')],[{event:s('x'),hit:true}],settings)).toThrow();
  });
  it('restores invalid persisted money data to a clean account',()=>{
    expect(validateVirtualWallet({wagerUnits:-7})).toEqual(emptyVirtualWallet());
    expect(validateVirtualWallet({spins:1,rounds:1,wins:4,wagerUnits:2,payoutUnits:4,hitPayoutUnits:4,cashDepositedYen:1000})).toEqual(emptyVirtualWallet());
  });
});
