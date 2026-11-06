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
 async function run(name,fn,label=name){const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const crashes=[];page.on('pageerror',e=>crashes.push(e.message));try{await page.goto(base+'/'+name+'.html',{waitUntil:'load'});await fn(page);assert.deepEqual(crashes,[]);tests.push(label+' PASS')}catch(e){errors.push(label+': '+e.stack)}finally{await page.close()}}
 try{
  // Five embedded games hosted in index.html, separate from standalone HTML titles.
  await run('index',async p=>{
   assert.equal(await p.locator('#games button').count(),5);
   await p.locator('#games button').nth(0).click();
   assert.match(await p.locator('#title').innerText(),/墓標/);
   const stock=p.locator('#area > .top button').first();
   const before=await stock.innerText();
   assert.equal(await p.locator('#undo').isDisabled(),true);
   await stock.click();
   assert.notEqual(await stock.innerText(),before);
   assert.equal(await p.locator('#undo').isEnabled(),true);
   await p.locator('#undo').click();
   assert.equal(await stock.innerText(),before);
  },'index/tombstone');
  await run('index',async p=>{
   await p.locator('#games button').nth(1).click();
   assert.match(await p.locator('#title').innerText(),/共犯/);
   const hand=p.locator('#area .hand button');
   const n=await hand.count();
   await p.locator('#area .board button').filter({hasText:'山札から引く'}).click();
   assert.equal(await hand.count(),n+1);
   await hand.first().click();
   await p.locator('#area .board button').filter({hasText:'選択した札を捨てる'}).click();
   assert.match(await p.locator('#log').innerText(),/CPUが行動した/);
  },'index/accomplice');
  await run('index',async p=>{
   await p.locator('#games button').nth(2).click();
   assert.match(await p.locator('#title').innerText(),/13時/);
   p.on('dialog',d=>d.accept());
   let move=null;
   for(let attempt=0;attempt<12&&!move;attempt++){
    const text=await p.locator('#area .clock button').allInnerTexts();
    const ranks=text.map(t=>{const m=t.trim().match(/^(A|J|Q|K|\d+)/);return m?({A:1,J:11,Q:12,K:13}[m[1]]||Number(m[1])):0});
    const outer=ranks.length-1;
    for(let i=0;i<ranks.length&&!move;i++){if(ranks[i]===13){move=[i];break}for(let j=i+1;j<ranks.length;j++)if(ranks[i]+ranks[j]===13&&(i===outer||j===outer||Math.abs(i-j)===1||Math.abs(i-j)===outer-1)){move=[i,j];break}}
    if(!move)await p.locator('#new').click();
   }
   assert.ok(move,'a legal move must be found within 12 deals');
   const before=await p.locator('#stats').innerText();
   await p.locator('#area .clock button').nth(move[0]).click();
   if(move.length===1)await p.locator('#area .board button').filter({hasText:'選択したKを消去'}).click();
   else await p.locator('#area .clock button').nth(move[1]).click();
   assert.notEqual(await p.locator('#stats').innerText(),before);
  },'index/thirteenth-hour');
  await run('index',async p=>{
   await p.locator('#games button').nth(3).click();
   assert.match(await p.locator('#title').innerText(),/四王国/);
   const hand=p.locator('#area .hand').last();
   const before=await hand.locator('button').count();
   const label=await hand.locator('button').first().innerText();
   const suit=['♠','♥','♦','♣'].findIndex(x=>label.includes(x));
   assert.ok(suit>=0);
   await hand.locator('button').first().click();
   await p.locator('#area .board button').nth(suit).click();
   assert.equal(await hand.locator('button').count(),before-1);
   assert.equal(await p.locator('#undo').isEnabled(),true);
   await p.locator('#undo').click();
   assert.equal(await hand.locator('button').count(),before);
  },'index/four-kingdoms');
  await run('index',async p=>{
   await p.clock.install();
   await p.locator('#games button').nth(4).click();
   assert.match(await p.locator('#title').innerText(),/忘却/);
   p.on('dialog',d=>d.accept());
   await p.locator('#fast').click();
   assert.match(await p.locator('#area').innerText(),/記憶時間/);
   await p.clock.fastForward(8100);
   assert.equal(await p.locator('#area .memory button.back').count(),16);
   await p.locator('#area .memory button').first().click();
   assert.equal(await p.locator('#area .memory button.selected').count(),1);
  },'index/oblivion');
  // Remaining standalone games: exercise a real state transition in every title.
  await run('auction',async p=>{
   assert.equal(await p.locator('#submit').isEnabled(),true);
   await p.locator('#submit').click();
   assert.equal(await p.locator('#next').isEnabled(),true);
   await p.locator('#next').click();
   assert.equal(await p.locator('#round').innerText(),'2 / 7');
  });
  await run('bluff',async p=>{
   await p.locator('#hand button:enabled').first().click();
   assert.equal(await p.locator('#hand button[aria-pressed="true"]').count(),1);
   await p.locator('#call').click();
   assert.equal(await p.locator('#hand button').count(),6);
   assert.equal(await p.locator('#next').isEnabled(),true);
  });
  await run('borderline',async p=>{
   const prev=await p.locator('#remain').innerText();
   await p.locator('#higher').click();
   assert.notEqual(await p.locator('#remain').innerText(),prev);
   assert.match(await p.locator('#message').innerText(),/./);
  });
  await run('contagion',async p=>{
   assert.equal(await p.locator('#turn').innerText(),'0 / 9');
   await p.locator('#hand button:enabled').first().click();
   await p.locator('#board button:enabled').first().click();
   assert.equal(await p.locator('#turn').innerText(),'2 / 9');
  });
  await run('deadline',async p=>{
   await p.locator('#draw').click();
   assert.ok(await p.locator('#cards .card').count()>0);
   await p.locator('#bank').click();
   assert.equal(await p.locator('#next').isVisible(),true);
   await p.locator('#next').click();
   assert.equal(await p.locator('#round').innerText(),'2 / 12');
  });
  await run('echo',async p=>{
   assert.ok(await p.locator('#hand button:enabled').count()>0);
   await p.locator('#hand button:enabled').first().click();
   assert.ok(await p.locator('#echo .card').count()>0);
   assert.match(await p.locator('#message').innerText(),/./);
  });
  await run('eclipse',async p=>{
   assert.equal(await p.locator('#left').innerText(),'8');
   await p.locator('#hand button:enabled').first().click();
   await p.locator('#board button:enabled').first().click();
   assert.equal(await p.locator('#left').innerText(),'7');
  });
  await run('ghost-hand',async p=>{
   await p.locator('#enemy button:enabled').first().click();
   assert.ok(await p.locator('#mine button:enabled').count()>0);
   await p.locator('#mine button:enabled').first().click();
   const a=Number(await p.locator('#ys').innerText()),b=Number(await p.locator('#cs').innerText());
   assert.equal(a+b,1);
  });
  await run('gin-rummy',async p=>{
   assert.match(await p.locator('#phaseBanner').innerText(),/①/);
   await p.locator('#stock').click();
   assert.match(await p.locator('#phaseBanner').innerText(),/②/);
  });
  await run('indian-poker',async p=>{
   assert.equal(await p.locator('#call').isEnabled(),true);
   await p.locator('#call').click();
   assert.equal(await p.locator('#next').isEnabled(),true);
   await p.locator('#next').click();
   assert.equal(await p.locator('#round').innerText(),'2 / 7');
  });
  await run('informant',async p=>{
   await p.locator('[data-q="red"]').click();
   assert.equal(await p.locator('#answers li').count(),1);
   assert.equal(await p.locator('[data-q="red"]').isDisabled(),true);
  });
  await run('last-word',async p=>{
   const before=await p.locator('#deckCount').innerText();
   await p.locator('#deck').click();
   assert.notEqual(await p.locator('#deckCount').innerText(),before);
  });
  await run('memory',async p=>{
   assert.equal(await p.locator('#board button').count(),52);
   await p.locator('#board button:enabled').first().click();
   assert.equal(await p.locator('#board .face').count(),1);
  });
  await run('old-maid',async p=>{
   assert.ok(await p.locator('#backs button:enabled').count()>0);
   await p.locator('#backs button:enabled').first().click();
   assert.match(await p.locator('#message').innerText(),/./);
  });
  await run('overdrive',async p=>{
   await p.locator('#hold').click();
   assert.equal(await p.locator('#next').isEnabled(),true);
   await p.locator('#next').click();
   assert.match(await p.locator('#message').innerText(),/./);
  });
  await run('paradox-switch',async p=>{
   assert.equal(await p.locator('#moves').innerText(),'0');
   await p.locator('#board button:enabled').first().click();
   assert.equal(await p.locator('#moves').innerText(),'1');
   await p.keyboard.press('u');
   assert.equal(await p.locator('#moves').innerText(),'0');
  });
  await run('redline',async p=>{
   await p.locator('#market button:enabled').first().click();
   assert.equal(await p.locator('#youCards .mini').count(),1);
   await p.locator('#stand').click();
   assert.equal(await p.locator('#next').isVisible(),true);
  });
  await run('seal',async p=>{
   await p.locator('#hand button:enabled').first().click();
   assert.equal(await p.locator('#clear').isEnabled(),true);
   await p.locator('#clear').click();
   assert.equal(await p.locator('#clear').isDisabled(),true);
  });
  await run('sevens',async p=>{
   assert.match(await p.locator('#passes').innerText(),/3/);
   await p.locator('#pass').click();
   assert.match(await p.locator('#passes').innerText(),/2/);
  });
  await run('shift',async p=>{
   assert.ok(await p.locator('#cards button:enabled').count()>1);
   await p.locator('#cards button:enabled').first().click();
   assert.equal(await p.locator('#cards button[aria-pressed="true"]').count(),1);
  });
  await run('suit-dominion',async p=>{
   assert.equal(await p.locator('#left').innerText(),'8');
   await p.locator('#hand button:enabled').first().click();
   await p.locator('#board button:enabled').first().click();
   assert.equal(await p.locator('#left').innerText(),'7');
  });
  await run('the-answer',async p=>{
   const before=await p.locator('#shifts').innerText();
   await p.locator('#shift').click();
   assert.notEqual(await p.locator('#shifts').innerText(),before);
   assert.equal(await p.locator('#undo').isEnabled(),true);
  });
  await run('trump-jack',async p=>{
   assert.ok(await p.locator('#hand button:enabled').count()>0);
   await p.locator('#hand button:enabled').first().click();
   assert.equal(await p.locator('#next').isVisible(),true);
   await p.locator('#next').click();
   assert.equal(await p.locator('#round').innerText(),'2 / 13');
  });
  await run('witness',async p=>{
   await p.locator('#hide').click();
   assert.equal(await p.locator('#review').isEnabled(),true);
   await p.locator('#review').click();
   assert.equal(await p.locator('#hide').isEnabled(),true);
  });
  await run('zero-sum',async p=>{
   await p.locator('#market button:enabled').first().click();
   assert.equal(await p.locator('#youHand .mini').count(),1);
   assert.match(await p.locator('#message').innerText(),/./);
  });
  // Solitaires: hint feedback, initial undo state and live card rendering.
  for(const game of ['accordion','gaps','cruel','simple-simon','beleaguered-castle','forty-thieves'])await run(game,async p=>{
   assert.equal(await p.locator('#hint').isEnabled(),true);
   assert.equal(await p.locator('#undo').isDisabled(),true);
   await p.locator('#hint').click();
   assert.match(await p.locator('#message').innerText(),/./);
   assert.ok(await p.locator(game==='beleaguered-castle'?'#left button':'#board button').count()>0);
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
