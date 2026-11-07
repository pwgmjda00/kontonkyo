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

  console.log(results.join('\n'));console.log('JOKER layout mobile checks PASS '+results.length);
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
