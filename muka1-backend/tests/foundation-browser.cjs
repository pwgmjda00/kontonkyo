const {chromium,webkit,devices}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.MUKA_TEST_URL||'http://127.0.0.1:3000/muka1-preview/';
const output=process.env.MUKA_TEST_OUTPUT||'/tmp/muka1-foundation';fs.mkdirSync(output,{recursive:true});
(async()=>{
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true,...(engine===webkit&&process.env.MUKA_WEBKIT_PATH?{executablePath:process.env.MUKA_WEBKIT_PATH}:{})});
  const context=await browser.newContext({...devices['iPhone 13'],acceptDownloads:true});
  const page=await context.newPage();page.on('dialog',d=>d.dismiss());const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let offline=false,votes=0,shareURL='';
  const fixture='長い架空構文'.repeat(20);
  await context.route('https://twitter.com/intent/tweet?**',route=>{shareURL=route.request().url();return route.fulfill({body:'X URL checked'});});
  await context.route('https://muka1-api.pwgmjda00.workers.dev/**',route=>{
   if(offline)return route.abort('failed');
   const path=new URL(route.request().url()).pathname;
   if(path==='/approved')return route.fulfill({json:{items:[{id:1,text:fixture}]}});
   if(path==='/vote'){votes++;return route.fulfill({json:{accepted:votes===1}});}
   if(path==='/ranking')return route.fulfill({json:{day:'2026-11-25',from:'2026-11-23',period:new URL(route.request().url()).searchParams.get('period')==='week'?'week':'day',ranking:[{phrase:1000452,votes:1},{phrase:256,votes:1},{phrase:0,votes:0}]}});
   if(path==='/history')return route.fulfill({json:{day:'2026-11-24',winners:[{phrase:1000255,votes:1}],weeks:[{week:'2026-11-16',phrase:256,votes:1}]}});
   return route.fulfill({status:404,json:{error:'not found'}});
  });
  await page.goto(base+'?utm_source=x&utm_campaign=anything');await page.locator('button.choice').first().waitFor();assert.equal(await page.locator('#round').innerText(),'一問だけの決闘');
  assert.equal(await page.locator('button.choice').count(),2);
  await page.screenshot({path:output+'/'+engine.name()+'-first.png',fullPage:true});
  const ids=[0,1,2,3,1000255,1000256,1000257,1000258];
  for(let path=0;path<(process.env.MUKA_FAST?1:128);path++){
   await page.goto(base+'?cup='+ids.join(','));let queue=ids.slice(),next=[],winner;
   for(let step=0;step<7;step++){
    const bit=(path>>step)&1;winner=queue[bit];await page.locator('button.choice').nth(bit).click();
    next.push(winner);queue.splice(0,2);if(!queue.length){queue=next;next=[];}
   }
   const expected=await page.evaluate(async id=>(await import('./catalog.js')).PHRASE_MAP.get(id),winner);
   assert.equal(await page.locator('#game h2').last().innerText(),expected);
  }
  console.log(engine.name()+': '+(process.env.MUKA_FAST?'1':'128')+' real tournament paths passed');
  await page.goto(base+'?cup=0,1,2,3,4,5,6,7&p=0,2,4,6,0,4,0');
  for(let i=0;i<7;i++)await page.locator('button.choice').first().click();
  assert((await page.locator('#game').innerText()).includes('初戦の感性一致：4/4'));
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'ムカつき免許証を発行',exact:true}).click();assert.equal((await download).suggestedFilename(),'muka1-license.png');
  await Promise.all([page.waitForURL('https://twitter.com/intent/tweet?**'),page.getByRole('button',{name:'Xで審判を募集',exact:true}).click()]);
  assert(new URL(new URL(shareURL).searchParams.get('url')).searchParams.get('cup'));
  await page.goto(base+'?duel=1&pair=256,1000452&pick=256&jury=256,1000452');await page.locator('button.choice').first().waitFor();
  assert((await page.locator('button.choice').last().innerText()).includes('通知多すぎて全部追えません'));
  await page.locator('button.choice').first().click();await page.getByRole('heading',{name:'意見が一致しました。',exact:true}).waitFor();
  for(const query of ['?cup=0,1,2,3,4,5,6,NaN','?duel=1&pair=0,0','?duel=1&pair=0,1e2','?duel=1&pair=99999999999999999,0']){
   await page.goto(base+query);await page.locator('button.choice').first().waitFor();assert.equal(await page.locator('button.choice').count(),2);
  }
  await page.goto(base+'?daily=1');await page.locator('button.choice').first().waitFor();
  const daily=await page.evaluate(async()=>(await import('./catalog.js')).dailyIds());
  assert(daily.every(id=>id<256));assert.deepEqual(await page.locator('button.choice').evaluateAll(bs=>bs.map(b=>Number(b.dataset.phrase))),daily.slice(0,2));
  for(let i=0;i<7;i++)await page.locator('button.choice').first().click();
  await page.getByRole('button',{name:'今日の全国投票に参加',exact:true}).click();await page.getByText('投票しました！',{exact:true}).waitFor();assert.equal(votes,1);
  await page.goto(base+'?host=1');await page.locator('#game input[type=checkbox]').last().waitFor();assert.equal(await page.locator('#game input[type=checkbox]').count(),513);
  for(let i=0;i<8;i++)await page.locator('#game input[type=checkbox]').nth(i).check();
  const poster=page.waitForEvent('download');await page.getByRole('button',{name:'大会告知画像を作る',exact:true}).click();assert.equal((await poster).suggestedFilename(),'muka1-poster.png');
  for(const [url,expected] of [['ranking.html','通知多すぎて全部追えません'],['history.html','その程度で傷つくならネット向いてないよ']]){
   await page.goto(base+url);await page.getByText(expected,{exact:true}).waitFor();assert((await page.locator('body').innerText()).includes(fixture));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  offline=true;await page.goto(base+'?duel=1');await page.locator('button.choice').first().click();await page.getByRole('heading',{name:'審判を募集します。',exact:true}).waitFor();
  await page.goto(base+'ranking.html');await page.getByText('集計を取得できません。時間をおいて再読み込みしてください。',{exact:true}).waitFor();
  assert.equal(errors.length,0,errors.join('\n'));await browser.close();
  console.log(engine.name()+': shared URLs, restored text, daily legacy candidates, host513, PNG, X, rankings/history and offline passed');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
