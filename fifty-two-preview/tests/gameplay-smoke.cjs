'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');fs.createReadStream(file).pipe(res)
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true}),base='http://127.0.0.1:'+server.address().port;
 const errors=[],tests=[];
 async function run(name,fn){const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const crashes=[];page.on('pageerror',e=>crashes.push(e.message));try{await page.goto(base+'/'+name+'.html',{waitUntil:'load'});await fn(page);assert.deepEqual(crashes,[]);tests.push(name+' PASS')}catch(e){errors.push(name+': '+e.stack)}finally{await page.close()}}
 try{
  // Solitaires: hint feedback, initial undo state and live card rendering.
  for(const game of ['accordion','gaps','cruel','simple-simon','beleaguered-castle','forty-thieves'])await run(game,async p=>{
   assert.equal(await p.locator('#hint').isEnabled(),true);
   assert.equal(await p.locator('#undo').isDisabled(),true);
   await p.locator('#hint').click();
   assert.match(await p.locator('#message').innerText(),/./);
   assert.ok(await p.locator('#board button').count()>0);
  });
  await run('gaps',async p=>{
   assert.match(await p.locator('#redeals').innerText(),/2/);
   await p.locator('#redeal').click();
   assert.equal(await p.locator('#undo').isEnabled(),true);
   await p.keyboard.press('u');
   assert.equal(await p.locator('#undo').isDisabled(),true);
  });
  await run('cruel',async p=>{
   await p.locator('#redeal').click();
   assert.equal(await p.locator('#undo').isEnabled(),true);
   await p.keyboard.press('Control+z');
   assert.equal(await p.locator('#undo').isDisabled(),true);
  });
  await run('forty-thieves',async p=>{
   const before=await p.locator('#stockcount').innerText();
   await p.locator('#stock').click();
   assert.notEqual(await p.locator('#stockcount').innerText(),before);
   assert.equal(await p.locator('#undo').isEnabled(),true);
   await p.locator('#undo').click();
   assert.equal(await p.locator('#stockcount').innerText(),before);
  });
  await run('kings-road',async p=>{
   assert.equal(await p.locator('#steps').innerText(),'0');
   assert.ok(await p.locator('#board .cell:enabled').count()>0);
   await p.locator('#board .cell:enabled').first().click();
   assert.equal(await p.locator('#steps').innerText(),'1');
   await p.keyboard.press('u');
   assert.equal(await p.locator('#steps').innerText(),'0');
  });
  await run('royal-slide',async p=>{
   assert.equal(await p.locator('#moves').innerText(),'0');
   assert.ok(await p.locator('#board .tile:enabled').count()>0);
   await p.locator('#board .tile:enabled').first().click();
   assert.equal(await p.locator('#moves').innerText(),'1');
   await p.locator('#undo').click();
   assert.equal(await p.locator('#moves').innerText(),'0');
  });
  await run('crossfire',async p=>{
   assert.equal(await p.locator('#placed').innerText(),'0 / 16');
   await p.locator('#board button:enabled').first().click();
   assert.equal(await p.locator('#placed').innerText(),'1 / 16');
   await p.keyboard.press('Control+z');
   assert.equal(await p.locator('#placed').innerText(),'0 / 16');
  });
  await run('balance',async p=>{
   assert.equal(await p.locator('#turn').innerText(),'0 / 10');
   await p.locator('#putLeft').click();
   assert.equal(await p.locator('#turn').innerText(),'1 / 10');
   await p.reload();
   assert.equal(await p.locator('#turn').innerText(),'1 / 10');
  });
  await run('lighthouse',async p=>{
   assert.equal(await p.locator('#placed').innerText(),'0');
   await p.locator('#hand button').first().click();
   assert.equal(await p.locator('#hand button[aria-pressed="true"]').count(),1);
   await p.locator('#towers button:enabled').first().click();
   assert.equal(await p.locator('#placed').innerText(),'1');
   await p.reload();
   assert.equal(await p.locator('#placed').innerText(),'1');
  });
  await run('alchemy',async p=>{
   assert.equal(await p.locator('#turns').innerText(),'12');
   await p.locator('#market button:enabled').first().click();
   assert.equal(await p.locator('#turns').innerText(),'11');
   await p.reload();
   assert.equal(await p.locator('#turns').innerText(),'11');
  });
  await run('coronation',async p=>{
   assert.equal(await p.locator('#hand button:enabled').count(),7);
   await p.locator('#hand button:enabled').first().click();
   assert.equal(await p.locator('#hand button').count(),6);
   assert.equal(await p.locator('#next').isEnabled(),true);
   await p.locator('#next').click();
   assert.equal(await p.locator('#round').innerText(),'2 / 7');
  });
  await run('paradox',async p=>{
   const before=await p.locator('#law').innerText();
   await p.locator('#flip').click();
   assert.notEqual(await p.locator('#law').innerText(),before);
   await p.locator('#hand button:enabled').first().click();
   assert.equal(await p.locator('#next').isEnabled(),true);
   await p.locator('#next').click();
   assert.equal(await p.locator('#round').innerText(),'2 / 7');
  });
  await run('judgment',async p=>{
   assert.equal(await p.locator('#stand').isEnabled(),true);
   await p.locator('#stand').click();
   assert.equal(await p.locator('#stand').isDisabled(),true);
   assert.equal(await p.locator('#next').isEnabled(),true);
   await p.locator('#next').click();
   assert.equal(await p.locator('#stand').isEnabled(),true);
  });
  await run('reverse-auction',async p=>{
   assert.equal(await p.locator('#hand button:enabled').count(),13);
   await p.locator('#hand button:enabled').first().click();
   assert.equal(await p.locator('#hand button:enabled').count(),0);
   assert.equal(await p.locator('#next').isVisible(),true);
   await p.locator('#next').click();
   assert.equal(await p.locator('#round').innerText(),'2 / 13');
  });
  for(const game of ['freecell','klondike','spider','yukon','scorpion','eight-off','penguin','canfield'])await run(game,async p=>{assert.equal(await p.locator('#hint').isEnabled(),true);await p.locator('#hint').click();assert.match(await p.locator('#message').innerText(),/./);assert.equal(await p.locator('#undo').isDisabled(),true);assert.equal(await p.locator('#ft-game-ux').count(),1);assert.ok(await p.locator('button.card').count()>0)});
  for(const game of ['osmosis','la-belle-lucie','nestor','bakers-dozen','flower-garden'])await run(game,async p=>{assert.equal(await p.locator('#hint').isEnabled(),true);await p.locator('#hint').click();assert.match(await p.locator('#message').innerText(),/./);assert.equal(await p.locator('#undo').isDisabled(),true);assert.equal(await p.locator('#ft-game-ux').count(),1)});
  await run('clock',async p=>{assert.equal(await p.locator('#step').isEnabled(),true);await p.locator('#step').click();assert.match(await p.locator('#message').innerText(),/./);await p.locator('#auto').click();assert.equal(await p.locator('#step').isDisabled(),true)});
  await run('poker-squares',async p=>{assert.equal(await p.locator('#undo').isDisabled(),true);const cells=p.locator('#board button:enabled');assert.ok(await cells.count()>0);await cells.first().click();assert.equal(await p.locator('#undo').isEnabled(),true);await p.keyboard.press('u');assert.equal(await p.locator('#undo').isDisabled(),true)});
  await run('calculation',async p=>{assert.equal(await p.locator('#undo').isDisabled(),true);await p.locator('#draw').click();assert.equal(await p.locator('#undo').isEnabled(),true);await p.keyboard.press('Control+z');assert.equal(await p.locator('#undo').isDisabled(),true)});
  for(const game of ['elevens','fourteen-out','black-hole','monte-carlo','tripeaks'])await run(game,async p=>{assert.equal(await p.locator('#hint').isEnabled(),true);await p.locator('#hint').click();assert.match(await p.locator('#message').innerText(),/./);assert.equal(await p.locator('#undo').isDisabled(),true);assert.equal(await p.locator('#ft-game-ux').count(),1);await p.keyboard.press('?');assert.equal(await p.locator('main details').first().getAttribute('open'),'');await p.keyboard.press('?');});
  await run('aces-up',async p=>{assert.equal(await p.locator('#deal').isEnabled(),true);assert.equal(await p.locator('#undo').isDisabled(),true);await p.locator('#deal').click();assert.equal(await p.locator('#undo').isEnabled(),true);await p.keyboard.press('u');assert.equal(await p.locator('#undo').isDisabled(),true)});
  await run('blackjack',async p=>{assert.equal(await p.locator('#hit').isEnabled(),true);await p.locator('#stand').click();assert.equal(await p.locator('#hit').isDisabled(),true);assert.match(await p.locator('#message').innerText(),/./);});
  await run('high-low',async p=>{assert.equal(await p.locator('#high').isEnabled(),true);await p.locator('#high').click();assert.match(await p.locator('#message').innerText(),/./);assert.equal(await p.locator('#round').count(),1)});
  await run('war',async p=>{assert.ok(await p.locator('#hand button:enabled').count()>0);await p.locator('#hand button:enabled').first().click();assert.equal(await p.locator('#next').isEnabled(),true);await p.locator('#next').click();assert.ok(await p.locator('#hand button:enabled').count()>0)});
  await run('pyramid',async p=>{assert.equal(await p.locator('#hint').isEnabled(),true);await p.locator('#hint').click();assert.match(await p.locator('#message').innerText(),/💡/);await p.locator('#stock').click();assert.equal(await p.locator('#undo').isEnabled(),true);await p.keyboard.press('u');assert.equal(await p.locator('#undo').isDisabled(),true)});
  await run('golf',async p=>{await p.locator('#hint').click();assert.match(await p.locator('#message').innerText(),/💡/);await p.locator('#stock').click();assert.equal(await p.locator('#undo').isEnabled(),true);await p.keyboard.press('Control+z');assert.equal(await p.locator('#undo').isDisabled(),true)});
  await run('countdown',async p=>{
   assert.equal(await p.locator('#number').innerText(),'50');
   assert.equal(await p.locator('#ft-game-ux').count(),1);await p.keyboard.press('?');assert.equal(await p.locator('main details').first().getAttribute('open'),'');await p.keyboard.press('?');
   assert.match(await p.locator('.offer .choice').first().innerText(),/→/);assert.ok((await p.locator('.offer .choice').first().getAttribute('aria-label')).includes('結果'));
   for(let i=0;i<10;i++){await p.locator('.offer .choice').first().click();if(i===0){assert.equal(await p.locator('#undo').isEnabled(),true);const v=await p.locator('#number').innerText();await p.keyboard.press('Control+z');assert.equal(await p.locator('#number').innerText(),'50');await p.locator('.offer .choice').first().click();assert.equal(await p.locator('#number').innerText(),v)}}
   assert.equal(await p.locator('.offer').count(),0);assert.match(await p.locator('#message').innerText(),/全10手終了/);
   await p.locator('#restart').click();assert.equal(await p.locator('#number').innerText(),'50')
  });
  await run('fault-line',async p=>{
   assert.equal(await p.locator('#left').innerText(),'52');
   assert.match(await p.locator('.lane .forecast').first().innerText(),/置くと|完成|崩壊/);await p.locator('.lane').first().click();assert.equal(await p.locator('#left').innerText(),'51');
   await p.locator('#undo').click();assert.equal(await p.locator('#left').innerText(),'52');
   for(let i=0;i<52;i++)await p.locator('.lane').first().click();
   assert.equal(await p.locator('#left').innerText(),'0');assert.equal(await p.locator('.lane:enabled').count(),0);
   await p.locator('#restart').click();assert.equal(await p.locator('#left').innerText(),'52')
  });
  await run('seven-seals',async p=>{assert.equal(await p.locator('.handcard').count(),21);await p.locator('.handcard').first().click();assert.equal(await p.locator('.handcard[aria-pressed="true"]').count(),1);assert.equal(await p.locator('.seal .forecast').count(),7);await p.locator('.handcard').first().click();assert.equal(await p.locator('.handcard[aria-pressed="true"]').count(),0);await p.locator('.handcard').first().click();await p.locator('.seal').first().click();assert.equal(await p.locator('.handcard').count(),20);await p.locator('#undo').click();assert.equal(await p.locator('.handcard').count(),21)});
  await run('suit-code',async p=>{
   await p.locator('#submit').click();assert.match(await p.locator('#message').innerText(),/4つのマーク/);
   assert.equal(await p.locator('.slot').first().isDisabled(),true);
   for(let i=0;i<4;i++)await p.locator('.symbol:enabled').first().click();
   assert.equal(await p.locator('.slot.filled').count(),4);
   await p.locator('#clear').click();assert.equal(await p.locator('.slot.filled').count(),0);
   for(let i=0;i<4;i++)await p.locator('.symbol:enabled').first().click();
   await p.locator('#submit').click();
   assert.equal(await p.locator('#history .entry').count(),1);
   assert.ok(['7','8'].includes(await p.locator('#left').innerText())); 
  });
 }finally{await browser.close();server.close()}
 console.log(tests.join('\n'));if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log('Gameplay smoke PASS '+tests.length+' games');
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
