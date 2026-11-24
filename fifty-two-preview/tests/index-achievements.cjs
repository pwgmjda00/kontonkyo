'use strict';
// Real hub transitions at each game's terminal boundary, plus legacy-save replay.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),ids=['tombstone','accomplice','thirteenth-hour','four-kingdoms','oblivion'];
const suits=['♠','♥','♦','♣'];
const card=(si,r)=>({si,r,s:suits[si],id:si*13+r});
const deck=()=>suits.flatMap((_,si)=>Array.from({length:13},(_,i)=>card(si,i+1)));
function fixture(i,win){
 const g={i,mode:'fast',turn:1,score:0,msg:'fixture',done:false};
 if(i===0){
  g.cols=[[],[],[],[]];g.waste=[card(0,13)];g.found=[Array.from({length:7},(_,i)=>card(0,i+6)),Array.from({length:8},(_,i)=>card(1,i+6)),[],[]];g.stock=deck().filter(c=>c.r>=6&&c.si>=2);g.selected={type:'waste'};g.passes=0;g.powers=[0,0,0,0];g.hold=null;
  if(!win){g.done=true;g.found[1].pop();g.stock.push(card(1,13))}
 }
 if(i===1){const all=deck();g.hands=win?[[all[0]],all.slice(1)]:[all.slice(1),[all[0]]];g.stock=[];g.discards=[[],[]];g.melds=[[],[]];g.points=[0,0];g.player=0;g.selected=[];g.using=null;g.phase='draw';g.passes=0}
 if(i===2){g.slots=Array(9).fill(null);g.slots[0]=card(0,13);g.stock=[];g.selected=[];g.removed=25;g.pivot=0;if(!win){g.slots[1]=card(0,1);g.slots[2]=card(1,1);g.removed=23}}
 if(i===3){g.hands=[[],[]];g.stock=[];g.realms=suits.map((_,si)=>Array.from({length:9},(_,i)=>({c:card(si,i+5),owner:win?0:1})));g.player=0;g.actions=0;g.round=7;g.selected=null}
 if(i===4){g.cards=Array(16).fill(null);g.cards[0]=card(0,1);g.cards[1]=win?card(1,1):card(1,2);g.open=[];g.known=[];g.fail=win?0:4;g.streak=0;g.peek=false;g.peekUntil=0;g.exchanges=0}
 return g;
}
function terminal(i,win){
 const g=fixture(i,win);g.done=true;g.msg='Archived result without victory text';
 if(i===0&&win){g.found[0].push(g.waste.pop());g.selected=null}
 if(i===1)g.points=win?[1,0]:[0,1];
 if(i===2&&win){g.slots.fill(null);g.removed=26}
 if(i===3)g.round=8;
 if(i===4&&win)g.cards.fill(null);
 return g;
}
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');fs.createReadStream(file).pipe(res)});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
 const base='http://127.0.0.1:'+server.address().port;let count=0;
 async function run(i,mode,win,{legacy=false,direct=false}={}){
  const context=await browser.newContext({viewport:{width:320,height:700},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   const id=ids[i],state=legacy?terminal(i,win):fixture(i,win),suffix=mode==='joker'?'-joker':'';
   await context.addInitScript(({id,state,mode,suffix,legacy})=>{
    if(sessionStorage.getItem('seeded'))return;sessionStorage.setItem('seeded','1');
    localStorage.setItem('fifty-two-mode-'+id,mode);
    localStorage.setItem(legacy?'fifty-two-save'+suffix:'fifty-two-save-'+id+suffix,JSON.stringify(state));
    localStorage.setItem('fifty-two-last-save',JSON.stringify({i:state.i,mode}));
   },{id,state,mode,suffix,legacy});
   await page.goto(base+(direct?'/jokers.html':'/index.html'));await page.waitForFunction(()=>!!window.FiftyTwoAchievements);await page.evaluate(()=>window.FiftyTwoAchievements.settled());
   if(!legacy&&!state.done){
    await page.locator('#resume').click();
    if(i===0)await page.locator('#area > .board').first().locator('button').nth(0).click();
    if(i===1)await page.getByRole('button',{name:'山札から引く',exact:true}).click();
    if(i===2){await page.locator('#area .clock button').nth(0).click();await page.getByRole('button',{name:'選択したKを消去',exact:true}).click()}
    if(i===3)await page.getByRole('button',{name:'ターン終了',exact:true}).click();
    if(i===4){await page.locator('#area .memory button').nth(0).click();await page.locator('#area .memory button').nth(1).click()}
   }
   const evidence=()=>page.evaluate(id=>({has:window.FiftyTwoAchievements.hasWin(id),owned:window.FiftyTwoJokers.owned().length}),id);
   if(win)await page.waitForFunction(id=>window.FiftyTwoAchievements.hasWin(id)&&window.FiftyTwoJokers.owned().length===1,id);
   const result=await evidence();assert.equal(result.has,win,id+' '+mode+' '+legacy);assert.equal(result.owned,win?1:0);
   const counts=await page.evaluate(id=>['normal','joker'].map(mode=>Number(localStorage.getItem('fifty-two-'+id+(mode==='joker'?'-joker':'')+'-wins')||0)),id);
   assert.deepEqual(counts,!direct&&win?(mode==='joker'?[0,1]:[1,0]):[0,0]);
   await page.reload();await page.evaluate(()=>window.FiftyTwoAchievements.settled());assert.deepEqual(await evidence(),result,'reload must not award twice');assert.deepEqual(errors,[]);count++;
  }finally{await context.close()}
 }
 try{
  for(let i=0;i<5;i++)for(const mode of ['normal','joker'])for(const win of [true,false]){await run(i,mode,win);await run(i,mode,win,{legacy:true});await run(i,mode,win,{legacy:true,direct:true})}
  // A forged done flag on an otherwise-valid opening deal is no historical victory.
  for(const i of [1,3]){
   const context=await browser.newContext(),page=await context.newPage(),state=fixture(i,true),all=deck().filter(c=>i===1||c.r>=5);
   state.done=true;state.msg='勝利';state.hands=[all.splice(0,5),all.splice(0,5)];state.stock=all;
   if(i===3){state.realms=[[],[],[],[]];state.round=0}
   await context.addInitScript(({id,state})=>localStorage.setItem('fifty-two-save-'+id,JSON.stringify(state)),{id:ids[i],state});
   await page.goto(base+'/jokers.html');await page.evaluate(()=>window.FiftyTwoAchievements.settled());
   assert.equal(await page.evaluate(id=>window.FiftyTwoAchievements.hasWin(id),ids[i]),false);
   assert.equal(await page.evaluate(()=>window.FiftyTwoJokers.owned().length),0);await context.close();count++;
  }
  // J26 calls the real imported rule helpers in all five games, including open[] in Oblivion.
  for(let i=0;i<5;i++){
   const context=await browser.newContext({viewport:{width:320,height:700},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await context.addInitScript(id=>{localStorage.setItem('fifty-two-joker-collection-v2','["J26"]');localStorage.setItem('fifty-two-joker-equipped-v2','J26');localStorage.setItem('fifty-two-mode-'+id,'joker')},ids[i]);
   await page.goto(base+'/index.html');if(i===4)await page.clock.install();await page.locator('#games button').nth(i).click();
   assert.match(await page.locator('.ft-joker-ability').innerText(),/💡/);
   if(i===4){await page.clock.fastForward(30100);await page.locator('#area .memory button').first().click();assert.match(await page.locator('.ft-joker-ability').innerText(),/に合う札を探そう/)}
   assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<36);await context.close();count++;
  }
  // A displaced invasion card belongs to the save even though it leaves the board.
  {
   const context=await browser.newContext(),page=await context.newPage();
   const state={...fixture(3,true),round:0,hands:[[card(1,5)],[]],realms:[[{c:card(0,5),owner:1}],[],[],[]],captured:[]};
   state.stock=deck().filter(c=>c.r>=5&&c.id!==card(1,5).id&&c.id!==card(0,5).id);
   await context.addInitScript(state=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('fifty-two-save-four-kingdoms',JSON.stringify(state));localStorage.setItem('fifty-two-last-save',JSON.stringify({i:3,mode:'normal'}))}},state);
   await page.goto(base+'/index.html');await page.locator('#resume').click();
   await page.locator('#area .hand').last().locator('button').first().click();await page.getByRole('button',{name:'♠へ配置',exact:true}).click();
   let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fifty-two-save-four-kingdoms')));
   assert.deepEqual(saved.captured,[card(0,5)]);await page.reload();assert.equal(await page.locator('#resume').isVisible(),true);
   // Old saves did not retain the displaced card: they must remain resumable.
   await page.evaluate(()=>{const key='fifty-two-save-four-kingdoms',s=JSON.parse(localStorage.getItem(key));delete s.captured;localStorage.setItem(key,JSON.stringify(s))});
   await page.reload();assert.equal(await page.locator('#resume').isVisible(),true);
   assert.equal(await page.evaluate(()=>window.FiftyTwoAchievements.hasWin('four-kingdoms')),false);
   // New saves must still reject duplicate cards rather than weakening validation.
   await page.evaluate(()=>{const key='fifty-two-save-four-kingdoms',s=JSON.parse(localStorage.getItem(key));s.captured=[s.realms[0][0].c];localStorage.setItem(key,JSON.stringify(s))});
   await page.reload();assert.equal(await page.locator('#resume').isVisible(),false);
   await context.close();count++;
  }
  // Changing global equipment must not change the ability of a saved hub round.
  {
   const context=await browser.newContext(),page=await context.newPage();
   await context.addInitScript(()=>{if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('fifty-two-joker-collection-v2','["J22","J24"]');localStorage.setItem('fifty-two-joker-equipped-v2','J22');localStorage.setItem('fifty-two-mode-tombstone','joker')}});
   await page.goto(base+'/index.html');await page.locator('#games button').first().click();
   assert.match(await page.locator('.ft-joker-ability').innerText(),/次の山札/);
   await page.locator('#area > .top button').first().click();
   await page.evaluate(()=>window.FiftyTwoJokers.equip('J24'));
   assert.match(await page.locator('.ft-joker-ability').innerText(),/次の山札/);
   await page.reload();await page.locator('#resume').click();
   assert.match(await page.locator('.ft-joker-ability').innerText(),/次の山札/);
   page.once('dialog',d=>d.accept());await page.locator('#new').click();
   assert.match(await page.locator('.ft-joker-ability').innerText(),/山札残り/);
   await context.close();count++;
  }
  console.log('PASS '+count+' hub achievement, migration, mode isolation and J26 browser cases');
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
