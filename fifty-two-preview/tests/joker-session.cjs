'use strict';
// A saved game must keep its starting effect across equipment changes and reloads.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');fs.createReadStream(file).pipe(res)});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true}),base='http://127.0.0.1:'+server.address().port;let checks=0;
 try{for(const initial of ['J22',null]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(initial=>{if(sessionStorage.getItem('joker-session-fixture'))return;sessionStorage.setItem('joker-session-fixture','1');localStorage.setItem('fifty-two-joker-collection-v2',JSON.stringify(['J22','J24']));if(initial)localStorage.setItem('fifty-two-joker-equipped-v2',initial);localStorage.setItem('fifty-two-mode-echo','joker')},initial);
  await page.goto(base+'/echo.html');
  await page.locator('#hand .card').first().click();const score=await page.locator('#score').innerText();assert.ok(Number(score)>0);
  const replacement=initial?'J24':'J22';assert.equal(await page.evaluate(id=>FiftyTwoJokers.equipAsync(id),replacement),true);
  await page.reload();assert.equal(await page.locator('#score').innerText(),score,'actual saved board resumes');
  const status=await page.locator('.ft-joker-status').innerText();
  if(initial){assert.match(status,/透視・予兆/);assert.match(await page.locator('.ft-joker-ability').innerText(),/次の山札/)}else{assert.match(status,/未装備/);assert.equal(await page.locator('.ft-joker-ability').innerText(),'')}
  checks++;
  page.once('dialog',d=>d.accept());await page.locator('#restart').click();
  assert.equal(await page.locator('#score').innerText(),'0');assert.match(await page.locator('.ft-joker-status').innerText(),initial?/透視・遠眼/:/透視・予兆/);checks++;
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Saved-session equipment browser checks PASS '+checks);
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
