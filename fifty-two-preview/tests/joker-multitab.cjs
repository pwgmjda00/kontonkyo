'use strict';
// Real same-origin tabs: Web Locks, storage events and the collection UI work together.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),KEY='fifty-two-joker-state-v3';
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true}),base='http://127.0.0.1:'+server.address().port;
 try{
  const context=await browser.newContext({viewport:{width:320,height:780},isMobile:true,hasTouch:true});
  const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  const a=await context.newPage(),b=await context.newPage();
  await Promise.all([a.goto(base+'/jokers.html'),b.goto(base+'/jokers.html')]);
  for(const page of [a,b])await page.evaluate(()=>{window.eventCount=0;addEventListener('storage',()=>window.eventCount++)});
  const offers=await a.evaluate(()=>FiftyTwoJokers.dailyOffers().map(c=>c.id));
  assert.equal(offers.length,3);
  const claims=await Promise.all([a.evaluate(id=>FiftyTwoJokers.claimDailyAsync(id),offers[0]),b.evaluate(id=>FiftyTwoJokers.claimDailyAsync(id),offers[1])]);
  assert.equal(claims.filter(Boolean).length,1,'only one tab can claim the day');
  const first=await a.evaluate(()=>FiftyTwoJokers.equipped().id);
  await Promise.all([
   a.evaluate(()=>FiftyTwoAchievements.recordWin('war')),
   b.evaluate(()=>FiftyTwoAchievements.recordWin('war')),
   b.evaluate(()=>FiftyTwoAchievements.recordWin('memory'))
  ]);
  await a.waitForFunction(()=>FiftyTwoJokers.owned().length===3);
  await b.waitForFunction(()=>document.getElementById('owned-count').textContent==='3 / 77');
  assert.equal(await a.evaluate(()=>FiftyTwoJokers.equipped().id),first);
  const state=await a.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);
  assert.equal(Object.keys(state.claimed).length,1);assert.deepEqual(Object.keys(state.achievements).sort(),['memory','war']);
  assert.equal(new Set(state.owned).size,3);
  // Once reconciliation settles there must be no mutually-triggered storage/lease loop.
  await Promise.all([a.evaluate(()=>FiftyTwoAchievements.settled()),b.evaluate(()=>FiftyTwoAchievements.settled())]);
  await a.waitForTimeout(300);
  const before=await Promise.all([a.evaluate(()=>eventCount),b.evaluate(()=>eventCount)]);
  await a.waitForTimeout(500);
  assert.deepEqual(await Promise.all([a.evaluate(()=>eventCount),b.evaluate(()=>eventCount)]),before,'idle tabs must stop writing');
  await a.reload();assert.equal(await a.evaluate(()=>FiftyTwoJokers.owned().length),3);
  assert.equal(await a.locator('#daily button').count(),0);
  assert.ok(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'320px collection fits');
  assert.deepEqual(errors,[]);await context.close();

  const failure=await browser.newContext({viewport:{width:375,height:812}}),page=await failure.newPage();
  await page.goto(base+'/jokers.html');
  await page.evaluate(k=>{const set=Storage.prototype.setItem;window.restoreStorage=()=>{Storage.prototype.setItem=set};Storage.prototype.setItem=function(key,value){if(key===k)throw new DOMException('Test quota full','QuotaExceededError');return set.call(this,key,value)}},KEY);
  await page.locator('#daily button').first().click();
  await page.waitForFunction(()=>document.getElementById('status').textContent.includes('獲得できません'));
  assert.equal(await page.evaluate(()=>FiftyTwoJokers.owned().length),0);
  assert.equal(await page.locator('#daily button').count(),3,'failed claim remains retryable');
  await page.evaluate(()=>FiftyTwoAchievements.recordWin('freecell'));
  assert.equal(await page.evaluate(()=>FiftyTwoAchievements.hasWin('freecell')),true,'achievement proof survives failed reward save');
  assert.deepEqual(await page.evaluate(()=>FiftyTwoAchievements.pending()),['freecell']);
  assert.equal(await page.locator('#achievement-pending').isVisible(),true);
  assert.match(await page.locator('#achievement-pending').innerText(),/未完了/);
  await page.evaluate(()=>window.restoreStorage());
  await page.locator('#achievement-retry').click();
  await page.waitForFunction(()=>FiftyTwoJokers.owned().length===1&&FiftyTwoAchievements.pending().length===0);
  assert.equal(await page.locator('#achievement-pending').isVisible(),false);
  assert.equal(await page.locator('#owned-count').innerText(),'1 / 77');
  await failure.close();

  const migrated=await browser.newContext(),m=await migrated.newPage();
  await m.addInitScript(()=>localStorage.setItem('fifty-two-freecell-wins','1'));
  await m.goto(base+'/jokers.html');
  await m.waitForFunction(()=>document.getElementById('owned-count').textContent==='1 / 77');
  await migrated.close();
  console.log('JOKER real multi-tab, idle reconciliation, quota failure, pending reward retry, migration UI, 320px PASS');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
