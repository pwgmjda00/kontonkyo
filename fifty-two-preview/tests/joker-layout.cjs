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
  },{date:'2026-11-17',id:'J51'});
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
   for(let i=0;i<12&&!await page.locator('.card.joker-hint').count();i++){
    page.once('dialog',d=>d.accept());await page.locator('#restart').click();
   }
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
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


  // Phase 5: pair-removal games. Respect their exact legal pair/triple rules.
  const rankOf=t=>({A:1,J:11,Q:12,K:13}[t.slice(0,-1)]||Number(t.slice(0,-1)));
  async function elevensGroup(page){
   const a=await page.locator('#board button.card').allTextContents();
   for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++){
    const x=rankOf(a[i]),y=rankOf(a[j]);
    if(x<=10&&y<=10&&x+y===11)return [i,j];
   }
   const idx=[11,12,13].map(r=>a.findIndex(t=>rankOf(t)===r));
   return idx.every(i=>i>=0)?idx:[];
  }
  async function monteGroup(page){
   const a=await page.locator('#board button.card').allTextContents();
   for(let i=0;i<25;i++)for(let j=i+1;j<25;j++){
    if(rankOf(a[i])===rankOf(a[j])&&Math.abs(i%5-j%5)<=1&&Math.abs(Math.floor(i/5)-Math.floor(j/5))<=1)return [i,j];
   }
   return [];
  }
  async function restartUntil(page,get,check,limit=25){
   for(let n=0;n<limit;n++){
    const x=await get(page);
    if(check(x))return x;
    page.once('dialog',d=>d.accept());await page.locator('#restart').click();
   }
   throw new Error('Could not produce the required legal pair on reroll');
  }
  for(const game of ['elevens','fourteen-out','monte-carlo','nestor'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.equal(await page.locator('.joker-hint').count(),0);
  });
  await run('elevens',async page=>{
   const ids=await restartUntil(page,elevensGroup,x=>x.length>=2);
   const old=await page.locator('.ft-joker-ability').innerText();
   assert.match(old,/次の補充札/);
   const planned=old.split('：').at(-1).trim().split(/\s+/);
   assert.equal(planned.length,3);
   for(const i of ids)await page.locator('#board button.card').nth(i).click();
   assert.equal(await page.locator('#removed').innerText(),ids.length+' / 52');
   for(let j=0;j<ids.length;j++)assert.equal(await page.locator('#board button.card').nth(ids[j]).innerText(),planned[j]);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#removed').innerText(),'0 / 52');
   assert.equal(await page.locator('.ft-joker-ability').innerText(),old);
  },{date:'2026-12-02',id:'J22'});
  await run('elevens',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),43);
   const ids=await restartUntil(page,elevensGroup,x=>x.length>=2);
   for(const i of ids)await page.locator('#board button.card').nth(i).click();
   assert.equal(await sum(),43-ids.length);
   await page.locator('#undo').click();
   assert.equal(await sum(),43);
  },{date:'2026-12-02',id:'J24'});
  await run('monte-carlo',async page=>{
   const ids=await restartUntil(page,monteGroup,x=>x.length===2);
   const old=await page.locator('.ft-joker-ability').innerText();
   assert.match(old,/次の補充札/);
   const planned=old.split('：').at(-1).trim().split(/\s+/);
   assert.equal(planned.length,3);
   for(const i of ids)await page.locator('#board button.card').nth(i).click();
   assert.equal(await page.locator('#removed').innerText(),'2 / 52');
   await page.locator('#compact').click();
   assert.equal(await page.locator('#stock').innerText(),'25');
   assert.equal(await page.locator('#board button.card').nth(23).innerText(),planned[0]);
   assert.equal(await page.locator('#board button.card').nth(24).innerText(),planned[1]);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#stock').innerText(),'27');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#removed').innerText(),'0 / 52');
   assert.equal(await page.locator('.ft-joker-ability').innerText(),old);
  },{date:'2026-12-02',id:'J22'});
  await run('monte-carlo',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),27);
   const ids=await restartUntil(page,monteGroup,x=>x.length===2);
   for(const i of ids)await page.locator('#board button.card').nth(i).click();
   await page.locator('#compact').click();
   assert.equal(await sum(),25);
   await page.locator('#undo').click();
   assert.equal(await sum(),27);
  },{date:'2026-12-02',id:'J24'});
  for(const game of ['elevens','fourteen-out','monte-carlo','nestor'])await run(game,async page=>{
   const selector=game==='nestor'?'#board button.card, #reserve button.card':'#board button.card';
   async function picks(){return page.locator(selector).evaluateAll(els=>els.map((b,i)=>b.classList.contains('joker-hint')?i:-1).filter(i=>i>=0))}
   const ids=await restartUntil(page,()=>picks(),x=>x.length>=2);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   const count=ids.length;
   assert.ok(count===2||(game==='elevens'&&count===3),'JOKER hint must be valid pair/trio');
   for(const i of ids)await page.locator(selector).nth(i).click();
   assert.equal(await page.locator('#removed').innerText(),count+' / 52');
   assert.equal(await page.locator('#undo').isEnabled(),true);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#removed').innerText(),'0 / 52');
   await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('fourteen-out',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/終了時の得点補正/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-21',id:'J50'});


  // Phase 6: Aces Up, Baker's Dozen, Flower Garden, La Belle Lucie.
  for(const game of ['aces-up','bakers-dozen','flower-garden','la-belle-lucie'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.equal(await page.locator('.joker-hint').count(),0);
  });
  await run('aces-up',async page=>{
   const text=await page.locator('.ft-joker-ability').innerText();
   assert.match(text,/次の4列へ配るカード/);
   const planned=text.split('：').at(-1).trim().split(/\s+/);
   assert.equal(planned.length,4);
   await page.locator('#deal').click();
   assert.equal(await page.locator('#stock').innerText(),'44');
   assert.equal(await page.locator('#undo').isEnabled(),true);
   for(let i=0;i<4;i++)assert.equal(await page.locator('#columns .column').nth(i).locator('.card').innerText(),planned[i]);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#stock').innerText(),'48');
   assert.equal(await page.locator('.ft-joker-ability').innerText(),text);
   assert.equal(await page.locator('#undo').isDisabled(),true);
  },{date:'2026-12-02',id:'J22'});
  await run('aces-up',async page=>{
   const all=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await all(),48);
   await page.locator('#deal').click();
   assert.equal(await all(),44);
   await page.locator('#undo').click();
   assert.equal(await all(),48);
  },{date:'2026-12-02',id:'J24'});
  async function j26Deal(page){
   for(let i=0;i<16&&await page.locator('.card.joker-hint').count()===0;i++){
    page.once('dialog',d=>d.accept());await page.locator('#restart').click();
   }
   assert.ok(await page.locator('.card.joker-hint').count()>0,'J26 must highlight a legal move');
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
  }
  await run('aces-up',async page=>{
   await j26Deal(page);
   const hinted=page.locator('#columns .card.joker-hint');
   assert.equal(await hinted.count(),1);
   await hinted.click();
   assert.equal(await page.locator('#removed').innerText(),'1 / 48');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#removed').innerText(),'0 / 48');
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.card.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  for(const game of ['bakers-dozen','flower-garden','la-belle-lucie'])await run(game,async page=>{
   await j26Deal(page);
   const msg=await page.locator('.ft-joker-ability').innerText();
   const match=msg.match(/推奨手：([^\n]+)/);
   assert.ok(match,'J26 should display the recommended move');
   const [from,to]=match[1].trim().split(/\s*→\s*/);
   assert.ok(from&&to,'recommendation has source and destination');
   async function clickPlace(name,asSource){
    const n=Number(name.match(/\d+/)?.[0]),si=['♠','♥','♦','♣'].findIndex(s=>name.startsWith(s));
    if(name.includes('組札')){
     assert.ok(si>=0,'foundation must have a suit');
     await page.locator('#foundations').locator(game==='flower-garden'?'.pile':'.foundation').nth(si).locator('.card').last().click();
    }else if(game==='bakers-dozen'){
     assert.ok(n>=1);await page.locator('#board .pile').nth(n-1).locator('.card').last().click();
    }else if(game==='flower-garden'){
     assert.ok(n>=1);
     if(name.startsWith('花束'))await page.locator('#reserve .card').nth(n-1).click();
     else await page.locator('#board .pile').nth(n-1).locator('.card').last().click();
    }else{
     assert.ok(n>=1);await page.locator('#board .fan').nth(n-1).locator('.card').last().click();
    }
   }
   await clickPlace(from,true);
   await clickPlace(to,false);
   assert.equal(await page.locator('#undo').isEnabled(),true,game+' J26 should be executable');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#undo').isDisabled(),true);
   page.once('dialog',d=>d.accept());
   await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('.card.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('la-belle-lucie',async page=>{
   assert.equal(await page.locator('#redeals').innerText(),'2回');
   await page.locator('#redeal').click();
   assert.equal(await page.locator('#redeals').innerText(),'1回');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#redeals').innerText(),'2回');
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/終了時の得点補正/);
  },{date:'2026-12-02',id:'J22'});
  await run('flower-garden',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/終了時の得点補正/);
  },{date:'2026-12-02',id:'J24'});


  // Phase 7: 104-card and foundation-building solitaire variants.
  for(const game of ['forty-thieves','beleaguered-castle','simple-simon','osmosis'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.equal(await page.locator('.joker-hint').count(),0);
  });
  for(const [game,count] of [['forty-thieves',64],['osmosis',35]])await run(game,async page=>{
   const text=await page.locator('.ft-joker-ability').innerText();
   assert.match(text,/次の山札/);
   const planned=text.split('：').at(-1).trim();
   await page.locator('#stock').click();
   assert.equal(await page.locator('#stockcount').innerText(),String(count-1));
   assert.equal(await page.locator('#waste .card').innerText(),planned);
   assert.equal(await page.locator('#undo').isEnabled(),true);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#stockcount').innerText(),String(count));
   assert.equal(await page.locator('.ft-joker-ability').innerText(),text);
   assert.equal(await page.locator('#undo').isDisabled(),true);
  },{date:'2026-12-02',id:'J22'});
  for(const [game,count] of [['forty-thieves',64],['osmosis',35]])await run(game,async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),count);
   await page.locator('#stock').click();
   assert.equal(await sum(),count-1);
   await page.locator('#undo').click();
   assert.equal(await sum(),count);
  },{date:'2026-12-02',id:'J24'});
  async function ensureFoundationHint(page,game){
   for(let i=0;i<28;i++){
    if(await page.locator('.card.joker-hint').count()>=2)return;
    if((game==='forty-thieves'||game==='osmosis')&&i%3!==2&&await page.locator('#stock').isEnabled()){
     await page.locator('#stock').click();
    }else{
     page.once('dialog',d=>d.accept());
     await page.locator('#restart').click();
    }
   }
   assert.fail(game+' did not produce an opening J26 action');
  }
  for(const game of ['forty-thieves','beleaguered-castle','osmosis'])await run(game,async page=>{
   await ensureFoundationHint(page,game);
   const msg=await page.locator('.ft-joker-ability').innerText();
   const match=msg.match(/推奨手：([^\n]+)/);
   assert.ok(match,'J26 recommendation should name a move');
   const [from,to]=match[1].trim().split(/\s*→\s*/);
   assert.ok(from&&to);
   const suits=['♠','♥','♦','♣'];
   const col=(n)=>page.locator('#board .pile').nth(n-1).locator('.card').last();
   async function tapName(name){
    if(name==='捨て札')return page.locator('#waste .card').click();
    if(name.startsWith('予備'))return page.locator('#reserve .pile').nth(Number(name.match(/\d+/)[0])-1).locator('.card').click();
    if(name.startsWith('列')){
     const n=Number(name.match(/\d+/)[0]);
     if(game==='beleaguered-castle')return page.locator(n<=4?'#left .pile':'#right .pile').nth(n<=4?n-1:n-5).locator('.card').last().click();
     return col(n).click();
    }
    if(name.includes('組札')){
     const si=suits.findIndex(x=>name.startsWith(x));assert.ok(si>=0);
     const index=game==='forty-thieves'?si+4*(Number(name.match(/組札(\d+)/)?.[1]||1)-1):si;
     return page.locator('#foundations').locator(game==='forty-thieves'?'.foundation':':scope > div').nth(index).locator('.card').last().click();
    }
    if(name.includes('段')){
     const n=Number(name.match(/\d+/)[0]);return page.locator('#foundations .pile').nth(n-1).locator('.card').click();
    }
    throw new Error('Unknown recommended destination: '+name);
   }
   const before=await page.locator('#undo').isEnabled();
   await tapName(from);
   await tapName(to);
   assert.equal(await page.locator('#undo').isEnabled(),true);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#undo').isEnabled(),before);
   if(!before){
    await page.locator('.ft-joker-mode button').first().click();
   }else{
    page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   }
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('simple-simon',async page=>{
   await ensureFoundationHint(page,'simple-simon');
   const msg=await page.locator('.ft-joker-ability').innerText();
   const m=msg.match(/推奨手：列(\d+) (.+?)から(\d+)枚 → 列(\d+)/);
   assert.ok(m,'Simon should specify exact moving run');
   const src=Number(m[1])-1,dst=Number(m[4])-1,card=m[2],count=Number(m[3]);
   assert.ok(count>=1);
   const from=page.locator('#board .pile').nth(src).locator('.card').filter({hasText:card}).last();
   assert.equal(await from.count(),1);
   await from.click({position:{x:8,y:8}});
   await page.locator('#board .pile').nth(dst).locator('.card').last().click();
   assert.equal(await page.locator('#undo').isEnabled(),true);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#undo').isEnabled(),false);
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  for(const game of ['beleaguered-castle','simple-simon'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/終了時の得点補正/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-12-02',id:'J22'});


  // Phase 8: puzzles with no stock, fixed rows and mathematical foundations.
  for(const game of ['accordion','gaps','cruel','calculation'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.equal(await page.locator('.joker-hint').count(),0);
  });
  await run('calculation',async page=>{
   const prior=await page.locator('.ft-joker-ability').innerText();
   assert.match(prior,/次の山札/);
   const expected=prior.split('：').at(-1).trim();
   await page.locator('#draw').click();
   assert.equal(await page.locator('#stock').innerText(),'47');
   assert.equal(await page.locator('#hand').innerText(),expected);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#stock').innerText(),'48');
   assert.equal(await page.locator('#hand').innerText(),'なし');
   assert.equal(await page.locator('.ft-joker-ability').innerText(),prior);
  },{date:'2026-12-02',id:'J22'});
  await run('calculation',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),48);
   await page.locator('#draw').click();
   assert.equal(await sum(),47);
   await page.locator('#undo').click();
   assert.equal(await sum(),48);
  },{date:'2026-12-02',id:'J24'});
  await run('calculation',async page=>{
   assert.equal(await page.locator('#draw.joker-hint').count(),1);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/山札をめくる/);
   await page.locator('#draw').click();
   const m=(await page.locator('.ft-joker-ability').innerText()).match(/推奨手：手札 → (組札|仮置き)(\d+)/);
   assert.ok(m,'J26 must name a valid destination for the drawn hand');
   assert.equal(await page.locator('#hand.joker-hint').count(),1);
   const target=m[1]==='組札'?page.locator('#foundations .slot').nth(Number(m[2])-1).locator('.card'):page.locator('#wastes .slot').nth(Number(m[2])-1).locator('.card');
   assert.equal(await target.count(),1);
   await target.click();
   assert.equal(await page.locator('#undo').isEnabled(),true);
   assert.equal(await page.locator('#hand').innerText(),'なし');
   await page.locator('#undo').click();
   assert.notEqual(await page.locator('#hand').innerText(),'なし');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#stock').innerText(),'48');
   assert.equal(await page.locator('#undo').isDisabled(),true);
   await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('accordion',async page=>{
   for(let i=0;i<10&&!await page.locator('.pile.joker-hint').count();i++){
    page.once('dialog',d=>d.accept());await page.locator('#restart').click();
   }
   const m=(await page.locator('.ft-joker-ability').innerText()).match(/推奨手：山(\d+) → 山(\d+)/);
   assert.ok(m,'Accordion J26 recommendation must name two legal piles');
   assert.equal(await page.locator('.pile.joker-hint').count(),2);
   const before=await page.locator('#remaining').innerText();
   const src=Number(m[1])-1,dst=Number(m[2])-1;
   await page.locator('#board .pile').nth(src).click();
   await page.locator('#board .pile').nth(dst).click();
   assert.equal(await page.locator('#moves').innerText(),'1');
   assert.equal(await page.locator('#remaining').innerText(),'51 / 52');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#remaining').innerText(),before);
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.pile.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('gaps',async page=>{
   for(let i=0;i<20&&!await page.locator('.card.joker-hint').count();i++){
    page.once('dialog',d=>d.accept());await page.locator('#restart').click();
   }
   const m=(await page.locator('.ft-joker-ability').innerText()).match(/推奨手：位置(\d+) → 空白(\d+)/);
   assert.ok(m,'Gaps J26 recommendation must name a legal move');
   assert.equal(await page.locator('.card.joker-hint').count(),2);
   const src=Number(m[1])-1,dst=Number(m[2])-1;
   const current=await page.locator('#board .card').nth(src).innerText();
   await page.locator('#board .card').nth(src).click();
   await page.locator('#board .card').nth(dst).click();
   assert.equal(await page.locator('#board .card').nth(dst).innerText(),current);
   assert.equal(await page.locator('#undo').isEnabled(),true);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#board .card').nth(src).innerText(),current);
   assert.equal(await page.locator('#undo').isDisabled(),true);
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('gaps',async page=>{
   assert.equal(await page.locator('#redeals').innerText(),'2回残り');
   await page.locator('#redeal').click();
   assert.equal(await page.locator('#redeals').innerText(),'1回残り');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#redeals').innerText(),'2回残り');
   assert.match(await page.locator('.ft-joker-ability').innerText(),/終了時の得点補正/);
  },{date:'2026-12-02',id:'J22'});
  await run('cruel',async page=>{
   for(let i=0;i<30&&!await page.locator('.card.joker-hint').count();i++){
    page.once('dialog',d=>d.accept());await page.locator('#restart').click();
   }
   const m=(await page.locator('.ft-joker-ability').innerText()).match(/推奨手：列(\d+) → (列(\d+)|([♠♥♦♣])組札)/);
   assert.ok(m,'Cruel J26 recommendation must name a legal move');
   assert.equal(await page.locator('.card.joker-hint').count(),2);
   const src=Number(m[1])-1;
   await page.locator('#board .pile').nth(src).locator('.card').last().click();
   if(m[3])await page.locator('#board .pile').nth(Number(m[3])-1).locator('.card').last().click();
   else await page.locator('#foundations .foundation').nth(['♠','♥','♦','♣'].indexOf(m[4])).locator('.card').click();
   assert.equal(await page.locator('#undo').isEnabled(),true);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#undo').isDisabled(),true);
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('cruel',async page=>{
   assert.equal(await page.locator('#redeals').innerText(),'0回');
   await page.locator('#redeal').click();
   assert.equal(await page.locator('#redeals').innerText(),'1回');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#redeals').innerText(),'0回');
  },{date:'2026-12-02',id:'J22'});


  // Phase 9: maze, 8-puzzle, flip puzzle and chance-based clock solitaire.
  for(const game of ['kings-road','royal-slide','paradox-switch','clock'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.equal(await page.locator('.joker-hint').count(),0);
  });
  await run('clock',async page=>{
   const prior=await page.locator('.ft-joker-ability').innerText();
   assert.match(prior,/次の時計札/);
   const predicted=prior.split('：').at(-1).trim();
   assert.ok(predicted);
   await page.locator('#step').click();
   assert.equal(await page.locator('#revealed').innerText(),'1 / 52');
   assert.equal(await page.locator('#clock .pile').nth(12).locator('.face').innerText(),predicted);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#revealed').innerText(),'0 / 52');
   assert.equal(await page.locator('.ft-joker-ability').innerText(),prior);
   assert.equal(await page.locator('#undo').isDisabled(),true);
  },{date:'2026-12-02',id:'J22'});
  await run('clock',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),52);
   await page.locator('#step').click();
   assert.equal(await sum(),51);
   await page.locator('#undo').click();
   assert.equal(await sum(),52);
  },{date:'2026-12-02',id:'J24'});
  await run('clock',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/一択/);
   assert.equal(await page.locator('#clock .pile.joker-hint').count(),1);
   await page.locator('#step').click();
   assert.equal(await page.locator('#revealed').innerText(),'1 / 52');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#revealed').innerText(),'0 / 52');
   await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('kings-road',async page=>{
   const m=(await page.locator('.ft-joker-ability').innerText()).match(/推奨手：位置1 → (\d+)/);
   assert.ok(m,'Kings Road should recommend a legal adjacent cell');
   const i=Number(m[1])-1;
   assert.equal(await page.locator('#board .cell').nth(i).isEnabled(),true);
   assert.equal(await page.locator('#board .cell.joker-hint').count(),1);
   await page.locator('#board .cell').nth(i).click();
   assert.equal(await page.locator('#steps').innerText(),'1');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#steps').innerText(),'0');
   assert.equal(await page.locator('#hp').innerText(),'25');
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('royal-slide',async page=>{
   const m=(await page.locator('.ft-joker-ability').innerText()).match(/推奨手：位置(\d+)を空白/);
   assert.ok(m,'Royal Slide should recommend a legal tile');
   const i=Number(m[1])-1;
   assert.equal(await page.locator('#board .tile.joker-hint').count(),1);
   assert.equal(await page.locator('#board .tile').nth(i).isEnabled(),true);
   await page.locator('#board .tile').nth(i).click();
   assert.equal(await page.locator('#moves').innerText(),'1');
   await page.locator('#undo').click();
   assert.equal(await page.locator('#moves').innerText(),'0');
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('paradox-switch',async page=>{
   let iterations=0;
   while(await page.locator('#wins').innerText()==='0'&&await page.locator('#jokerWins').innerText()==='0'&&iterations++<17){
    const m=(await page.locator('.ft-joker-ability').innerText()).match(/推奨手：行(\d+)列(\d+)を反転/);
    assert.ok(m,'Paradox J26 should recommend a minimum-solution step');
    const i=(Number(m[1])-1)*4+Number(m[2])-1;
    assert.equal(await page.locator('#board .card.joker-hint').count(),1);
    await page.locator('#board .card').nth(i).click();
   }
   assert.ok(iterations<=16,'recommended sequence must solve within 16 flips');
   assert.equal(await page.locator('#wins').innerText(),'0','normal wins remain separate');
   assert.equal(await page.locator('#jokerWins').innerText(),'1','JOKER win recorded');
   assert.match(await page.locator('#jokerBest').innerText(),/手/);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#jokerWins').innerText(),'0','undo must restore win count');
   assert.equal(await page.locator('#jokerBest').innerText(),'未達','undo must restore best');
   assert.equal(await page.locator('#undo').isEnabled(),true);
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  for(const game of ['kings-road','royal-slide','paradox-switch'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/終了時の得点補正/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-12-02',id:'J22'});


  // Phase 10: deduction, territory and market drafting.
  for(const game of ['suit-code','suit-dominion','zero-sum','redline'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('.joker-hint').count(),0);
  });
  for(const game of ['zero-sum','redline'])await run(game,async page=>{
   const text=await page.locator('.ft-joker-ability').innerText();
   assert.match(text,/次の山札/);
   const next=text.split('：').at(-1).trim();
   await page.locator('#market .choice').first().click();
   const expectedIndex=game==='zero-sum'?3:0;
   assert.ok((await page.locator('#market .choice').nth(expectedIndex).innerText()).includes(next),game+' predicted card must be actually drawn');
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
  },{date:'2026-12-02',id:'J22'});
  for(const [game,initial,after] of [['zero-sum',47,45],['redline',49,46]])await run(game,async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),initial,game+' initial stock');
   await page.locator('#market .choice').first().click();
   assert.equal(await sum(),after,game+' hidden stock after refill');
  },{date:'2026-12-02',id:'J24'});
  await run('suit-code',async page=>{
   const suits=['♠','♥','♦','♣'];
   for(let attempt=0;attempt<8;attempt++){
    const text=await page.locator('.ft-joker-ability').innerText();
    const match=text.match(/推奨手：([♠♥♦♣](?:\s+[♠♥♦♣]){3})/);
    assert.ok(match,'J26 should recommend a complete suit permutation');
    const order=match[1].split(/\s+/);
    assert.equal(new Set(order).size,4);
    for(const ch of order){
     const index=suits.indexOf(ch);
     assert.ok(index>=0);
     await page.locator('#symbols .symbol').nth(index).click();
    }
    assert.equal(await page.locator('#submit').isEnabled(),true);
    await page.locator('#submit').click();
    if(await page.locator('#jokerWins').innerText()==='1')break;
   }
   assert.equal(await page.locator('#jokerWins').innerText(),'1','deduction should solve within 8 guesses');
   assert.equal(await page.locator('#wins').innerText(),'0','normal wins remain separate');
   assert.match(await page.locator('#jokerBest').innerText(),/手/);
  },{date:'2026-11-12',id:'J26'});
  await run('suit-dominion',async page=>{
   const text=await page.locator('.ft-joker-ability').innerText();
   const m=text.match(/推奨手：([^\s]+) → 行(\d+)列(\d+)/);
   assert.ok(m,'J26 should recommend a playable hand and free cell');
   const hand=page.locator('#hand button.joker-hint');
   const cell=page.locator('#board .cell.joker-hint');
   assert.equal(await hand.count(),1);
   assert.equal(await cell.count(),1);
   assert.equal(await cell.isEnabled(),true);
   await hand.click();
   await cell.click();
   assert.equal(await page.locator('#left').innerText(),'7');
   assert.equal(await page.locator('#board .cell.mine').count(),1);
   assert.equal(await page.locator('#board .cell.cpu').count(),1);
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#left').innerText(),'8');
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  for(const game of ['zero-sum','redline'])await run(game,async page=>{
   const text=await page.locator('.ft-joker-ability').innerText();
   assert.match(text,/推奨手/);
   const hinted=page.locator('#market .choice.joker-hint');
   assert.equal(await hinted.count(),1,'J26 should mark one legal market choice');
   await hinted.click();
   if(game==='zero-sum'){
    assert.equal(await page.locator('#youHand .mini').count(),1);
   }else{
    assert.equal(await page.locator('#youCards .mini').count(),1);
   }
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  for(const game of ['suit-code','suit-dominion'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/終了時の得点補正/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-12-02',id:'J22'});


  // Phase 11: legal hand advice for seven seals, reverse auction, trump and sevens.
  for(const game of ['seven-seals','reverse-auction','trump-jack','sevens'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('.joker-hint').count(),0);
  });
  await run('seven-seals',async page=>{
   assert.equal(await page.locator('#hand .handcard').count(),21);
   assert.equal(await page.locator('#seals .seal').count(),7);
   const text=await page.locator('.ft-joker-ability').innerText();
   assert.match(text,/推奨手：手札\d+ .* → 封印\d+/);
   assert.equal(await page.locator('#hand .handcard.joker-hint').count(),1);
   assert.equal(await page.locator('#seals .seal.joker-hint').count(),1);
   await page.locator('#hand .handcard.joker-hint').click();
   assert.equal(await page.locator('#seals .seal.joker-hint').isEnabled(),true);
   await page.locator('#seals .seal.joker-hint').click();
   assert.equal(await page.locator('#placed').innerText(),'1 / 21');
   assert.equal(await page.locator('#undo').isEnabled(),true);
   await page.locator('#undo').click();
   assert.equal(await page.locator('#placed').innerText(),'0 / 21');
   assert.equal(await page.locator('#undo').isDisabled(),true);
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('reverse-auction',async page=>{
   assert.equal(await page.locator('#hand .card').count(),13);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手：.*で入札/);
   assert.equal(await page.locator('#hand .card.joker-hint').count(),1);
   const predicted=await page.locator('#hand .card.joker-hint').innerText();
   await page.locator('#hand .card.joker-hint').click();
   assert.equal(await page.locator('#yourBid').innerText(),predicted);
   assert.equal(await page.locator('#next').isVisible(),true);
   await page.locator('#next').click();
   assert.equal(await page.locator('#hand .card').count(),12);
   page.once('dialog',d=>d.accept());
   await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#hand .card').count(),13);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('trump-jack',async page=>{
   assert.equal(await page.locator('#hand .card').count(),13);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手：.*を出す/);
   assert.equal(await page.locator('#hand .card.joker-hint').count(),1);
   const predicted=await page.locator('#hand .card.joker-hint').innerText();
   await page.locator('#hand .card.joker-hint').click();
   assert.equal(await page.locator('#hand .card').count(),12);
   assert.equal(await page.locator('#yourCard').innerText(),predicted);
   assert.equal(await page.locator('#history > div').count(),1);
   assert.equal(await page.locator('#next').isVisible(),true);
   await page.locator('#next').click();
   assert.equal(await page.locator('#round').innerText(),'2 / 13');
   page.once('dialog',d=>d.accept());
   await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#hand .card').count(),13);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('sevens',async page=>{
   const starting=await page.locator('#hand .card').count();
   assert.ok(starting>=9&&starting<=13);
   const hint=await page.locator('.ft-joker-ability').innerText();
   assert.match(hint,/推奨手/);
   const cards=page.locator('#hand .card.joker-hint');
   if(await cards.count()){
    assert.equal(await cards.count(),1);
    assert.equal(await cards.isEnabled(),true);
    await cards.click();
    assert.equal(await page.locator('#hand .card').count(),starting-1);
   }else{
    assert.equal(await page.locator('#pass.joker-hint').count(),1);
    await page.locator('#pass').click();
    assert.equal(await page.locator('#passes').innerText(),'パス残り 2');
   }
   page.once('dialog',d=>d.accept());
   await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('.joker-hint').count(),0);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
  },{date:'2026-11-12',id:'J26'});
  for(const game of ['seven-seals','reverse-auction','trump-jack','sevens'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/終了時の得点補正/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-12-02',id:'J22'});


  // Phase 12: area control, hidden information, old maid and risk-limited bank.
  for(const game of ['eclipse','ghost-hand','old-maid','deadline'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('.joker-hint').count(),0);
  });
  await run('eclipse',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   const hand=page.locator('#hand button.joker-hint'),cell=page.locator('#board .cell.joker-hint');
   assert.equal(await hand.count(),1);
   assert.equal(await cell.count(),1);
   assert.equal(await cell.isEnabled(),true);
   await hand.click();
   await cell.click();
   assert.equal(await page.locator('#left').innerText(),'7');
   assert.equal(await page.locator('#board .cell.you,#board .cell.cpu').count(),2,'one player card and one CPU card were placed');
   assert.ok(await page.locator('#board .cell.cpu').count()>=1,'CPU may immediately capture the player card');
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#left').innerText(),'8');
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('ghost-hand',async page=>{
   assert.equal(await page.locator('#enemy .card').count(),5);
   assert.equal(await page.locator('#mine .card').count(),5);
   assert.equal(await page.locator('#enemy .card.joker-hint').count(),1);
   await page.locator('#enemy .card.joker-hint').click();
   assert.equal(await page.locator('#mine .card.joker-hint').count(),1);
   assert.equal(await page.locator('#mine .card.joker-hint').isEnabled(),true);
   await page.locator('#mine .card.joker-hint').click();
   assert.equal(await page.locator('#mine .card').count(),4);
   assert.equal(await page.locator('#history > div').count(),1);
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#mine .card').count(),5);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('ghost-hand',async page=>{
   const msg=await page.locator('.ft-joker-ability').innerText();
   assert.match(msg,/左端のCPU伏せ札/);
   const card=msg.split('：').at(-1).trim();
   await page.locator('#peek').click();
   await page.locator('#enemy .card').first().click();
   assert.ok((await page.locator('#enemy .card').first().innerText()).includes(card),'native peek must match J22 preview');
   assert.equal(await page.locator('#peeks').innerText(),'1');
  },{date:'2026-12-02',id:'J22'});
  await run('ghost-hand',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),5);
   await page.locator('#enemy .card').first().click();
   await page.locator('#mine .card').first().click();
   assert.equal(await sum(),4);
  },{date:'2026-12-02',id:'J24'});
  await run('old-maid',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/次の|CPUの左端/);
   const predicted=(await page.locator('.ft-joker-ability').innerText()).split('：').at(-1).trim();
   await page.locator('#backs .back').first().click();
   assert.ok((await page.locator('#history').innerText()).includes('あなたが'+predicted+'を引いた'),'old maid J22 preview must match drawn card');
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
  },{date:'2026-12-02',id:'J22'});
  await run('old-maid',async page=>{
   const ability=await page.locator('.ft-joker-ability').innerText();
   assert.match(ability,/未公開のCPUの伏せ札/);
   const total=[...ability.matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   const count=await page.locator('#backs .back').count();
   assert.ok(total===count||total===count-1,'JOKER without suit is excluded');
  },{date:'2026-12-02',id:'J24'});
  await run('old-maid',async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/当たり確率は同じ/);
   assert.equal(await page.locator('#backs .back.joker-hint').count(),1);
   await page.locator('#backs .back.joker-hint').click();
   assert.ok(await page.locator('#history li').count()>=1);
   assert.equal(await page.locator('#wins').innerText(),'0');
  },{date:'2026-11-12',id:'J26'});
  await run('deadline',async page=>{
   const msg=await page.locator('.ft-joker-ability').innerText();
   assert.match(msg,/次の山札/);
   const predicted=msg.split('：').at(-1).trim();
   await page.locator('#draw').click();
   assert.equal(await page.locator('#cards .card').last().innerText(),predicted);
   assert.equal(await page.locator('#deck').innerText(),'山札 51枚');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
  },{date:'2026-12-02',id:'J22'});
  await run('deadline',async page=>{
   const total=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await total(),52);
   await page.locator('#draw').click();
   assert.equal(await total(),51);
  },{date:'2026-12-02',id:'J24'});
  await run('deadline',async page=>{
   assert.equal(await page.locator('#draw.joker-hint').count(),1);
   await page.locator('#draw.joker-hint').click();
   assert.equal(await page.locator('#cards .card').count(),1);
   assert.equal(await page.locator('#draw.joker-hint,#bank.joker-hint').count(),1);
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#round').innerText(),'1 / 12');
   assert.equal(await page.locator('#cards .card').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('deadline',async page=>{
   for(let r=1;r<=12;r++){
    assert.equal(await page.locator('#round').innerText(),r+' / 12');
    await page.locator('#bank').click();
    if(r<12)await page.locator('#next').click();
   }
   assert.equal(await page.locator('#jokerWins').innerText(),'1','JOKER completion recorded');
   assert.equal(await page.locator('#wins').innerText(),'0','normal completion stays separate');
   assert.equal(await page.locator('#jokerBest').innerText(),'0');
   await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'1');
  },{date:'2026-12-02',id:'J22'});


  // Phase 13: memory-safe advice, chain hand play and conserved trick value.
  for(const game of ['last-word','echo','coronation','memory'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('.joker-hint').count(),0);
  });
  await run('last-word',async page=>{
   const ability=await page.locator('.ft-joker-ability').innerText();
   assert.match(ability,/次の山札/);
   const expected=ability.split('：').at(-1).trim();
   assert.equal(await page.locator('#countYou').innerText(),'7');
   assert.equal(await page.locator('#deckCount').innerText(),'37枚');
   await page.locator('#deck').click();
   assert.equal(await page.locator('#countYou').innerText(),'8');
   assert.equal(await page.locator('#youHand .card').last().innerText(),expected);
   assert.equal(await page.locator('#deckCount').innerText(),'36枚');
  },{date:'2026-12-02',id:'J22'});
  await run('last-word',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),37);
   await page.locator('#deck').click();
   assert.equal(await sum(),36);
  },{date:'2026-12-02',id:'J24'});
  await run('last-word',async page=>{
   const card=page.locator('#youHand .card.joker-hint');
   const draw=page.locator('#deck.joker-hint');
   const pass=page.locator('#pass.joker-hint');
   assert.equal(await card.count()+await draw.count()+await pass.count(),1,'J26 picks one legal action');
   if(await card.count()){
    assert.equal(await card.isEnabled(),true);
    await card.click();
    assert.equal(await page.locator('#countYou').innerText(),'6');
   }else if(await draw.count()){
    await draw.click();assert.equal(await page.locator('#countYou').innerText(),'8');
   }else await pass.click();
   page.once('dialog',d=>d.accept());
   await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#countYou').innerText(),'7');
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('echo',async page=>{
   const ability=await page.locator('.ft-joker-ability').innerText();
   assert.match(ability,/次の山札/);
   const predicted=ability.split('：').at(-1).trim();
   assert.equal(await page.locator('#hand .card').count(),5);
   await page.locator('#hand .card').first().click();
   assert.equal(await page.locator('#hand .card').count(),5);
   assert.equal(await page.locator('#hand .card').last().innerText(),predicted);
   assert.match(await page.locator('#remain').innerText(),/山札 46枚/);
  },{date:'2026-12-02',id:'J22'});
  await run('echo',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),47);
   await page.locator('#hand .card').first().click();
   assert.equal(await sum(),46);
  },{date:'2026-12-02',id:'J24'});
  await run('echo',async page=>{
   assert.equal(await page.locator('#hand .card.joker-hint').count(),1);
   await page.locator('#hand .card.joker-hint').click();
   const score=await page.locator('#score').innerText();
   assert.ok(Number(score)>0);
   assert.equal(await page.locator('#wins').innerText(),'0');
   await page.reload();
   assert.equal(await page.locator('#score').innerText(),score,'JOKER game must resume after reload');
   assert.match(await page.locator('.ft-joker-status').innerText(),/装備中/);
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#score').innerText(),'0');
   assert.equal(await page.locator('#hand .card').count(),5);
   assert.equal(await page.locator('.joker-hint').count(),0);
   assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('fifty-two-mode-echo'),JSON.parse(localStorage.getItem('fifty-two-echo-v1')).jokerMode]),['normal','normal'],'mode and persisted run must both be normal');
   assert.equal(await page.locator('#score').innerText(),'0');
  },{date:'2026-11-12',id:'J26'});
  await run('coronation',async page=>{
   assert.equal(await page.locator('#hand .card.joker-hint').count(),1);
   await page.locator('#hand .card.joker-hint').click();
   assert.equal(await page.locator('#hand .card').count(),6);
   assert.equal(await page.locator('#next').isEnabled(),true);
   await page.locator('#next').click();
   assert.equal(await page.locator('#round').innerText(),'2 / 7');
   await page.reload();
   assert.equal(await page.locator('#round').innerText(),'2 / 7','JOKER game must survive reload');
   assert.match(await page.locator('.ft-joker-status').innerText(),/装備中/);
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#round').innerText(),'1 / 7');
   assert.equal(await page.locator('#hand .card').count(),7);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('coronation',async page=>{
   for(let i=1;i<=7;i++){
    assert.equal(await page.locator('#round').innerText(),i+' / 7');
    await page.locator('#hand .card').first().click();
    if(i<7)await page.locator('#next').click();
   }
   assert.equal(await page.locator('#hand .card').count(),0);
   assert.equal(await page.locator('#wins').innerText(),'0');
   const text=await page.locator('#message').innerText();
   assert.equal(await page.locator('#jokerWins').innerText(),text.includes('あなたの総合優勝')?'1':'0');
   await page.reload();
   assert.equal(await page.locator('#jokerWins').innerText(),text.includes('あなたの総合優勝')?'1':'0');
  },{date:'2026-11-12',id:'J26'});
  await run('memory',async page=>{
   const msg=await page.locator('.ft-joker-ability').innerText();
   assert.match(msg,/次に開く裏札/);
   const predicted=msg.split('：').at(-1).trim();
   assert.equal(await page.locator('#board .card').count(),52);
   await page.locator('#board .card').first().click();
   assert.equal(await page.locator('#board .card').first().innerText(),predicted);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
  },{date:'2026-12-02',id:'J22'});
  await run('memory',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),52);
   await page.locator('#board .card').first().click();
   assert.equal(await sum(),51,'opened cards are excluded from hidden counts');
  },{date:'2026-12-02',id:'J24'});
  await run('memory',async page=>{
   assert.equal(await page.locator('#board .card.joker-hint').count(),1);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/未知の札を調べる/);
   await page.locator('#board .card.joker-hint').click();
   assert.equal(await page.locator('#board .card.face').count(),1);
   assert.equal(await page.locator('#board .card.joker-hint').count(),1);
   await page.locator('#board .card.joker-hint').click();
   assert.equal(await page.locator('#board .card.face').count(),2);
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#board .card.face').count(),0);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  for(const game of ['coronation'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/終了時の得点補正/);
  },{date:'2026-12-02',id:'J22'});


  // Phase 14: crafting, weighing, increasing foundations and target-sum seals.
  for(const game of ['alchemy','balance','lighthouse','seal'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   for(const id of ['wins','jokerWins','best','jokerBest'])assert.equal(await page.locator('#'+id).innerText(),'0');
   assert.equal(await page.locator('.joker-hint').count(),0);
  });
  await run('alchemy',async page=>{
   const text=await page.locator('.ft-joker-ability').innerText();
   assert.match(text,/次の山札/);
   const expected=text.split('：').at(-1).trim();
   assert.equal(await page.locator('#market .card').count(),3);
   await page.locator('#market .card').first().click();
   assert.equal(await page.locator('#market .card').first().innerText(),expected,'J22 must match replenished material');
   assert.equal(await page.locator('#turns').innerText(),'11');
  },{date:'2026-12-02',id:'J22'});
  await run('alchemy',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),49);
   await page.locator('#market .card').first().click();
   assert.equal(await sum(),48);
  },{date:'2026-12-02',id:'J24'});
  await run('alchemy',async page=>{
   assert.equal(await page.locator('#market .card.joker-hint').count(),1);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   await page.locator('#market .card.joker-hint').click();
   assert.equal(await page.locator('#turns').innerText(),'11');
   await page.reload();
   assert.equal(await page.locator('#turns').innerText(),'11','JOKER crafting state survives reload');
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#turns').innerText(),'12');
   assert.equal(await page.locator('.joker-hint').count(),0);
   assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('fifty-two-mode-alchemy'),JSON.parse(localStorage.getItem('fifty-two-alchemy-v1')).jokerMode]),['normal','normal']);
  },{date:'2026-11-12',id:'J26'});
  await run('alchemy',async page=>{
   for(let i=0;i<12;i++)await page.locator('#market .card').first().click();
   assert.equal(await page.locator('#turns').innerText(),'0');
   assert.equal(await page.locator('#finish').isEnabled(),true);
   await page.locator('#finish').click();
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'1');
   await page.reload();
   assert.equal(await page.locator('#jokerWins').innerText(),'1');
  },{date:'2026-11-12',id:'J26'});
  await run('balance',async page=>{
   const text=await page.locator('.ft-joker-ability').innerText();
   assert.match(text,/次の表示待ちの札/);
   const expected=text.split('：').at(-1).trim();
   await page.locator('#putLeft').click();
   assert.equal(await page.locator('#current').innerText(),expected,'balance J22 previews next face-up card');
   assert.equal(await page.locator('#turn').innerText(),'1 / 10');
  },{date:'2026-12-02',id:'J22'});
  await run('balance',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),9);
   await page.locator('#putRight').click();
   assert.equal(await sum(),8);
  },{date:'2026-12-02',id:'J24'});
  await run('balance',async page=>{
   assert.equal(await page.locator('#putLeft.joker-hint,#putRight.joker-hint').count(),1);
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   await page.locator('#putLeft.joker-hint,#putRight.joker-hint').click();
   assert.equal(await page.locator('#turn').innerText(),'1 / 10');
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#turn').innerText(),'0 / 10');
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('balance',async page=>{
   for(let i=0;i<10;i++)await page.locator('#putLeft').click();
   assert.equal(await page.locator('#turn').innerText(),'10 / 10');
   assert.equal(await page.locator('#jokerWins').innerText(),'1');
   assert.equal(await page.locator('#wins').innerText(),'0');
   const score=await page.locator('#score').innerText();
   assert.equal(await page.locator('#jokerBest').innerText(),score);
   await page.reload();
   assert.equal(await page.locator('#jokerWins').innerText(),'1');
   assert.equal(await page.locator('#jokerBest').innerText(),score);
  },{date:'2026-11-12',id:'J26'});
  await run('lighthouse',async page=>{
   const text=await page.locator('.ft-joker-ability').innerText();
   assert.match(text,/次の山札/);
   const expected=text.split('：').at(-1).trim();
   const hand=await page.locator('#hand .card').allInnerTexts();
   const i=hand.findIndex(x=>x.startsWith('A')||x.startsWith('2')||x.startsWith('3')||x.startsWith('4')||x.startsWith('5')||x.startsWith('6')||x.startsWith('7')||x.startsWith('8')||x.startsWith('9')||x.startsWith('10')||x.startsWith('J')||x.startsWith('Q')||x.startsWith('K'));
   assert.ok(i>=0);
   const si=['♠','♥','♦','♣'].indexOf(hand[i].slice(-1));
   await page.locator('#hand .card').nth(i).click();
   await page.locator('#towers .tower').nth(si).click();
   assert.equal(await page.locator('#hand .card').last().innerText(),expected,'lighthouse J22 matches actual refill');
   assert.equal(await page.locator('#placed').innerText(),'1');
  },{date:'2026-12-02',id:'J22'});
  await run('lighthouse',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),47);
   const first=await page.locator('#hand .card').first().innerText();
   const si=['♠','♥','♦','♣'].indexOf(first.slice(-1));
   await page.locator('#hand .card').first().click();
   await page.locator('#towers .tower').nth(si).click();
   assert.equal(await sum(),46);
  },{date:'2026-12-02',id:'J24'});
  await run('lighthouse',async page=>{
   assert.equal(await page.locator('#hand .card.joker-hint').count(),1);
   await page.locator('#hand .card.joker-hint').click();
   assert.equal(await page.locator('#towers .tower.joker-hint').count(),1);
   assert.equal(await page.locator('#towers .tower.joker-hint').isEnabled(),true);
   await page.locator('#towers .tower.joker-hint').click();
   assert.equal(await page.locator('#placed').innerText(),'1');
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#placed').innerText(),'0');
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  async function solveSealOnPage(page){
   const raw=await page.locator('#hand .card').allInnerTexts();
   const values=raw.map(t=>{const r=t.slice(0,-1);return r==='A'?1:r==='J'?11:r==='Q'?12:r==='K'?13:Number(r)});
   const target=Number(await page.locator('#target').innerText());
   let solution=null;
   for(let i=0;i<values.length;i++){if(values[i]===target)solution=[i];for(let j=i+1;j<values.length;j++){if(values[i]+values[j]===target)solution=[i,j];for(let k=j+1;k<values.length;k++)if(values[i]+values[j]+values[k]===target)solution=[i,j,k]}}
   assert.ok(solution,'seal must have a valid target by original rules');
   for(const index of solution)await page.locator('#hand .card').nth(index).click();
   await page.locator('#solve').click();
   return solution.length;
  }
  await run('seal',async page=>{
   const text=await page.locator('.ft-joker-ability').innerText();
   assert.match(text,/次の山札/);
   const expected=text.split('：').at(-1).trim();
   const n=await solveSealOnPage(page);
   assert.equal(await page.locator('#hand .card').nth(7-n).innerText(),expected,'J22 seal preview matches first refill');
   assert.equal(await page.locator('#solved').innerText(),'1');
  },{date:'2026-12-02',id:'J22'});
  await run('seal',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),45);
   const n=await solveSealOnPage(page);
   assert.equal(await sum(),45-n);
  },{date:'2026-12-02',id:'J24'});
  await run('seal',async page=>{
   const indices=await page.locator('#hand .card').evaluateAll(els=>els.map((el,i)=>el.classList.contains('joker-hint')?i:-1).filter(i=>i>=0));
   assert.ok(indices.length>=1&&indices.length<=3,'J26 suggests 1 to 3 cards');
   assert.match(await page.locator('.ft-joker-ability').innerText(),/推奨手/);
   for(const i of indices)await page.locator('#hand .card').nth(i).click();
   assert.equal(await page.locator('#solve.joker-hint').count(),1);
   await page.locator('#solve.joker-hint').click();
   assert.equal(await page.locator('#solved').innerText(),'1');
   assert.equal(await page.locator('#score').innerText(),indices.length===3?'130':'100');
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#solved').innerText(),'0');
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});


  // Phase 15: seven-round auctions, bluffing, risk banking and territory placement.
  for(const game of ['auction','bluff','borderline','contagion'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-status').innerText(),/通常ルール/);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'0');
   assert.equal(await page.locator('.joker-hint').count(),0);
  });
  await run('auction',async page=>{
   const msg=await page.locator('.ft-joker-ability').innerText();
   assert.match(msg,/次の出品札/);
   const expected=msg.split('：').at(-1).trim();
   await page.locator('#submit').click();
   await page.locator('#next').click();
   assert.equal(await page.locator('#card').innerText(),expected,'auction J22 must predict the next lot');
   assert.equal(await page.locator('#round').innerText(),'2 / 7');
  },{date:'2026-12-02',id:'J22'});
  await run('auction',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),51);
   await page.locator('#submit').click();await page.locator('#next').click();
   assert.equal(await sum(),50);
  },{date:'2026-12-02',id:'J24'});
  await run('auction',async page=>{
   const m=(await page.locator('.ft-joker-ability').innerText()).match(/推奨手：(\d+)コイン/);
   assert.ok(m,'J26 should offer an estimated budget');
   assert.equal(await page.locator('#jokerBid').isVisible(),true);
   await page.locator('#jokerBid.joker-hint').click();
   assert.equal(await page.locator('#bidValue').innerText(),m[1]);
   assert.equal(await page.locator('#bid').inputValue(),m[1]);
   await page.locator('#submit').click();
   assert.equal(await page.locator('#round').innerText(),'1 / 7');
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#round').innerText(),'1 / 7');
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('.joker-hint').count(),0);
   assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('fifty-two-mode-auction'),JSON.parse(localStorage.getItem('fifty-two-auction-v1')).jokerMode]),['normal','normal']);
  },{date:'2026-11-12',id:'J26'});
  await run('auction',async page=>{
   for(let r=1;r<=7;r++){
    assert.equal(await page.locator('#round').innerText(),r+' / 7');
    await page.locator('#submit').click();
    if(r<7)await page.locator('#next').click();
   }
   const won=(await page.locator('#message').innerText()).includes('あなたの勝利！');
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),won?'1':'0');
   await page.reload();
   assert.equal(await page.locator('#jokerWins').innerText(),won?'1':'0');
  },{date:'2026-11-12',id:'J26'});
  await run('bluff',async page=>{
   const msg=await page.locator('.ft-joker-ability').innerText();
   assert.match(msg,/CPU手札の末尾の1枚/);
   assert.match(msg,/：[A2-9JQK]|：10/);
   assert.equal(await page.locator('#hand .card').count(),7);
  },{date:'2026-12-02',id:'J22'});
  await run('bluff',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),7);
   await page.locator('#hand .card').first().click();await page.locator('#call').click();
   assert.equal(await sum(),6);
  },{date:'2026-12-02',id:'J24'});
  await run('bluff',async page=>{
   assert.equal(await page.locator('#hand .card.joker-hint').count(),1);
   await page.locator('#hand .card.joker-hint').click();
   assert.equal(await page.locator('#call.joker-hint,#fold.joker-hint').count(),1);
   await page.locator('#call.joker-hint,#fold.joker-hint').click();
   assert.equal(await page.locator('#hand .card').count(),6);
   assert.equal(await page.locator('#log li').count(),1);
   await page.locator('#next').click();
   assert.equal(await page.locator('#round').innerText(),'2 / 7');
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#hand .card').count(),7);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('borderline',async page=>{
   const msg=await page.locator('.ft-joker-ability').innerText();
   assert.match(msg,/次の山札/);
   const predicted=msg.split('：').at(-1).trim();
   await page.locator('#higher').click();
   assert.equal(await page.locator('#card').innerText(),predicted);
  },{date:'2026-12-02',id:'J22'});
  await run('borderline',async page=>{
   const sum=async()=>[...(await page.locator('.ft-joker-ability').innerText()).matchAll(/([♠♥♦♣]) (\d+)枚/g)].reduce((n,m)=>n+Number(m[2]),0);
   assert.equal(await sum(),51);
   await page.locator('#lower').click();
   assert.equal(await sum(),50);
  },{date:'2026-12-02',id:'J24'});
  await run('borderline',async page=>{
   assert.equal(await page.locator('#higher.joker-hint,#lower.joker-hint').count(),1);
   await page.locator('#higher.joker-hint,#lower.joker-hint').click();
   assert.equal(await page.locator('#remain').innerText(),'残り 50 枚');
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#remain').innerText(),'残り 51 枚');
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('borderline',async page=>{
   for(let i=0;i<51&&await page.locator('#higher').isEnabled();i++){
    if(await page.locator('#cash').isEnabled())await page.locator('#cash').click();
    await page.locator('#higher').click();
   }
   assert.equal(await page.locator('#higher').isDisabled(),true);
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),'1');
   const best=await page.locator('#jokerBest').innerText();
   await page.reload();
   assert.equal(await page.locator('#jokerBest').innerText(),best);
   assert.equal(await page.locator('#jokerWins').innerText(),'1');
  },{date:'2026-11-12',id:'J26'});
  await run('contagion',async page=>{
   const ability=await page.locator('.ft-joker-ability').innerText();
   assert.match(ability,/推奨手：.* → マス\d+/);
   assert.equal(await page.locator('#hand .card.joker-hint').count(),1);
   assert.equal(await page.locator('#board .cell.joker-hint').count(),1);
   await page.locator('#hand .card.joker-hint').click();
   const target=page.locator('#board .cell.joker-hint');
   assert.equal(await target.isEnabled(),true);
   await target.click();
   assert.equal(await page.locator('#turn').innerText(),'2 / 9');
   assert.equal(await page.locator('#board .cell:not(.empty)').count(),2);
   page.once('dialog',d=>d.accept());await page.locator('.ft-joker-mode button').first().click();
   assert.equal(await page.locator('#turn').innerText(),'0 / 9');
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-11-12',id:'J26'});
  await run('contagion',async page=>{
   for(let i=0;i<5;i++){
    await page.locator('#hand .card').first().click();
    await page.locator('#board .cell.empty').first().click();
   }
   assert.equal(await page.locator('#turn').innerText(),'9 / 9');
   const won=(await page.locator('#message').innerText()).includes('あなたの勝利！');
   assert.equal(await page.locator('#wins').innerText(),'0');
   assert.equal(await page.locator('#jokerWins').innerText(),won?'1':'0');
   await page.reload();
   assert.equal(await page.locator('#jokerWins').innerText(),won?'1':'0');
  },{date:'2026-11-12',id:'J26'});
  for(const game of ['contagion'])await run(game,async page=>{
   assert.match(await page.locator('.ft-joker-ability').innerText(),/終了時の得点補正/);
   assert.equal(await page.locator('.joker-hint').count(),0);
  },{date:'2026-12-02',id:'J22'});

  // Phase 16: verify the four standalone games on a touch-sized viewport.
  async function phase16(game,id,exercise){
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   try{
    await page.addInitScript(({game,id})=>{
     localStorage.setItem('fifty-two-mode-'+game,'joker');
     localStorage.setItem('fifty-two-joker-equip-2026-12-02',id);
     const RealDate=Date;window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:['2026-12-02T12:00:00']))}static now(){return new RealDate('2026-12-02T12:00:00').getTime()}};
    },{game,id});
    await page.goto(base+'/'+game+'.html');
    await exercise(page);
    assert.deepEqual(errors,[],game+' page errors');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=35,game+' mobile overflow');
    results.push(game+'/'+id+' PASS');
   }finally{await page.close()}
  }
  await phase16('judgment','J22',async p=>{
   assert.match(await p.locator('.ft-joker-ability').innerText(),/次の札/);
   const predicted=(await p.locator('.ft-joker-ability').innerText()).split('：').at(-1).trim();
   await p.locator('#hit').click();
   assert.equal((await p.locator('#myCards .card').last().innerText()),predicted);
   assert.equal(await p.locator('.ft-joker-mode').count(),1);
  });
  await phase16('informant','J24',async p=>{
   assert.match(await p.locator('.ft-joker-ability').innerText(),/残り山札/);
   await p.locator('[data-q="high"]').click();
   assert.equal(await p.locator('#answers li').count(),1);
   assert.equal(await p.locator('.ft-joker-mode').count(),1);
  });
  await phase16('indian-poker','J26',async p=>{
   assert.match(await p.locator('.ft-joker-ability').innerText(),/相手の公開札/);
   assert.equal(await p.locator('#myCard').innerText(),'?');
   await p.locator('#fold').click();
   assert.equal(await p.locator('#next').isEnabled(),true);
  });
  await phase16('overdrive','J22',async p=>{
   assert.match(await p.locator('#jokerInfo').innerText(),/次の札/);
   const predicted=(await p.locator('#jokerInfo').innerText()).split('次の札：').at(-1).trim();
   await p.locator('#draw').click();
   assert.equal(await p.locator('#myCards .card').last().innerText(),predicted);
  });
  console.log(results.join('\n'));console.log('JOKER layout mobile checks PASS '+results.length);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
