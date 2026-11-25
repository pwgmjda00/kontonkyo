// Run with NODE_PATH pointing to a Playwright installation; serves from a running repo root at :3000.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  const apiCalls=[]; let weekly=false, before=0, archived=0;
  const catalog=await import('../../muka1-preview/catalog.js');
  const day='2026-11-26', ids=catalog.dailyIds(day);
  await page.route('https://muka1-api.pwgmjda00.workers.dev/**', async route => {
    const req=route.request(), url=new URL(req.url()); apiCalls.push({path:url.pathname,method:req.method(),auth:req.headers().authorization,body:req.postData()});
    const out=data=>route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
    if(url.pathname==='/approved') return out({items:[{id:1,text:'承認済みの架空文章です'}],nextCursor:null});
    if(url.pathname==='/ranking') {
      weekly=url.searchParams.get('period')==='week';
      return out({day,from:'2026-11-23',period:weekly?'week':'day',ranking:weekly?[{phrase:256,votes:10},{phrase:1000255,votes:10},{phrase:255,votes:1}]:ids.map((id,i)=>({phrase:id,votes:i<2?10:0}))});
    }
    if(url.pathname==='/history') {
      if(url.searchParams.has('before')) { before++; return out({day:'2026-11-25',winners:[],weeks:[{week:'2026-10-26',phrase:1000255,votes:1}],nextCursor:null}); }
      return out({day:'2026-11-25',winners:[{phrase:1000510,votes:5}],weeks:[{week:'2026-11-16',phrase:256,votes:10}],nextCursor:'2026-11-16'});
    }
    if(url.pathname==='/festival') {
      if(url.searchParams.has('cursor')) { archived++; return out({active:null,archives:[],nextCursor:null}); }
      return out({active:null,archives:[{id:'month:2026-10',kind:'month',period:'2026-10',counts:[{phrase:1000255,votes:9},{phrase:256,votes:9}],winners:[1000255,256],status:'closed'}],nextCursor:'month:2026-10'});
    }
    if(url.pathname==='/admin/submissions') return out(req.method()==='GET'?{items:[{id:2,text:'審査中の架空文章です'}]}:{updated:true});
    if(url.pathname==='/admin/analytics') return out({days:7,from:'2026-11-20',through:day,enabled:true,daily:[{day,visits:3,completions:0,shares:0}],totals:{visit:3},bySource:{direct:{visit:3}},byMode:{duel:{visit:3}},rates:{duelCompletion:null,cupCompletion:null,shareOperationsPerCompletion:null,inviteCompletionProxy:null,completionsPerInvite:null},inviteCompletions:[],retention:{rawDays:30,aggregateDays:90}});
    if(url.pathname==='/submissions') return out({accepted:true});
    return route.fulfill({status:404,body:'{}'});
  });
  await page.goto('http://127.0.0.1:3000/muka1-preview/ranking.html');
  await page.waitForFunction(()=>document.querySelectorAll('#list li').length===8);
  assert.equal(await page.locator('#list .rank').allTextContents().then(x=>x.filter(x=>x.includes('第1位')).length),2);
  assert.equal(await page.locator('#list .rank').allTextContents().then(x=>x.filter(x=>x==='未得票').length),6);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.goto('http://127.0.0.1:3000/muka1-preview/ranking.html?period=week');
  await page.getByText('承認済みの架空文章です',{exact:true}).waitFor(); assert.equal(weekly,true);
  await page.goto('http://127.0.0.1:3000/muka1-preview/history.html');
  await page.getByRole('button',{name:'さらに過去の週間王者'}).click();
  await page.getByText('2026-10-26 週の王者 ／ 1票',{exact:true}).waitFor(); assert.equal(before,1);
  await page.getByRole('button',{name:'さらに過去の決戦'}).click();
  await page.getByText('保存されている決戦をすべて表示しました。',{exact:true}).waitFor(); assert.equal(archived,1);
  const download=page.waitForEvent('download'); await page.getByRole('button',{name:'号外を画像にする'}).click(); assert.equal((await download).suggestedFilename(),'muka1-news.png');
  await page.screenshot({path:'/tmp/muka-history-mobile.png',fullPage:true});
  await page.goto('http://127.0.0.1:3000/muka1-preview/admin.html');
  await page.locator('#token').fill('browser-test-token'); await page.locator('#load').click();
  await page.getByRole('button',{name:'修正して承認'}).waitFor(); page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'修正して承認'}).click(); await page.getByText('処理しました。',{exact:true}).waitFor();
  await page.locator('summary').click(); await page.locator('#load-analytics').click(); await page.getByText('未算出（分母0）',{exact:true}).first().waitFor();
  assert.equal(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('browser-test-token')),false);
  assert.equal(apiCalls.filter(x=>x.path.startsWith('/admin/')).every(x=>x.auth==='Bearer browser-test-token'),true);
  await page.locator('#forget').click(); assert.equal(await page.locator('#token').inputValue(),''); assert.equal(await page.locator('#analytics').textContent(),'');
  await page.goto('http://127.0.0.1:3000/muka1-preview/submit.html'); await page.locator('#t').fill('これは架空の投稿文です'); await page.locator('#ok').check(); await page.locator('#send').click();
  await page.getByText('審査待ちになりました。公開はまだされません。',{exact:true}).waitFor();
  assert.equal(await page.locator('#t').inputValue(),'');
  await page.route('https://muka1-api.pwgmjda00.workers.dev/**',route=>route.abort());
  await page.goto('http://127.0.0.1:3000/muka1-preview/ranking.html'); await page.waitForFunction(()=>!document.querySelector('#status').textContent.includes('集計中'));
  assert.equal(await page.locator('#list li').count(),0);
  assert.equal(errors.length,0,errors.join('\n'));
  await browser.close(); console.log('PASS pages: day/weekly tie and zero votes,512/approved text,paging,PNG,mobile width,approval,analytics zero denominator/token memory,submission,offline');
})().catch(error=>{console.error(error);process.exit(1)});
