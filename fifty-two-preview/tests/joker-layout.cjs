'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return}res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');fs.createReadStream(file).pipe(res)});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true});
 const base='http://127.0.0.1:'+server.address().port;
 const results=[];
 async function run(game,fn,{date,id}={}){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   if(date&&id)await page.addInitScript(({date,id,game})=>{
    const OriginalDate=Date;
    class FixedDate extends OriginalDate{
     constructor(...args){super(...(args.length?args:[date+'T12:00:00']))}
     static now(){return new OriginalDate(date+'T12:00:00').valueOf()}
    }
    window.Date=FixedDate;
    localStorage.setItem('fifty-two-joker-equip-'+date,id);
    localStorage.setItem('fifty-two-mode-'+game,'joker');
   },{date,id,game});
   await page.goto(base+'/'+game+'.html',{waitUntil:'load'});
   assert.equal(await page.locator('.ft-joker-mode').count(),1);
   assert.equal(await page.locator('#jokerWins').count(),1);
   assert.equal(await page.locator('#ft-settings-button').count(),1);
   await fn(page);
   assert.deepEqual(errors,[]);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(overflow<=35,game+' overflow '+overflow+'px');
   results.push(game+(id?'/'+id:'/normal')+' PASS');
  }finally{await page.close()}
 }
 try{
  for(const game of ['klondike','freecell','pyramid'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
  });
  await run('klondike',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/次の山札/);
   await page.locator('#stock').click();
   assert.equal(await page.locator('#undo').isEnabled(),true);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/次の山札/);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.equal(await page.locator('#wins').innerText(),'0');
  },{date:'2026-12-02',id:'J22'});
  await run('klondike',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/未公開の山札/);
  },{date:'2026-12-02',id:'J24'});
  await run('freecell',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   assert.ok(await page.locator('.card.hinted').count()>=1);
   const normal=page.locator('.ft-joker-mode button').first();
   await normal.click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('.card.hinted').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('pyramid',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/数字が\+1/);
   let mutated=await page.locator('#pyramid button[title^="元のカード"]').count();
   assert.ok(mutated>0,'at least one open mutated card must be present');
   await page.locator('#stock').click();
   assert.equal(await page.locator('#undo').isEnabled(),true);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#undo').isDisabled(),true);
  },{date:'2026-11-21',id:'J50'});
  await run('pyramid',async page=>{
   assert.equal(await page.locator('#jokerRescue').isVisible(),true);
   assert.equal(await page.locator('#jokerRescue').isDisabled(),true);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/1枚だけ救済除去/);
  },{date:'2026-11-10',id:'J64'});
  await run('pyramid',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨/);
   for(let i=0;i<7&&!(await page.locator('.joker-hint').count());i++){page.once('dialog',d=>d.accept());await page.locator('#restart').click()}
   assert.ok(await page.locator('.joker-hint').count()>0,'pyramid pair hints should appear');
  },{date:'2026-11-12',id:'J26'});

  // Phase 2: mobile gameplay, mode separation, and verifiable hidden-card previews.
  for(const game of ['spider','yukon','eight-off'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#undo').isDisabled(),true);
  });
  await run('spider',async page=>{
   const before=await page.locator('.ft-joker-ability').innerText();
   assert.match(before,/次の追加配札/);
   const labels=before.split('：').at(-1).trim().split(/\s+/);
   assert.equal(labels.length,10);
   await page.locator('#deal').click();
   assert.equal(await page.locator('#undo').isEnabled(),true);
   for(let i=0;i<10;i++)assert.equal(await page.locator('#board .pile').nth(i).locator('button.card').last().innerText(),labels[i]);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/次の追加配札/);
  },{date:'2026-12-02',id:'J22'});
  await run('spider',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/♠ 50枚/);
   await page.locator('#deal').click();
   assert.match(await page.locator('.ft-joker-ability').innerText(),/♠ 40枚/);
   await page.locator('#undo').click();
   assert.match(await page.locator('.ft-joker-ability').innerText(),/♠ 50枚/);
  },{date:'2026-12-02',id:'J24'});
  await run('spider',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨/);
   for(let i=0;i<8&&!await page.locator('.card.hinted').count();i++){page.once('dialog',d=>d.accept());await page.locator('#restart').click();}
   assert.ok(await page.locator('.card.hinted').count()>0,'spider should highlight legal move');
  },{date:'2026-11-12',id:'J26'});
  await run('yukon',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/列ごとの次の裏札/);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/列2/);
   assert.equal(await page.locator('#wins').innerText(),'0');
  },{date:'2026-12-02',id:'J22'});
  await run('yukon',async page=>{
   const info=await page.locator('.ft-joker-ability').innerText();assert.match(info,/未公開の裏札/);const counts=[...info.matchAll(/([♠♥♦♣]) (\d+)枚/g)].map(m=>Number(m[2]));assert.equal(counts.reduce((a,b)=>a+b,0),21);
  },{date:'2026-12-02',id:'J24'});
  await run('yukon',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨/);
   assert.ok(await page.locator('.card.hinted').count()>0,'yukon should highlight a legal move');
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.card.hinted').count(),0);
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
  },{date:'2026-11-12',id:'J26'});
  await run('eight-off',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨/);
   assert.ok(await page.locator('.card.hinted').count()>0,'eight-off should highlight a legal move');
   assert.equal(await page.locator('#freecount').innerText(),'4 / 8');
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.card.hinted').count(),0);
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
  },{date:'2026-11-12',id:'J26'});

  // Phase 3: Scorpion, Penguin, Canfield use the shared score bridge without changing solitaire rules.
  for(const game of ['scorpion','penguin','canfield'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('#undo').isDisabled(),true);
  });
  await run('scorpion',async page=>{
   const text=await page.locator('.ft-joker-ability').innerText();
   assert.match(text,/次の追加配札/);
   const planned=text.split('：').at(-1).trim().split(/\s+/);
   assert.equal(planned.length,3);
   await page.locator('#deal').click();
   assert.equal(await page.locator('#undo').isEnabled(),true);
   for(let i=0;i<3;i++)assert.equal(await page.locator('#board .pile').nth(i).locator('button.card').last().innerText(),planned[i]);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/次の追加配札/);
  },{date:'2026-12-02',id:'J22'});
  await run('scorpion',async page=>{
   const getCount=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await getCount(),3);
   await page.locator('#deal').click();
   assert.equal(await getCount(),0);
   await page.locator('#undo').click();
   assert.equal(await getCount(),3);
  },{date:'2026-12-02',id:'J24'});
  await run('scorpion',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   for(let i=0;i<12&&await page.locator('.card.hinted').count()===0;i++){
    page.once('dialog',d=>d.accept());await page.locator('#restart').click();
   }
   assert.ok(await page.locator('.card.hinted').count()>0,'Scorpion J26 must mark a legal move');
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.card.hinted').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('penguin',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   assert.ok(await page.locator('.card.hinted').count()>0,'Penguin J26 must mark a legal move');
   await page.locator('#board .pile').first().locator('button.card').last().click();
   await page.locator('#slots .card').first().click();
   assert.equal(await page.locator('#undo').isEnabled(),true);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#undo').isDisabled(),true);
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.card.hinted').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('canfield',async page=>{
   const before=await page.locator('.ft-joker-ability').innerText();
   assert.match(before,/次の3枚/);
   const planned=before.split('：').at(-1).trim().split(/\s+/);
   assert.equal(planned.length,3);
   assert.equal(await page.locator('#stockcount').innerText(),'34');
   await page.locator('#stock').click();
   assert.equal(await page.locator('#waste .card').innerText(),planned.at(-1));
   assert.equal(await page.locator('#stockcount').innerText(),'31');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#stockcount').innerText(),'34');
   assert.equal(await page.locator('.ft-joker-ability').innerText(),before);
  },{date:'2026-12-02',id:'J22'});
  await run('canfield',async page=>{
   const total=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await total(),34);
   await page.locator('#stock').click();
   assert.equal(await total(),31);
   await page.locator('#undo').click();
   assert.equal(await total(),34);
  },{date:'2026-12-02',id:'J24'});
  await run('canfield',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   await page.locator('#stock').click();
   assert.equal(await page.locator('#undo').isEnabled(),true);
   page.once('dialog',d=>d.accept());
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.card.hinted').count(),0);
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
  },{date:'2026-11-12',id:'J26'});


  // Phase 4: ±1 solitaire family and the wraparound Black Hole.
  for(const game of ['golf','tripeaks','black-hole'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('#undo').isDisabled(),true);
  });
  await run('golf',async page=>{
   const prior=await page.locator('.ft-joker-ability').innerText();
   assert.match(prior,/次の山札/);
   const card=prior.split('：').at(-1).trim();
   await page.locator('#stock').click();
   assert.equal(await page.locator('#base').innerText(),card);
   assert.equal(await page.locator('#undo').isEnabled(),true);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#stockCount').innerText(),'16');
   assert.equal(await page.locator('.ft-joker-ability').innerText(),prior);
  },{date:'2026-12-02',id:'J22'});
  await run('golf',async page=>{
   const all=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((s,m)=>s+Number(m[2]),0);
   assert.equal(await all(),16);
   await page.locator('#stock').click();
   assert.equal(await all(),15);
   await page.locator('#undo').click();
   assert.equal(await all(),16);
  },{date:'2026-12-02',id:'J24'});
  await run('golf',async page=>{
   const changed=page.locator('#columns .card[title^="元のカード"]');
   assert.ok(await changed.count()>0,'J50 rank-shift display required');
   assert.notEqual(await changed.first().innerText(),(await changed.first().getAttribute('title')).replace('元のカード：',''));
   assert.match(await page.locator('.ft-joker-ability').innerText(),/数字が\+1/);
   await page.locator('#stock').click();
   assert.equal(await page.locator('#undo').isEnabled(),true);
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.equal(await page.locator('#columns .card[title^="元のカード"]').count(),0);
  },{date:'2026-11-21',id:'J50'});
  await run('golf',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   for(let i=0;i<12&&!await page.locator('.card.joker-hint').count();i++){
    page.once('dialog',d=>d.accept());await page.locator('#restart').click();
   }
   assert.ok(await page.locator('.card.joker-hint').count()>0,'Golf legal candidate highlight');
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.card.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('tripeaks',async page=>{
   const before=await page.locator('.ft-joker-ability').innerText();
   assert.match(before,/次の山札/);
   await page.locator('#stock').click();
   assert.equal(await page.locator('#base').innerText(),before.split('：').at(-1).trim());
   await page.locator('#undo').click();
   assert.equal(await page.locator('#stockCount').innerText(),'23');
   assert.equal(await page.locator('.ft-joker-ability').innerText(),before);
  },{date:'2026-12-02',id:'J22'});
  await run('tripeaks',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((s,m)=>s+Number(m[2]),0);
   assert.equal(await sum(),23);
   await page.locator('#stock').click();
   assert.equal(await sum(),22);
   await page.locator('#undo').click();
   assert.equal(await sum(),23);
  },{date:'2026-12-02',id:'J24'});
  await run('tripeaks',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/数字が-1/);
   const changed=page.locator('#board .card[title^="元のカード"]');
   assert.ok(await changed.count()>0,'J51 should affect exposed cards');
   assert.notEqual(await changed.first().innerText(),(await changed.first().getAttribute('title')).replace('元のカード：',''));
  },{date:'2026-11-21',id:'J51'});
  await run('tripeaks',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   for(let i=0;i<12&&!await page.locator('.card.joker-hint').count();i++){
    page.once('dialog',d=>d.accept());await page.locator('#restart').click();
   }
   assert.ok(await page.locator('.card.joker-hint').count()>0,'Tripeaks J26 must mark an available card');
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.card.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('black-hole',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   for(let i=0;i<12&&!await page.locator('.card.joker-hint').count();i++){
    page.once('dialog',d=>d.accept());await page.locator('#restart').click();
   }
   const recommended=page.locator('#board .card.joker-hint');
   assert.equal(await recommended.count(),1,'Black Hole only highlights the best available option');
   assert.match(await recommended.first().getAttribute('aria-label'),/吸収可能/);
   await recommended.first().click();
   assert.equal(await page.locator('#undo').isEnabled(),true);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#undo').isDisabled(),true);
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.card.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('black-hole',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/終了時の得点補正/);
   assert.equal(await page.locator('.card.joker-hint').count(),0);
  },{date:'2026-12-02',id:'J22'});

  console.log(results.join('\n'));console.log('JOKER layout mobile checks PASS '+results.length);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
