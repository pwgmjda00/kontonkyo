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
  await run('countdown',async p=>{
   assert.equal(await p.locator('#number').innerText(),'50');
   for(let i=0;i<10;i++){await p.locator('.offer .choice').first().click();if(i===0){assert.equal(await p.locator('#undo').isEnabled(),true);const v=await p.locator('#number').innerText();await p.locator('#undo').click();assert.equal(await p.locator('#number').innerText(),'50');await p.locator('.offer .choice').first().click();assert.equal(await p.locator('#number').innerText(),v)}}
   assert.equal(await p.locator('.offer').count(),0);assert.match(await p.locator('#message').innerText(),/全10手終了/);
   await p.locator('#restart').click();assert.equal(await p.locator('#number').innerText(),'50')
  });
  await run('fault-line',async p=>{
   assert.equal(await p.locator('#left').innerText(),'52');
   await p.locator('.lane').first().click();assert.equal(await p.locator('#left').innerText(),'51');
   await p.locator('#undo').click();assert.equal(await p.locator('#left').innerText(),'52');
   for(let i=0;i<52;i++)await p.locator('.lane').first().click();
   assert.equal(await p.locator('#left').innerText(),'0');assert.equal(await p.locator('.lane:enabled').count(),0);
   await p.locator('#restart').click();assert.equal(await p.locator('#left').innerText(),'52')
  });
  await run('suit-code',async p=>{
   await p.locator('#submit').click();assert.match(await p.locator('#message').innerText(),/4つのマーク/);
   for(let i=0;i<4;i++)await p.locator('.symbol:enabled').first().click();
   assert.equal(await p.locator('.slot.filled').count(),4);
   await p.locator('#clear').click();assert.equal(await p.locator('.slot.filled').count(),0);
   for(let i=0;i<4;i++)await p.locator('.symbol:enabled').first().click();
   await p.locator('#submit').click();
   assert.equal(await p.locator('#history .entry').count(),1);
   assert.equal(await p.locator('#left').innerText(),await p.locator('#submit').isEnabled()?'7':'7'); 
  });
 }finally{await browser.close();server.close()}
 console.log(tests.join('\n'));if(errors.length){console.error(errors.join('\n'));process.exitCode=1}else console.log('Gameplay smoke PASS '+tests.length+' games');
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
