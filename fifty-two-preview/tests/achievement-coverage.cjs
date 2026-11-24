'use strict';
// The test server instruments original inline scripts only in memory. Fixtures enter
// the real game's final transition; no reward implementation is replaced or stubbed.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const fixtures={};
const add=(ids,win,lose)=>{for(const id of ids.split(' '))fixtures[id]={win,lose}};
const card='({r:13,si:0,up:true})';
const foundations='Array.from({length:4},(_,si)=>Array.from({length:13},(_,i)=>({r:i+1,si,up:true})))';
add('calculation canfield la-belle-lucie',`g.foundations=${foundations};check()`,`g.foundations=${foundations};g.foundations[0].pop();check()`);
add('forty-thieves',`g.foundations=Array.from({length:8},(_,si)=>Array.from({length:13},(_,i)=>({r:i+1,si:si%4,up:true})));check()`,`g.foundations[0]=[];check()`);
add('bakers-dozen beleaguered-castle cruel',`g.foundations=${foundations};g.foundations[0].pop();g.cols[0]=[${card}];move({t:'c',i:0},{t:'f',i:0})`,`g.foundations=${foundations};g.foundations[1].pop();g.foundations[0].pop();g.cols[0]=[${card}];move({t:'c',i:0},{t:'f',i:0})`);
add('eight-off penguin',`g.foundations=${foundations};g.foundations[0].pop();g.cols[0]=[${card}];move({t:'c',i:0,j:0},{t:'f',i:0})`,`g.foundations=${foundations};g.foundations[1].pop();g.foundations[0].pop();g.cols[0]=[${card}];move({t:'c',i:0,j:0},{t:'f',i:0})`);
add('freecell klondike yukon',`g.foundations=${foundations};g.foundations[0].pop();g.cols[0]=[${card}];move({t:'c',i:0,j:0},{t:'f',i:0})`,`g.foundations=${foundations};g.foundations[1].pop();g.foundations[0].pop();g.cols[0]=[${card}];move({t:'c',i:0,j:0},{t:'f',i:0})`);
add('flower-garden',`g.foundations=${foundations};g.foundations[0].pop();g.piles[0]=[${card}];move({t:'p',i:0},{t:'f',i:0})`,`g.foundations=${foundations};g.foundations[1].pop();g.foundations[0].pop();g.piles[0]=[${card}];move({t:'p',i:0},{t:'f',i:0})`);
add('osmosis',`g.foundations=${foundations};g.foundations[0].pop();g.waste=[${card}];move({t:'w',i:0},{t:'f',i:0})`,`g.foundations=${foundations};g.foundations[1].pop();g.foundations[0].pop();g.waste=[${card}];move({t:'w',i:0},{t:'f',i:0})`);
add('aces-up',`g.stock=[];g.cols=Array.from({length:4},(_,si)=>[{r:1,si}]);check()`,`g.stock=[];g.cols=Array.from({length:4},(_,si)=>[{r:2,si}]);check()`);
add('scorpion',`g.cols=Array.from({length:4},(_,si)=>Array.from({length:13},(_,i)=>({r:13-i,si,up:true})));check()`,`g.cols=Array.from({length:4},(_,si)=>Array.from({length:13},(_,i)=>({r:13-i,si,up:true})));g.cols[0][0].up=false;check()`);
add('simple-simon',`g.completed=[];g.cols=Array.from({length:10},(_,si)=>si<4?Array.from({length:13},(_,i)=>({r:13-i,si,up:true})):[]);sweep()`,`g.completed=[];g.cols=Array.from({length:10},(_,si)=>si<3?Array.from({length:13},(_,i)=>({r:13-i,si,up:true})):[]);sweep()`);
add('spider',`g.completed=0;g.cols=Array.from({length:8},(_,si)=>Array.from({length:13},(_,i)=>({r:13-i,si:0,up:true})));sweep()`,`g.completed=0;g.cols=Array.from({length:7},(_,si)=>Array.from({length:13},(_,i)=>({r:13-i,si:0,up:true})));sweep()`);
add('gaps',`g.cells=Array.from({length:52},(_,i)=>i%13===12?null:{r:i%13+2,si:Math.floor(i/13)});check()`,`g.cells=Array.from({length:52},(_,i)=>i%13===12?null:{r:i%13+2,si:Math.floor(i/13)});g.cells[0]=null;check()`);
add('golf',`g.columns=Array.from({length:7},()=>[]);check()`,`g.columns=Array.from({length:7},()=>[{r:5,si:0}]);g.stock=[];g.waste=[{r:1,si:0}];check()`);
add('pyramid tripeaks',`g.gone=g.gone.map(()=>true);check()`,`g.gone=g.gone.map(()=>false);check()`);
add('elevens monte-carlo',`g.removed=52;finish()`,`g.removed=50;finish()`);
add('fourteen-out',`g.removed=50;g.selected=0;g.piles[0]=[{r:1,si:0}];g.piles[1]=[{r:13,si:0}];tap(1)`,`g.removed=48;g.selected=0;g.piles[0]=[{r:1,si:0}];g.piles[1]=[{r:13,si:0}];tap(1)`);
add('nestor',`g.removed=50;g.selected=0;g.cols[0]=[{r:7,si:0}];g.cols[1]=[{r:7,si:1}];tap(1)`,`g.removed=48;g.selected=0;g.cols[0]=[{r:7,si:0}];g.cols[1]=[{r:7,si:1}];tap(1)`);
add('black-hole',`g.absorbed=51;g.center={r:12,si:0};g.piles[0]=[{r:13,si:0}];take(0)`,`g.absorbed=50;g.center={r:12,si:0};g.piles[0]=[{r:13,si:0}];take(0)`);
add('accordion',`g.piles=[[{r:1,si:0}],[{r:2,si:0}]];move(1,0)`,`g.piles=[[{r:1,si:0}],[{r:2,si:0}],[{r:3,si:0}]];move(1,0)`);
add('clock',`g.done=false;g.kings=3;g.revealed=51;g.at=0;g.piles[0]=[{r:13,si:0}];step()`,`g.done=false;g.kings=3;g.revealed=50;g.at=0;g.piles[0]=[{r:13,si:0}];step()`);
add('royal-slide',`g.state='123456708';g.done=false;move(8)`,`g.state='123456708';g.done=false;move(6)`);
add('paradox-switch',`g.done=false;g.mask=flip(0,0);press(0)`,`g.done=false;g.mask=flip(flip(0,1),0);press(0)`);
add('suit-code',`g.done=false;g.input=g.secret.slice();submit()`,`g.done=false;g.input=g.secret.map(x=>(x+1)%4);submit()`);
add('kings-road',`g.done=false;g.pos=23;g.visited=new Set([23]);g.hp=30;g.board[24]={r:1,si:0};move(24)`,`g.done=false;g.pos=23;g.visited=new Set([23]);g.hp=1;g.board[24]={r:13,si:1};move(24)`);
add('old-maid',`g.me=[];g.cpu=[{r:0,si:0}];end()`,`g.me=[{r:0,si:0}];g.cpu=[];end()`);
add('last-word',`win('you')`,`win('cpu')`);
add('sevens',`g.out=[0,1,2];advance()`,`g.out=[1,0,2];advance()`);
add('auction',`s.phase='bid';s.round=7;s.myScore=100;s.cpuScore=0;s.bid=0;submit()`,`s.phase='bid';s.round=7;s.myScore=0;s.cpuScore=100;s.bid=0;submit()`);
add('bluff',`s.phase='choose';s.round=7;s.selected=0;s.mine=100;s.theirs=0;play(false)`,`s.phase='choose';s.round=7;s.selected=0;s.mine=0;s.theirs=100;play(false)`);
add('coronation',`s.phase='choose';s.round=7;s.mine=100;s.theirs=0;play(0)`,`s.phase='choose';s.round=7;s.mine=0;s.theirs=100;play(0)`);
add('zero-sum',`g.round=9;g.ys=100;g.cs=0;finish()`,`g.round=9;g.ys=0;g.cs=100;finish()`);
add('redline',`g.round=7;g.roundDone=false;g.ys=100;g.cs=0;finish()`,`g.round=7;g.roundDone=false;g.ys=0;g.cs=100;finish()`);
add('reverse-auction',`g.round=12;g.done=false;g.pending=false;g.ys=1000;g.cs=0;bid(0)`,`g.round=12;g.done=false;g.pending=false;g.ys=0;g.cs=1000;bid(0)`);
add('trump-jack',`g.round=13;g.ys=100;g.cs=0;g.played={first:'you',you:{r:13,si:0},cpu:{r:1,si:0}};finishTrick()`,`g.round=13;g.ys=0;g.cs=100;g.played={first:'you',you:{r:13,si:0},cpu:{r:1,si:0}};finishTrick()`);
add('ghost-hand',`g.done=false;g.set=3;g.turn=4;g.selected=0;g.ys=100;g.cs=0;myTap(0)`,`g.done=false;g.set=3;g.turn=4;g.selected=0;g.ys=0;g.cs=100;myTap(0)`);
add('memory',`g.opened=[0,1];g.deck[0]={r:1,si:0};g.deck[1]={r:1,si:1};g.matched=new Set(Array.from({length:50},(_,i)=>i+2));g.mine=20;g.cpu=5;g.turn=0;resolve()`,`g.opened=[0,1];g.deck[0]={r:1,si:0};g.deck[1]={r:1,si:1};g.matched=new Set(Array.from({length:50},(_,i)=>i+2));g.mine=5;g.cpu=20;g.turn=0;resolve()`);
add('contagion',`s.phase='play';s.board=Array.from({length:9},()=>({owner:'me',card:{r:1,si:0}}));finish()`,`s.phase='play';s.board=Array.from({length:9},()=>({owner:'cpu',card:{r:1,si:0}}));finish()`);
add('eclipse suit-dominion',`g.done=false;g.turn=7;g.selected=0;g.board=Array.from({length:16},(_,i)=>i===0||i===15?null:{owner:'you',card:{r:13,si:0}});play(0)`,`g.done=false;g.turn=7;g.selected=0;g.board=Array.from({length:16},(_,i)=>i===0||i===15?null:{owner:'cpu',card:{r:13,si:0}});play(0)`);
add('alchemy',`s.phase='ready';finish()`,`s.phase='play';finish()`);
add('balance',`s.phase='play';s.index=9;place('left')`,`s.phase='play';s.index=8;place('left')`);
add('borderline',`s.done=true;complete()`,`s.done=false;complete()`);
add('deadline',`g.round=12;finishIfLast()`,`g.round=11;finishIfLast()`);
add('seal',`s.hand=[];nextTarget()`,`s.hand=[{r:1,si:0}];nextTarget()`);
add('lighthouse',`s.phase='play';s.hand=[];check()`,`s.phase='play';s.hand=[{r:13,si:0}];s.tops=[0,0,0,0];check()`);
add('echo',`s.hand=[];s.done=false;finishIfNeeded()`,`s.hand=[{r:1,si:0}];s.echo={r:13,si:1};s.breaks=0;s.done=false;finishIfNeeded()`);
add('seven-seals',`g.done=false;g.hand=[{r:13,si:0}];g.selected=0;g.seals=[[{r:1,si:0},{r:2,si:0},{r:3,si:0}],[{r:1,si:0},{r:2,si:1},{r:3,si:2}],[{r:6,si:0},{r:7,si:1},{r:8,si:2}],[{r:1,si:1},{r:2,si:1},{r:3,si:2}],[{r:1,si:0},{r:2,si:0},{r:3,si:3}],[{r:1,si:0},{r:2,si:1},{r:3,si:2}],[{r:11,si:0},{r:12,si:1}]];place(6)`,`g.done=false;g.hand=[{r:12,si:0}];g.selected=0;g.seals=[[{r:1,si:0},{r:2,si:0},{r:3,si:0}],[{r:1,si:0},{r:2,si:1},{r:3,si:2}],[{r:6,si:0},{r:7,si:1},{r:8,si:2}],[{r:1,si:1},{r:2,si:1},{r:3,si:2}],[{r:1,si:0},{r:2,si:0},{r:3,si:3}],[{r:1,si:0},{r:2,si:1},{r:3,si:2}],[{r:11,si:0},{r:12,si:1}]];place(6)`);
// Older score games expose their terminal result to render; partial sessions,
// exhausted failure states and CPU victories must not unlock the accomplishment.
add('overdrive',`g.finished=true;g.mine=2;g.cpu=1;render()`,`g.finished=true;g.mine=1;g.cpu=2;render()`);
add('shift informant witness',`s.phase='done';render()`,`s.phase='play';render()`);
add('paradox',`s.phase='done';s.mine=2;s.theirs=1;render()`,`s.phase='done';s.mine=1;s.theirs=2;render()`);
add('countdown',`g.done=true;g.turn=10;g.value=0;render()`,`g.done=true;g.turn=10;g.value=1;render()`);
add('fault-line',`g.done=true;g.idx=52;render()`,`g.done=true;g.idx=51;render()`);
add('gin-rummy',`s.phase='match';s.myTotal=50;s.cpuTotal=49;render()`,`s.phase='match';s.myTotal=49;s.cpuTotal=50;render()`);
add('blackjack',`g.done=true;g.round=5;g.wins=3;g.losses=2;render()`,`g.done=true;g.round=5;g.wins=2;g.losses=3;render()`);
add('poker-squares',`g.done=true;g.placed=25;render()`,`g.done=true;g.placed=24;render()`);
add('crossfire',`g.index=16;render()`,`g.index=15;render()`);
add('indian-poker',`g.phase='done';g.mine=2;g.cpu=1;render()`,`g.phase='done';g.mine=1;g.cpu=2;render()`);
add('high-low',`g.done=true;g.attempts=10;render()`,`g.done=true;g.attempts=9;render()`);
add('the-answer',`g.done=true;g.answers=5;render()`,`g.done=true;g.answers=4;render()`);
add('war',`g.phase='done';g.round=10;g.mine=2;g.cpu=1;render()`,`g.phase='done';g.round=10;g.mine=1;g.cpu=2;render()`);
add('judgment',`state.phase='finished';state.wins=[2,1];render()`,`state.phase='finished';state.wins=[1,2];render()`);


add('tombstone',`game(0,'slow');G.found=${foundations};G.found[0].pop();G.waste=[{r:13,si:0}];G.selected={type:'waste'};render();$('area').querySelector('.board button').click()`,`game(0,'slow');finish('手詰まり')`);
add('accomplice',`game(1,'slow');G.points=[100,0];G.hands=[[],[]];end1()`,`game(1,'slow');G.points=[0,100];G.hands=[[],[]];end1()`);
add('thirteenth-hour',`game(2,'slow');G.done=false;G.slots=Array(13).fill(null);G.slots[0]={r:13,si:0};G.stock=[];G.removed=51;remove2([0])`,`game(2,'slow');G.done=false;G.slots=Array(13).fill(null);G.slots[0]={r:13,si:0};G.slots[1]={r:1,si:0};G.stock=[];G.removed=50;remove2([0])`);
add('four-kingdoms',`game(3,'slow');G.hands=[[],[]];G.stock=[];G.round=18;G.realms=[[{owner:0,c:{r:1,si:0}}],[],[],[]];endTurn3()`,`game(3,'slow');G.hands=[[],[]];G.stock=[];G.round=18;G.realms=[[{owner:1,c:{r:1,si:0}}],[],[],[]];endTurn3()`);
add('oblivion',`game(4,'fast');G.peek=false;G.cards=Array(16).fill(null);G.cards[0]={r:1,si:0};G.cards[1]={r:1,si:1};flip4(0);flip4(1)`,`game(4,'fast');G.peek=false;G.fail=4;G.cards=Array(16).fill(null);G.cards[0]={r:1,si:0};G.cards[1]={r:12,si:2};flip4(0);flip4(1)`);
for(const id of ['tombstone','accomplice','thirteenth-hour','four-kingdoms','oblivion'])fixtures[id].page='index';

const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
 if(!file.endsWith('.html')){fs.createReadStream(file).pipe(res);return}
 let html=fs.readFileSync(file,'utf8');
 html=html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(tag,attrs,js)=>{
  if(!js.includes('FiftyTwoAchievements'))return tag;
  const expose=';window.__achievementEval=code=>eval(code);';
  if(/type=["']module/.test(attrs))js+='\n'+expose;
  else {assert.match(js,/\}\)\(\);?\s*$/);js=js.replace(/\}\)\(\);?\s*$/,expose+'})();')}
  return '<script'+attrs+'>'+js+'</script>';
 });
 res.end(html);
});

(async()=>{
 assert.equal(Object.keys(fixtures).length,77,'All 72 standalone and 5 hub games need a real terminal transition fixture');
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})}),base='http://127.0.0.1:'+server.address().port;
 const errors=[];let checks=0;
 try{
  for(const [slug,fixture]of Object.entries(fixtures))for(const mode of ['normal','joker']){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
   const page=await context.newPage();const crashes=[];page.on('pageerror',e=>crashes.push(e.message));
   await context.addInitScript(({slug,mode})=>localStorage.setItem('fifty-two-mode-'+slug,mode),{slug,mode});
   try{
    await page.goto(base+'/'+(fixture.page||slug)+'.html');await page.waitForFunction(()=>typeof window.__achievementEval==='function');
    assert.equal(await page.evaluate(()=>typeof window.__achievementEval),'function');
    await page.evaluate(code=>window.__achievementEval(code),fixture.lose);
    await page.waitForTimeout(slug==='memory'?750:0);await page.evaluate(()=>window.FiftyTwoAchievements.settled());
    assert.equal(await page.evaluate(id=>window.FiftyTwoAchievements.hasWin(id),slug),false,'losing/incomplete result awarded');checks++;
    await page.evaluate(code=>window.__achievementEval(code),fixture.win);
    await page.waitForFunction(id=>window.FiftyTwoJokers.owned().length===1,slug,{timeout:2500});
    assert.equal(await page.evaluate(id=>window.FiftyTwoAchievements.hasWin(id),slug),true);checks++;
    if(fs.readFileSync(path.join(root,(fixture.page||slug)+'.html'),'utf8').includes("'fifty-two-"+slug+"-wins'")||fixture.page==='index'){
     const counts=await page.evaluate(id=>[Number(localStorage.getItem('fifty-two-'+id+'-wins')||0),Number(localStorage.getItem('fifty-two-'+id+'-joker-wins')||0)],slug);
     assert.ok(counts[mode==='joker'?1:0]>0,'victory must enter its own mode record');
     assert.equal(counts[mode==='joker'?0:1],0,'victory must preserve the other mode record');checks+=2;
    }
    await page.evaluate(id=>{window.FiftyTwoAchievements.recordWin(id);window.FiftyTwoAchievements.recordWin(id,'joker')},slug);
    await page.evaluate(()=>window.FiftyTwoAchievements.settled());
    assert.equal(await page.evaluate(()=>window.FiftyTwoJokers.owned().length),1,'repeat or other mode duplicated reward');checks++;
    await page.reload();
    await page.evaluate(()=>window.FiftyTwoAchievements.settled());
    assert.equal(await page.evaluate(()=>window.FiftyTwoJokers.owned().length),1,'reload duplicated reward');checks++;
    assert.deepEqual(crashes,[],'game raised browser errors');
    console.log('PASS '+slug+' '+mode);
   }catch(e){errors.push(slug+' '+mode+': '+e.stack);console.error('FAIL '+slug+' '+mode+': '+e.message)}
   finally{await context.close()}
  }
 }finally{await browser.close();server.close()}
 console.log('Achievement integration: '+checks+' assertions; '+errors.length+' failures');
 if(errors.length){console.error(errors.join('\n'));process.exitCode=1}
})().catch(e=>{server.close();console.error(e);process.exitCode=1});
