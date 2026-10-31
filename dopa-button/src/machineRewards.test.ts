import { describe, expect, it } from 'vitest';
import { MACHINE_EVENTS } from './machineLottery';
import {
  EMPTY_REWARDS, BADGES, sanitizeRewards, winRewards, failRewards,
  ownedCount, totalRewardHits, stickerLevel, STICKER_TIERS,
  earnedBadges, decorateProfile, getEquippedBadge, newEarnedBadges,
} from './machineRewards';

describe('Dopa Collectors: persistent achievements and stickers',()=>{
  it('does not inflate a missing saved record or accept arbitrary machine IDs',()=>{
    const p=sanitizeRewards({version:1,counts:{'garbage':'1000'},rounds:-7,bestStreak:99999999,alias:'                  '});
    expect(ownedCount(p)).toBe(0);
    expect(p.rounds).toBe(0);
    expect(p.bestStreak).toBe(10000);
    expect(p.alias).toBe('');
  });
  it('migrates the previous machine-discovery archive to normal stickers, without losing known models',()=>{
    const a=MACHINE_EVENTS[0];
    const p=sanitizeRewards(null,[a.id,'invalid',a.id]);
    expect(ownedCount(p)).toBe(1);
    expect(p.counts[a.id]).toBe(1);
    expect(p.featuredId).toBeNull();
  });
  it('unlocks first hit, awards a badge, and upgrades copies at 2, 5, 10 without multiplying randomness',()=>{
    const e=MACHINE_EVENTS[0];
    let p=sanitizeRewards(null);
    const hit={event:e,hit:true};
    const first=winRewards(p,[hit]);
    expect(newEarnedBadges(p,first).map(x=>x.id)).toContain('first');
    expect(ownedCount(first)).toBe(1);
    expect(totalRewardHits(first)).toBe(1);
    expect(first.featuredId).toBe(e.id);
    p=first;
    for(let i=1;i<10;i++)p=winRewards(p,[hit]);
    expect(ownedCount(p)).toBe(1);
    expect(totalRewardHits(p)).toBe(10);
    expect(p.counts[e.id]).toBe(10);
    expect(p.rounds).toBe(10);
    expect([0,1,2,3,4,5,9,10].map(stickerLevel)).toEqual([0,1,2,2,2,3,3,4]);
    expect(STICKER_TIERS[stickerLevel(10)].name).toBe('レジェンド');
    expect(earnedBadges(p).map(b=>b.id)).toEqual(expect.arrayContaining(['twice','fivecopies','tencopies']));
  });
  it('recognizes effort even with no hits, and both machine categories only if actually earned',()=>{
    let p=sanitizeRewards(null);
    for(let i=0;i<50;i++)p=winRewards(p,[]);
    expect(p.rounds).toBe(50);
    expect(p.dryRounds).toBe(50);
    expect(earnedBadges(p).map(b=>b.id)).toEqual(expect.arrayContaining(['dry10','dry50','rounds50']));
    expect(ownedCount(p)).toBe(0);
    p=failRewards(p,12);
    for(let i=1;i<10;i++)p=failRewards(p,2);
    expect(p.fails).toBe(10);
    expect(p.bestStreak).toBe(12);
    expect(earnedBadges(p).map(b=>b.id)).toContain('failed10');
    expect(earnedBadges(p).map(b=>b.id)).toContain('streak10');
    const ball=MACHINE_EVENTS.find(x=>x.kind==='pachinko')!;
    const medal=MACHINE_EVENTS.find(x=>x.kind==='pachislot')!;
    const one=winRewards(p,[{event:ball,hit:true}]);
    expect(earnedBadges(one).map(x=>x.id)).not.toContain('both');
    const both=winRewards(one,[{event:medal,hit:true}]);
    expect(earnedBadges(both).map(x=>x.id)).toContain('both');
  });
  it('only permits equipping earned titles and featuring won sticker machines',()=>{
    const a=MACHINE_EVENTS[0],b=MACHINE_EVENTS[1];
    const initial=sanitizeRewards(null);
    expect(decorateProfile(initial,{equippedBadge:'director'}).equippedBadge).toBeNull();
    expect(decorateProfile(initial,{featuredId:a.id}).featuredId).toBeNull();
    const after=winRewards(initial,[{event:a,hit:true}]);
    const decorated=decorateProfile(after,{featuredId:a.id,equippedBadge:'first',alias:'長すぎる名前がいったい何文字あっても大丈夫かな'});
    expect(decorated.featuredId).toBe(a.id);
    expect(getEquippedBadge(decorated)?.id).toBe('first');
    expect([...decorated.alias].length).toBeLessThanOrEqual(16);
    expect(decorateProfile(after,{featuredId:b.id}).featuredId).toBeNull();
  });
  it('awards creative theme submission at 20 distinct models, never for twenty duplicates',()=>{
    let profile=sanitizeRewards(null);
    const all=MACHINE_EVENTS.slice(0,20);
    for(let n=0;n<20;n++)profile=winRewards(profile,[{event:all[n],hit:true}]);
    expect(ownedCount(profile)).toBe(20);
    expect(earnedBadges(profile).map(x=>x.id)).toContain('director');
    const extra=winRewards(profile,[{event:all[0],hit:true}]);
    expect(ownedCount(extra)).toBe(20);
    expect(BADGES.length).toBeGreaterThan(12);
    expect(EMPTY_REWARDS.version).toBe(1);
  });
});
