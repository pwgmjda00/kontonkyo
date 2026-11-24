'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../engine/jokers.js'),'utf8');
const KEY='fifty-two-joker-state-v3';
function storage(seed={}){const data=new Map(Object.entries(seed));return {data,fail:false,get length(){return data.size},key:i=>[...data.keys()][i]??null,getItem:k=>data.get(k)??null,setItem(k,v){if(this.fail&&k===KEY)throw Error('QuotaExceededError');data.set(k,String(v))},removeItem:k=>data.delete(k)}}
function load(s=storage(),extra={}){const context=vm.createContext({localStorage:s,Math,Date,Uint32Array,...extra});vm.runInContext(source,context);return context.FiftyTwoJokers}
let count=0;async function test(name,fn){await fn();count++;console.log('✓ '+name)}
(async()=>{
 await test('v2 migrates ownership, equipment, daily marker and interrupted achievement receipt together',()=>{
  const s=storage({'fifty-two-joker-collection-v2':'["J01","J02","J02","bad"]','fifty-two-joker-equipped-v2':'J02','fifty-two-joker-daily-claimed-v2':'2026-11-23','fifty-two-joker-achievement-v2-war':'J03'}),j=load(s);
  assert.deepEqual(Array.from(j.owned(),c=>c.id),['J01','J02','J03']);assert.equal(j.equipped().id,'J02');assert.equal(j.claimedOn('2026-11-23'),true);assert.equal(j.awardAchievement('war'),null);assert.equal(j.achievementReceipt('war'),'J03');assert.equal(j.achievementReceipt('unknown'),null);
  const offer=j.dailyOffers('2026-11-24')[0];assert.equal(j.claimDaily(offer.id,'2026-11-24'),true);
  const state=JSON.parse(s.getItem(KEY));assert.equal(state.version,3);assert.equal(state.equipped,'J02');assert.equal(state.achievements.war,'J03');assert.equal(Object.keys(state.claimed).length,2);
  assert.equal(s.getItem('fifty-two-joker-collection-v2'),'["J01","J02","J02","bad"]','legacy is retained');
 });
 await test('daily history survives reload and clock rollback across multiple claims',()=>{
  const s=storage(),j=load(s);for(const date of ['2026-11-24','2026-11-25','2026-11-26'])assert.equal(j.claimDaily(j.dailyOffers(date)[0].id,date),true);
  const restored=load(s);for(const date of ['2026-11-24','2026-11-25','2026-11-26']){assert.equal(restored.dailyOffers(date).length,0);assert.equal(restored.claimDaily('J77',date),false)}assert.equal(restored.owned().length,3);
  for(const date of ['2026-02-31','garbage','2026-13-01'])assert.equal(restored.dailyOffers(date).length,0);
 });
 await test('offer count shrinks to remaining cards; new cards never replace chosen equipment',()=>{
  const ids=Array.from({length:75},(_,i)=>'J'+String(i+1).padStart(2,'0')),s=storage({'fifty-two-joker-collection-v2':JSON.stringify(ids),'fifty-two-joker-equipped-v2':'J50'}),j=load(s);
  assert.equal(j.dailyOffers('2026-11-24').length,2);assert.equal(j.claimDaily(j.dailyOffers('2026-11-24')[0].id,'2026-11-24'),true);assert.equal(j.equipped().id,'J50');assert.equal(j.equip(null),true);
  assert.ok(j.awardAchievement('memory'));assert.equal(j.equipped(),null);assert.equal(j.owned().length,77);assert.equal(j.dailyOffers('2026-11-25').length,0);
  assert.equal(j.awardAchievement('war'),null);assert.equal(JSON.parse(s.getItem(KEY)).achievements.war,'complete');assert.equal(j.achievementReceipt('war'),'complete');assert.equal(j.awardAchievement('war'),null);
 });
 await test('one atomic write prevents phantom rewards or consumed days on quota failure',()=>{
  const s=storage(),j=load(s),id=j.dailyOffers('2026-11-24')[0].id;s.fail=true;
  assert.equal(j.claimDaily(id,'2026-11-24'),false);assert.equal(j.owned().length,0);assert.equal(j.claimedOn('2026-11-24'),false);assert.equal(s.getItem(KEY),null);
  assert.equal(j.awardAchievement('memory'),null);assert.equal(j.achievementReceipt('memory'),null);assert.equal(s.getItem(KEY),null);s.fail=false;
  assert.equal(j.claimDaily(id,'2026-11-24'),true);assert.ok(j.awardAchievement('memory'));const saved=s.getItem(KEY);s.fail=true;
  assert.equal(j.equip(null),false);assert.equal(s.getItem(KEY),saved);assert.equal(j.equipped().id,id);
 });
 await test('denied storage never reports acquisition or equipment success',async()=>{
  const j=load({getItem(){throw Error('SecurityError')},setItem(){throw Error('SecurityError')},removeItem(){throw Error('SecurityError')}});
  assert.equal(j.storageStatus().ok,false);assert.equal(j.owned().length,0);assert.equal(j.dailyOffers('2026-11-24').length,0);assert.equal(j.equipped(),null);
  assert.equal(await j.claimDailyAsync('J01','2026-11-24'),false);assert.equal(await j.equipAsync(null),false);assert.equal(await j.awardAchievementAsync('war'),null);
 });
 await test('corrupt or future state is preserved and cannot be silently replaced by legacy migration',()=>{
  for(const broken of ['{','{"version":4}','{"version":3,"owned":["J01"]}']){
   const s=storage({[KEY]:broken,'fifty-two-joker-collection-v2':'["J02"]'}),j=load(s);
   assert.equal(j.storageStatus().ok,false);assert.equal(j.owned().length,0);assert.equal(j.claimDaily('J02','2026-11-24'),false);assert.equal(j.awardAchievement('war'),null);assert.equal(j.equip(null),false);assert.equal(s.getItem(KEY),broken);
  }
 });
 await test('reward draw rejects biased random boundary and never duplicates receipts',()=>{
  let calls=0;const random=[4294967295,76];const s=storage(),j=load(s,{crypto:{getRandomValues(a){a[0]=random[calls++]??0;return a}}});
  assert.equal(j.awardAchievement('war').id,'J77');assert.equal(calls,2);assert.equal(j.awardAchievement('war'),null);assert.equal(j.owned().length,1);assert.equal(j.equip('J01'),false);assert.equal(j.awardAchievement('../bad'),null);
 });
 await test('Web Locks async variants serialize two-tab claims and achievement rewards',async()=>{
  let queue=Promise.resolve(),lockCalls=0;const locks={request(name,options,fn){assert.equal(name,'fifty-two-joker-state');lockCalls++;const result=queue.then(fn);queue=result.catch(()=>{});return result}},s=storage(),a=load(s,{navigator:{locks}}),b=load(s,{navigator:{locks}});
  const offer=a.dailyOffers('2026-11-24');const claims=await Promise.all([a.claimDailyAsync(offer[0].id,'2026-11-24'),b.claimDailyAsync(offer[1].id,'2026-11-24')]);assert.deepEqual(claims,[true,false]);
  const rewards=await Promise.all([a.awardAchievementAsync('war'),b.awardAchievementAsync('war'),b.awardAchievementAsync('memory')]);assert.ok(rewards[0]);assert.equal(rewards[1],null);assert.ok(rewards[2]);assert.equal(a.owned().length,3);assert.equal(b.owned().length,3);
  assert.equal(await b.equipAsync(rewards[2].id),true);assert.equal(a.equipped().id,rewards[2].id);assert.equal(lockCalls,6);
 });
 console.log('JOKER persistence checks PASS '+count);
})().catch(error=>{console.error(error);process.exitCode=1});
