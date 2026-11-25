// Run against a local HTTP server: NODE_PATH=... node tests/game-browser.cjs
const {chromium,webkit,devices}=require('playwright');
const assert=require('node:assert/strict');
const {PNG}=require('pngjs'); const jsQR=require('jsqr');
const fs=require('node:fs');
const base=process.env.MUKA_TEST_URL||'http://127.0.0.1:3000/muka1-preview/';
const output=process.env.MUKA_TEST_OUTPUT||'/tmp/muka1-verification';fs.mkdirSync(output,{recursive:true});
(async()=>{
for(const engine of [chromium,webkit]){
 const browser=await engine.launch({headless:true,...(engine===webkit&&process.env.MUKA_WEBKIT_PATH?{executablePath:process.env.MUKA_WEBKIT_PATH}:{})});
 const ctx=await browser.newContext({...devices['iPhone 13'],acceptDownloads:true});
 const page=await ctx.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
 let offline=false, voted=false, calls=0, events=[], sharedURL='';
 await ctx.route('https://twitter.com/intent/tweet?**',route=>{sharedURL=route.request().url();return route.fulfill({body:'Shared URL test'});});
 await ctx.route('**/muka1-api.pwgmjda00.workers.dev/**',async route=>{
  const url=new URL(route.request().url()), path=url.pathname;
  if(offline)return route.abort('failed');
  let data={};
  if(path==='/approved')data={items:[{id:1,text:'長文投稿'.repeat(35)}]};
  if(path==='/festival')data={active:null,archives:[],nextCursor:null};
  if(path==='/analytics/events'){events.push(...route.request().postDataJSON().events);data={accepted:1};}
  if(path==='/duel/daily'||path==='/duel/vote'){
   const day=url.searchParams.get('day')||new Date(Date.now()+9*3600000).toISOString().slice(0,10);
   const pair=await page.evaluate(async day=>(await import('./catalog.js')).duelIds(day),day);
   let selected;
   if(path==='/duel/vote'){const b=route.request().postDataJSON();assert.deepEqual(b.pair,pair);assert.equal(b.day,day);selected=b.phrase;calls++;voted=true;}
   data={day,pair,counts:pair.map((phrase,i)=>({phrase,votes:voted?(i?15:15):0})),total:voted?30:0,readOnly:day<new Date(Date.now()+9*3600000).toISOString().slice(0,10),asOf:new Date().toISOString(),...(selected===undefined?{}:{accepted:calls===1,selected})};
  }
  return route.fulfill({json:data,headers:{'access-control-allow-origin':'*'}});
 });
 await page.goto(base+'?utm_source=x&utm_campaign=abc');
 await page.getByText('選ぶまで全国の割合は表示しません。',{exact:true}).waitFor();
 assert.equal(await page.locator('button.choice').count(),2);assert(!await page.locator('#game').innerText().then(x=>x.includes('%')));
 await page.locator('button.choice').first().click();await page.getByRole('heading',{name:'国論分裂',exact:true}).waitFor();assert.equal(calls,1);
 assert((await page.locator('#game').innerText()).includes('30票'));
 await page.locator('#game details').first().locator('summary').click();
 await Promise.all([page.waitForURL('https://twitter.com/intent/tweet?**'),page.getByRole('button',{name:'Xで審判を募集',exact:true}).click()]);
 assert(decodeURIComponent(sharedURL).includes('接戦速報'));
 await page.goto(base+'?nation=1&day=2026-11-24');await page.getByRole('button',{name:'実測の結果を見る',exact:true}).waitFor();assert(await page.locator('button.choice').first().isDisabled());
 await page.getByRole('button',{name:'実測の結果を見る',exact:true}).click();assert((await page.locator('#game').innerText()).includes('過去日'));
 // All 128 real seven-click tournament routes, retaining exact IDs and every winner.
 const ids=[0,1,2,3,1000255,1000256,1000257,1000258];
 for(let path=0;path<(process.env.MUKA_FAST?1:128);path++){
  await page.goto(base+'?cup='+ids.join(',')); let queue=[...ids],next=[],choices=[];
  for(let step=0;step<7;step++){
   const bit=(path>>step)&1,id=queue[bit];
   await page.locator('button.choice').nth(bit).click();choices.push(id);next.push(id);queue.splice(0,2);if(!queue.length){queue=next;next=[];}
  }
  if(path===127)console.log(engine.name()+': all 128 real tournament paths passed');
  const heading=await page.locator('#game h2').first().innerText();
  const winner=await page.evaluate(async id=>(await import('./catalog.js')).PHRASE_MAP.get(id),choices[6]);
  assert(heading.includes(winner),engine.name()+' route '+path+' winner mismatch');
 }
 // Legacy shared votes, approved-ID URLs, invalid strings and a 140-character entry.
 for(const query of ['?cup=0,1,2,3,4,5,6,7&p=0,2,4,6,0,4,0','?duel=1&pair=256,1000510&pick=256','?duel=1&pair=-1,1','?cup=0,1,2,3,4,5,6,NaN','?duel=1&pair=0,0','?nation=1&day=2026-02-30']){
  await page.evaluate(()=>localStorage.clear()); await page.goto(base+query);await page.locator('button.choice').first().waitFor();assert.equal(await page.locator('button.choice').count(),2);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.goto(base+'?host=1');await page.locator('input[type=checkbox][data-phrase]').last().waitFor();
 assert.equal(await page.locator('input[type=checkbox][data-phrase]').count(),513);
 for(const id of ids) await page.locator('input[data-phrase="'+id+'"]').check();
 await page.getByRole('button',{name:'大会告知画像を作る',exact:true}).click();await page.getByAltText('MUKA-1の共有用画像',{exact:true}).waitFor();
 const png=await page.getByAltText('MUKA-1の共有用画像',{exact:true}).evaluate(async img=>Array.from(new Uint8Array(await(await fetch(img.src)).arrayBuffer())));
 fs.writeFileSync(output+'/'+engine.name()+'-poster.png',Buffer.from(png));
 const image=PNG.sync.read(Buffer.from(png));const qr=jsQR(new Uint8ClampedArray(image.data),image.width,image.height);
 assert(qr,'poster QR must decode');const url=new URL(qr.data);assert.deepEqual(url.searchParams.get('cup').split(',').map(Number),ids);
 const dlPromise=page.waitForEvent('download');await page.getByRole('link',{name:/PNGを保存/}).click();const dl=await dlPromise;assert.equal(dl.suggestedFilename(),'muka1-poster.png');
 const longPoster=await page.evaluate(async()=>{
  const {createPoster}=await import('./poster.js');const phrase='長文'.repeat(70),ids=[0,1,2,3,4,5,6,7],drawn=[];
  const original=CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){drawn.push(String(text));return original.call(this,text,...args)};
  try{const canvas=await createPoster({title:'長い大会名'.repeat(8),ids,phrases:new Map(ids.map(id=>[id,phrase])),url:location.origin+location.pathname+'?cup='+ids.join(',')});return {png:canvas.toDataURL().split(',')[1],drawn:drawn.join(''),height:canvas.height};}
  finally{CanvasRenderingContext2D.prototype.fillText=original;}
 });
 assert(longPoster.drawn.includes('長文'.repeat(70)),'all 140 characters must be drawn');
 fs.writeFileSync(output+'/'+engine.name()+'-long-poster.png',Buffer.from(longPoster.png,'base64'));
 await page.screenshot({path:output+'/'+engine.name()+'-host.png',fullPage:true});
 // Persisted opt-out suppresses even visit and automatic start; offline still playable.
 await page.evaluate(()=>localStorage.setItem('muka1-analytics-off','1'));await page.waitForTimeout(100);events=[];
 await page.goto(base+'?duel=1');await page.locator('button.choice').first().click();await page.waitForTimeout(100);assert.equal(events.length,0);
 offline=true;await page.goto(base);await page.getByText('全国集計は取得不可。このまま端末内で遊べます。',{exact:true}).waitFor();await page.locator('button.choice').first().click();assert((await page.locator('#game').innerText()).includes('この端末'));
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(engine.name()+': PASS '+(process.env.MUKA_FAST?'1':'128')+' routes + national vote/read-only/offline/legacy/invalid URLs/513 entries/PNG/decoded QR/X/opt-out, no page errors');await browser.close();
}
})().catch(e=>{console.error(e);process.exitCode=1});
