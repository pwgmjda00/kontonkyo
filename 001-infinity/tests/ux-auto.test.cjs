#!/usr/bin/env node
'use strict';
// Run with NODE_PATH pointing at Playwright; Chromium defaults to /usr/bin/chromium.
// Only this local test server exposes the lexical bridge. Production HTML is untouched.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const root = process.env.INFINITY_ROOT || path.resolve(__dirname, '..');
const source = process.env.INFINITY_HTML || path.join(root, 'index.html');
const artifacts = process.env.INFINITY_ARTIFACT_DIR || path.join(os.tmpdir(), '001-infinity-ux-auto');
const KEY = 'observer-001-stable-v17';
const NOW = Date.parse('2026-11-02T00:00:00Z');
let passed = 0;
const outcomes = [];
const bridge = `
// Focused controller tests opt out of bootstrap; lifecycle tests keep the production default.
if(!window.__testNativeAutomatic)v68AutoRuntime.wantRunning=false;
window.__infinityTest = {
  state: () => JSON.parse(JSON.stringify(s)),
  fight: () => fight && JSON.parse(JSON.stringify(fight)),
  runtime: () => ({running:v68AutoRuntime.running,paused:v68AutoRuntime.paused,reason:v68AutoRuntime.reason}),
  patch: fields => {Object.assign(s,fields);draw();v63Render();v68AutoRender();},
  configure: fields => {Object.assign(s.v68Auto,fields);v68AutoRender();},
  setFight: value => {fight=value;draw();},
  seedFight: () => {const hp=income();fight={e:{stage:1,boss:false,metal:false,mech:'',hp:1e9,atk:0},hp,max:hp,ehp:1e9,last:Date.now(),active:true,v68AutoOwned:true,v68AutoCredit:0};s.v59BattleLog=[];draw();},
  start: () => v68AutoStart(), pause: reason => v68AutoPause(reason), manual: () => v68AutoManual(),
  initAuto: () => v68AutoInit(), autoTick: (t,dt) => v68AutoTick(t,dt), battleTick: (t,dt) => v68FightTick(t,dt),
  openPanel: key => v68OpenPanel(key),
  buyBuilding: (id,count=1) => v76BuyBuilding(id,count), quoteBuilding: (id,count) => v79BuildingQuote(id,count), gainBoxes: () => boxGain(), buildingCost: id => v76BuildingCost(id), enemyStats: (stage,boss=false,metal=false) => v83EnemyStats(stage,boss,metal),
  hudRows: () => v78HUDRows(), hudUpdate: fields => v78HUDUpdate(fields),
  buildingRates: () => ({attack:v78BuildingAttack(),healing:v78BuildingHealing(),sparkle:v78BuildingSparkle(),money:v76BuildingMoney(),boxes:v76BuildingBoxes(),paper:v76BuildingPaper(),scrap:v76BuildingScrap()}),
  rareCatalog: () => V82_CATALOG, rareGrant: (kind,id) => v82Grant(kind,id), rareRoll: kind => v82Roll(kind), rareRandom: n => {v82Random=()=>n;}, rarePatch: fields => {Object.assign(s.v82Rare,fields);s.v82Rare.revision++;}, rarePower: () => v82Power(), rareEquip: id => v82Equip(id), rareBattle: () => v82BattleDrop(),
  boxCoinRoll: () => v72BoxCoinRoll(), openBox: () => openOne(),
  balance: () => ({income:income(),cost:lvCost(),combat:v74CombatStats(),synergy:synergyBonus(),rebirth:v74Rebirth()}),
  save: () => save(), draw: () => draw(), income: () => income(), step: dt => step(dt),
  closeTutorial: () => closeTutorial(true), switchWorld: w => v63Switch(w),
  dreamEvent: () => v77DreamEvent(), finishDream: success => v64Finish(success),
  patchDream: fields => {Object.assign(v64Expedition(),fields);v64ExpRender();},
  enemyIntent: () => v77EnemyIntent(), stance: () => v77BattleStance(), turnBattle: () => {fightTick(fight.last+1000);draw();},
  readBook: i => readChapter(i), readDiary: i => v62Read(i), readAll: kind => v80ReadAll(kind), permanent: stat => v80Permanent(stat), enemySpec: () => v80EnemySpec(), catalog: () => V80_ENEMIES, nextEnemy: () => enemy(), huntTarget: () => v81HuntTarget(), resolveDrop: () => v80DropRelic(),
  startFight: () => startFight(), chooseDream: type => v64Choose(type), startDream: () => v64Start(),
  snapshot: () => v65Snapshot(), progress: () => progressData(),
  bonus: () => ({income:v63IncomeBonus(),rest:v63RestBonus(),both:v63BothComplete(),reality:v64RealityUnlocked()}),
};
`;
function instrument(html) {
  const start = html.indexOf("(()=>{'use strict';const fmtKinds");
  const end = html.indexOf('</script>', start);
  const close = html.lastIndexOf('})();', end);
  assert.ok(start >= 0 && close > start && close < end, 'Main game closure must be uniquely located');
  return html.slice(0, close) + bridge + html.slice(close);
}
function fixture(extra = {}) {
  return {
    n: 12345, h: 100, lv: 3, boxes: 5, coins: 17, theme: 'navy', last: NOW,
    mode: 'rest', auto: false, tutorialSeen: true,
    owned: {'0': 2, '42': 1}, disabled: {'42': true}, discoveredGear: {'0': true, '42': true},
    savedBuilds: [{name: '大事なビルド', enabled: [0], disabled: [42]}], activeSavedBuild: 0,
    novels: {'1': true}, choices: {'0': 1}, choiceArchive: {}, research: {opening: 1, recycling: 0, balance: 0},
    cards: {'3': 2}, shop: {power: 2}, customHistory: {note: 'unknown fields survive', values: [9, 8, 7]},
    dualWorld: {active: 'classic', chosen: true, classicTheme: 'navy', migrated: true,
      records: {classic: {work: 12, novel: 1, box: 4}, dream: {rest: 3}},
      treasures: {classic: [0, 2], dream: [1]}, pity: {}, announced: {}, v67SeenMigrated: true,
      v65: {bootstrapped: true, earned: {c01: NOW - 1000}, visited: {classic: true, dream: true}}},
    ...extra,
  };
}
async function main() {
  fs.mkdirSync(artifacts, {recursive: true});
  const server = http.createServer((req, res) => {
    if(req.url.split('?')[0]==='/art/starry-night.jpg'){res.writeHead(200,{'Content-Type':'image/jpeg'});res.end(fs.readFileSync(path.join(root,'art/starry-night.jpg')));return;}
    if (req.url === '/favicon.ico') {res.writeHead(204);res.end();return;}
    try {
      const html = instrument(fs.readFileSync(source, 'utf8'));
      res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'});
      res.end(html);
    } catch (error) {res.writeHead(500);res.end(String(error.stack));}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
  async function check(name, run, options = {}) {
    if(process.env.INFINITY_TEST_FILTER&&!new RegExp(process.env.INFINITY_TEST_FILTER).test(name))return;
    const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, locale: 'ja-JP', reducedMotion: 'reduce', ...options.context});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(url).origin ? route.continue() : route.abort());
    await page.clock.install({time: new Date(NOW)});
    await page.clock.pauseAt(new Date(NOW));
    await page.addInitScript(({seed, denyBackup, denyWrites, denyReads, nativeAutomatic}) => {
      window.__testNativeAutomatic=nativeAutomatic;
      const get = Storage.prototype.getItem;
      const set = Storage.prototype.setItem;
      if (!get.call(sessionStorage, '__infinity_test_seeded')) {
        for (const [key, value] of Object.entries(seed || {})) set.call(localStorage, key, value);
        set.call(sessionStorage, '__infinity_test_seeded', '1');
      }
      window.__testStorageRead = key => get.call(localStorage, key);
      window.__testRestoreStorageWrites = () => {Storage.prototype.setItem = set;};
      if (denyBackup || denyWrites) Storage.prototype.setItem = function(key, value) {
        if (denyWrites || key.endsWith('-pre-v68')) throw new DOMException('Test quota exceeded', 'QuotaExceededError');
        return set.call(this, key, value);
      };
      if (denyReads) Storage.prototype.getItem = function() {throw new DOMException('Test storage unavailable', 'SecurityError');};
    }, {seed: options.seed || {}, denyBackup: !!options.denyBackup, denyWrites: !!options.denyWrites, denyReads: !!options.denyReads, nativeAutomatic: !!options.nativeAutomatic});
    try {
      const response = await page.goto(url, {waitUntil: 'load'});
      assert.equal(response.status(), 200);
      await page.waitForFunction(() => !!window.__infinityTest);
      assert.deepEqual(errors, [], `${name}: startup page errors`);
      await run(page, context);
      assert.deepEqual(errors, [], `${name}: uncaught page errors`);
      passed++;
      outcomes.push({name, status: 'passed'});
      console.log(`PASS ${name}`);
    } catch (error) {
      outcomes.push({name, status: 'failed', error: error.message});
      await page.screenshot({path: path.join(artifacts, 'failure.png')}).catch(() => {});
      throw new Error(`${name}: ${error.stack}`, {cause: error});
    } finally {await context.close();}
  }
  const state = page => page.evaluate(() => __infinityTest.state());
  const runtime = page => page.evaluate(() => __infinityTest.runtime());
  async function chooseWorld(page, world) {
    await page.locator(`[data-v63-pick="${world}"]`).click();
    await page.clock.runFor(300);
    const skip = page.locator('#tutorialSkip');
    if (await skip.isVisible()) await skip.click();
    await page.evaluate(() => __infinityTest.closeTutorial());
    assert.equal((await state(page)).dualWorld.active, world);
  }
  async function config(page, settings) {await page.evaluate(value => __infinityTest.configure(value), settings);}
  async function waitImage(image){for(let i=0;i<100;i++){if(await image.evaluate(n=>n.complete&&n.naturalWidth>0))return;await new Promise(resolve=>setTimeout(resolve,20));}assert.fail('Artwork image did not decode');}
  async function openTown(page) {
    const town=page.locator('#v78-town');if(!await town.evaluate(n=>n.open))await town.locator(':scope > summary').click();
    await town.locator(':scope > summary').scrollIntoViewIfNeeded();
  }
  async function closeLibrary(page) {
    if (await page.locator('#v68-library').evaluate(node => node.open)) await page.locator('#v68-library-close').click();
  }
  async function assertWallet(page, label) {
    assert.equal(await page.locator('#v69-wallet').isVisible(),true,`${label}: wallet is visible`);
    const wallet = await page.evaluate(() => {
      const element = id => document.getElementById(id);
      const rect = node => {const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
      const color = value => {
        const parts=value.match(/[\d.]+/g)?.map(Number);
        return parts&&parts.length>=3?[parts[0],parts[1],parts[2],parts.length>3?parts[3]:1]:null;
      };
      const background = node => {
        let result=[0,0,0,0];
        for(let current=node;current;current=current.parentElement){
          const value=color(getComputedStyle(current).backgroundColor);
          if(!value)continue;
          const alpha=result[3]+value[3]*(1-result[3]);
          if(alpha>0)result=[...result.slice(0,3).map((c,i)=>(c*result[3]+value[i]*value[3]*(1-result[3]))/alpha),alpha];
          if(alpha>=.999)return result;
        }
        return null;
      };
      const luminance = rgb => rgb.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
      const metric = id => {
        const node=element(id),box=rect(node),style=getComputedStyle(node),fg=color(style.color),bg=background(node);
        let opacity=1;for(let current=node;current;current=current.parentElement)opacity*=Number.parseFloat(getComputedStyle(current).opacity);
        const rendered=fg&&bg?fg.slice(0,3).map((c,i)=>c*fg[3]*opacity+bg[i]*(1-fg[3]*opacity)):null;
        const top=document.elementFromPoint(Math.min(innerWidth-1,box.x+box.width/2),Math.min(innerHeight-1,box.y+box.height/2));
        const clipped=(node.scrollWidth>node.clientWidth+1&&['hidden','clip'].includes(style.overflowX))||(node.scrollHeight>node.clientHeight+1&&['hidden','clip'].includes(style.overflowY));
        return {box,font:Number.parseFloat(style.fontSize),inDetails:!!node.closest('details'),clipped,visibleTop:!!top&&(top===node||node.contains(top)),contrast:rendered&&bg?(Math.max(luminance(rendered),luminance(bg))+.05)/(Math.min(luminance(rendered),luminance(bg))+.05):null,text:node.textContent.trim()};
      };
      return {width:innerWidth,height:innerHeight,box:rect(element('v69-wallet')),footer:rect(element('v68-bottom')),number:metric('number'),rate:metric('rate')};
    });
    assert.ok(wallet.box.y>=0&&wallet.box.right<=wallet.width+.5&&wallet.box.bottom<=wallet.footer.y+.5,`${label}: wallet remains above controls and inside viewport`);
    for(const [key,minFont] of [['number',24],['rate',14]]){
      const value=wallet[key];
      assert.ok(value.text.length>0,`${label}: ${key} contains current financial information`);
      assert.equal(value.inDetails,false,`${label}: ${key} is never inside a collapsed detail panel`);
      assert.equal(value.clipped,false,`${label}: ${key} remains readable instead of being clipped`);
      assert.ok(value.box.height>0&&value.box.width>0&&value.box.y>=0&&value.box.bottom<=wallet.height,`${label}: ${key} stays on screen`);
      assert.ok(value.font>=minFont,`${label}: ${key} font ${value.font}px is readable`);
      assert.equal(value.visibleTop,true,`${label}: ${key} is not covered by scenery or notifications`);
      assert.ok(value.contrast!==null&&value.contrast>=4.5,`${label}: ${key} text contrast is at least4.5:1, got ${value.contrast}`);
    }
    return wallet;
  }
  try {
    await check('fresh classic: world selector, default composition, real manual battle', async page => {
      assert.equal(await page.locator('#v63-world-overlay').getAttribute('aria-hidden'), 'false');
      assert.equal((await state(page)).shop.mondrian, 1);
      await chooseWorld(page, 'classic');
      assert.equal((await state(page)).theme, 'mondrian');
      assert.equal((await state(page)).dualWorld.classicTheme, 'mondrian');
      assert.equal((await state(page)).v68Auto.boss, true);
      assert.equal((await state(page)).v68Auto.reward, true);
      await page.locator('#attack').click();
      const initialFight = await page.evaluate(() => __infinityTest.fight());
      assert.equal(initialFight.active, true);
      // The original combat clock runs on the shared 500ms loop. Allow its next
      // tick after a full one-second turn even when the battle starts off-grid.
      await page.clock.runFor(1500);
      assert.ok((await page.evaluate(() => __infinityTest.fight())).ehp < initialFight.ehp, 'Existing combat rules must execute a real attack against either ordinary or metal enemies');
    });
    await check('all AUTO defaults enabled, loot counts update and treasures are explained', async page => {
      const initial=await state(page);
      for(const flag of ['explore','combat','boss','reward','theater'])assert.equal(initial.v68Auto[flag],true,flag+' default ON');
      assert.equal((await runtime(page)).running,false,'Settings ON does not start play behind the player');
      await page.evaluate(()=>{__infinityTest.patch({boxes:42});Math.random=()=>.5;});
      await page.locator('#v68-shortcut-gear').click();
      assert.match(await page.locator('#v68-library-title').innerText(),/42/);
      assert.match(await page.locator('#boxpanel h3').innerText(),/42個/);
      await page.locator('#open').click();
      assert.match(await page.locator('#boxpanel h3').innerText(),/41個/);
      await closeLibrary(page);
      await page.locator('#v68-shortcut-progress').click();
      const help=await page.locator('#v71-treasure-help').innerText();
      assert.match(help,/11種類/);assert.match(help,/生産が×1.06/);assert.match(help,/回復が×1.06/);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('box coin odds use one exact 1-in-1000 outcome and reject biased tail values', async page => {
      const result=await page.evaluate(()=>{
        const original=crypto.getRandomValues.bind(crypto);let next=0,hits=0;
        try{
          crypto.getRandomValues=words=>{words[0]=next++;return words;};
          for(let i=0;i<1000;i++)if(__infinityTest.boxCoinRoll())hits++;
          let calls=0;const values=[4294967295,4294967000,1000];
          crypto.getRandomValues=words=>{words[0]=values[calls++];return words;};
          return {hits,rejectedThenWon:__infinityTest.boxCoinRoll(),calls};
        }finally{crypto.getRandomValues=original;}
      });
      assert.deepEqual(result,{hits:1,rejectedThenWon:true,calls:3});
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('manual, batch and AUTO boxes award currency once per box alongside equipment', async page => {
      await page.evaluate(()=>{crypto.getRandomValues=words=>{words.fill(0);return words;};Math.random=()=>.5;__infinityTest.patch({boxes:50,coins:0,owned:{109:1},boxCoinTotal:0,opened:0});});
      await page.locator('#v68-shortcut-gear').click();
      await page.locator('#open').click();
      let current=await state(page);assert.equal(current.coins,1);assert.equal(current.opened,1);
      assert.equal(current.owned['21'],11,'Additional equipment does not multiply the currency draw');
      assert.match(await page.locator('#boxresult').innerText(),/ジェム＋1/);
      assert.match(await page.locator('#v72-box-coin-notice').innerText(),/ジェム＋1/);
      await page.locator('#open10').click();
      current=await state(page);assert.equal(current.coins,11);assert.equal(current.boxCoinTotal,11);
      assert.match(await page.locator('#boxresult').innerText(),/ジェム＋10/);
      await closeLibrary(page);await config(page,{explore:true,combat:false,speed:4});
      await page.locator('#v68-auto-main').click();await page.clock.runFor(1000);await page.locator('#v68-auto-main').click();
      current=await state(page);assert.ok(current.opened>11);assert.equal(current.coins,current.opened);
      await page.evaluate(()=>{__infinityTest.patch({autoOpen:true});});await page.clock.runFor(500);
      current=await state(page);assert.equal(current.coins,current.opened,'Legacy auto-open uses the same per-box reward');
      await page.evaluate(()=>{__infinityTest.patch({boxes:0,autoOpen:false});});const before=await state(page);
      assert.equal(await page.evaluate(()=>__infinityTest.openBox()),false);assert.equal((await state(page)).coins,before.coins);
      await page.evaluate(()=>__infinityTest.save());await page.reload({waitUntil:'load'});
      assert.equal((await state(page)).boxCoinTotal,current.boxCoinTotal,'Coin reward total survives reload');
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('level178 large HP stays compact without changing combat state or hiding money', async page => {
      await page.evaluate(()=>{__infinityTest.patch({lv:178,n:9e60,numFormat:'digits'});__infinityTest.setFight({e:{stage:2,hp:21,atk:2,boss:false},hp:5e307,max:1e308,ehp:0,last:Date.now(),active:false});});
      assert.ok((await page.locator('#v59-self-hp').innerText()).length<40);
      assert.match(await page.locator('#v59-self-hp').innerText(),/e\+307/);
      assert.ok((await page.locator('#battleinfo').innerText()).length<60);
      assert.equal(await page.locator('#v59-self-bar').evaluate(n=>n.style.width),'50%');
      assert.equal((await page.evaluate(()=>__infinityTest.fight())).hp,5e307);
      await assertWallet(page,'level178 large HP');
      const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(layout.scroll<=layout.width);
      assert.match(await page.locator('#v59-self-hp').getAttribute('title'),/5e\+307/);
    },{context:{viewport:{width:864,height:655}},seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('closing details explains temporary pause and automatically resumes', async page => {
      await config(page,{explore:true,combat:false});await page.locator('#v68-auto-main').click();await page.clock.runFor(1000);
      await page.locator('#v68-shortcut-gear').click();assert.equal((await runtime(page)).paused,true);
      await closeLibrary(page);await page.clock.runFor(1);
      assert.match(await page.locator('#v68-auto-status').innerText(),/閉じました/);
      assert.equal((await runtime(page)).running,false);
      await page.clock.runFor(500);assert.equal((await runtime(page)).running,true);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('balanced combat is independent of production and duplicate growth diminishes', async page => {
      const values=await page.evaluate(()=>{
        __infinityTest.patch({lv:178,h:100,mode:'fast',auto:false,rebirth:0,owned:{},disabled:{},shop:{mondrian:1},cards:{},choices:{},forgeLevel:{},research:{opening:0,recycling:0,balance:0},boostUntil:0,chaosUntil:0,returnBonusUntil:0});
        const owned={};for(let i=0;i<107;i++)owned[i]=100;
        __infinityTest.patch({owned});const first=__infinityTest.balance();
        __infinityTest.patch({shop:{mondrian:1,power:100},boost:5,boostUntil:Date.now()+90000});const financial=__infinityTest.balance();
        __infinityTest.patch({shop:{mondrian:1},boostUntil:0,owned:Object.fromEntries(Object.keys(owned).map(k=>[k,10000]))});const duplicates=__infinityTest.balance();
        __infinityTest.patch({rebirth:40});const reborn=__infinityTest.balance();
        return {first,financial,duplicates,reborn,state:__infinityTest.state()};
      });
      assert.deepEqual(values.financial.combat,values.first.combat,'Production investments and money boosts do not create combat HP');
      assert.ok(values.financial.income>values.first.income);
      assert.ok(values.duplicates.income/values.first.income<4,'100x duplicate count must not create a millionfold output');
      assert.ok(values.duplicates.income>values.first.income,'Duplicates still improve production');
      assert.ok(values.duplicates.combat.hp/values.first.combat.hp<2);
      assert.ok(values.first.cost/values.first.income>3&&values.first.cost/values.first.income<30);
      assert.ok(values.reborn.rebirth>1&&values.reborn.rebirth<5);
      assert.equal(values.state.owned['0'],10000,'Owned quantities are retained');assert.equal(values.state.lv,178);
      assert.ok(Object.values(values.first.combat).every(Number.isFinite));
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('v83 preserves opening enemies and stages scale independently of player wealth', async page => {
      const rows=await page.evaluate(()=>[1,5,15,30,31,75,150,300].map(stage=>({stage,normal:__infinityTest.enemyStats(stage),boss:__infinityTest.enemyStats(stage,true)})));
      for(const r of rows){
        if(r.stage<=30){assert.equal(r.normal.hp,Math.ceil(18*(1+.2*(r.stage-1))**1.8));assert.equal(r.normal.atk,Math.ceil(2*(1+.14*(r.stage-1))**1.75));}
        assert.ok(r.boss.hp>=r.normal.hp*2.9);assert.ok(r.boss.atk>=r.normal.atk);
      }
      await page.evaluate(()=>__infinityTest.patch({lv:1000,n:1e99}));
      assert.deepEqual(await page.evaluate(()=>__infinityTest.enemyStats(150)),rows.find(r=>r.stage===150).normal);
      assert.ok(rows.at(-1).normal.hp>Math.ceil(18*(1+.2*299)**1.8)*3);
    });
    await check('v83 building costs grow after ten, bulk uses full prices and old levels survive', async page => {
      const result=await page.evaluate(()=>{const b=__infinityTest.state().v76Buildings;b.levels.dojo=100;__infinityTest.patch({v76Buildings:b,n:1e100});const first=__infinityTest.buildingCost('dojo'),before=__infinityTest.state().n;const quote=__infinityTest.quoteBuilding('dojo',10);const bought=__infinityTest.buyBuilding('dojo',10);__infinityTest.save();return {first,quote,bought,before,state:__infinityTest.state()};});
      assert.ok(result.first>1e15);assert.ok(result.quote>10*result.first);assert.equal(result.bought,true);assert.equal(result.state.v76Buildings.levels.dojo,110);
      // Use a representable balance for exact deduction, rather than losing a tiny price in 1e100.
      await page.evaluate(()=>{const b=__infinityTest.state().v76Buildings;b.levels.dojo=25;__infinityTest.patch({v76Buildings:b});__infinityTest.patch({n:__infinityTest.quoteBuilding('dojo',10)*2});});
      const charged=await page.evaluate(()=>{const q=__infinityTest.quoteBuilding('dojo',10),before=__infinityTest.state().n;__infinityTest.buyBuilding('dojo',10);__infinityTest.save();return {q,before,after:__infinityTest.state().n};});assert.equal(charged.after,charged.before-charged.q);
      await page.reload({waitUntil:'load'});assert.equal((await state(page)).v76Buildings.levels.dojo,35);
      await page.evaluate(()=>{const b=__infinityTest.state().v76Buildings;b.levels.dojo=10000;__infinityTest.patch({v76Buildings:b,n:Number.MAX_VALUE});});assert.equal(await page.evaluate(()=>__infinityTest.buyBuilding('dojo')),false);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('v83 late upgrade prices stay increasing with gentler growth and preserve assets', async page => {
      const result=await page.evaluate(()=>[1,25,149,150,151,300,500].map(lv=>{__infinityTest.patch({lv,n:12345});return {lv,cost:__infinityTest.balance().cost,n:__infinityTest.state().n};}));
      for(const row of result){assert.equal(row.n,12345);if(row.lv<=150)assert.equal(row.cost,Math.floor(12*1.43**(row.lv-1)));}
      for(let i=1;i<result.length;i++)assert.ok(result[i].cost>result[i-1].cost);
      const late=result.find(r=>r.lv===300);assert.ok(late.cost<12*1.43**299/100);assert.ok(late.cost>result.find(r=>r.lv===150).cost);
    });
    await check('fresh level1 can finish its first normal battle with the real turn loop', async page => {
      await chooseWorld(page,'classic');
      await page.evaluate(()=>{Math.random=()=>.5;});
      await page.locator('#attack').click();const initial=await page.evaluate(()=>__infinityTest.fight());
      assert.equal(initial.hp,initial.max);assert.ok(initial.hp>=20);
      await page.clock.runFor(5500);
      assert.equal((await state(page)).wins,1);assert.ok((await page.evaluate(()=>__infinityTest.fight())).hp>0);
    });
    await check('two-minute fresh play with opening, growth and AUTO remains finite and advances', async page => {
      await chooseWorld(page,'classic');
      await page.evaluate(()=>{let seed=7401;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
      const stages=[];
      for(let phase=0;phase<4;phase++){
        if(await page.locator('#godaccept').isVisible())await page.locator('#godaccept').click();
        await page.locator('#v68-auto-manual').click();
        await page.locator('#v68-shortcut-gear').click();
        if(await page.locator('#openall').isEnabled())await page.locator('#openall').click();
        for(let n=0;n<11&&await page.locator('#godaccept').isVisible();n++)await page.locator('#godaccept').click();
        await closeLibrary(page);
        for(let n=0;n<20&&await page.locator('#upgrade').isEnabled();n++)await page.locator('#upgrade').click();
        await page.locator('#v68-auto-main').click();await page.clock.runFor(30000);
        const current=await state(page);stages.push({seconds:(phase+1)*30,level:current.lv,wins:current.wins,opened:current.opened,money:current.n});
        assert.ok(Number.isFinite(current.n)&&Number.isFinite(current.lv));
      }
      assert.ok(stages.at(-1).level>=3);assert.ok(stages.at(-1).wins>=3);
      assert.ok(stages.every((row,i)=>i===0||row.wins>=stages[i-1].wins));
      console.log('Fresh balance play:',JSON.stringify(stages));
    });
    await check('fresh dream: existing default theme and seven-step exploration reward once', async page => {
      await chooseWorld(page, 'dream');
      assert.equal((await state(page)).theme, 'dream');
      assert.equal((await state(page)).shop.mondrian, 1);
      await page.locator('#v64-exp-start').click();
      for (let i = 0; i < 7; i++) await page.locator('[data-v64-choice="0"]').click();
      const completed = await state(page);
      assert.equal(completed.dualWorld.v64.completed, 1);
      assert.equal(completed.dualWorld.v64.explore.success, true);
      assert.equal(completed.dualWorld.v64.sites['0'], 1);
      const rewards = {coins: completed.coins, boxes: completed.boxes};
      await page.evaluate(() => {__infinityTest.chooseDream(0);__infinityTest.chooseDream(0);});
      const repeated = await state(page);
      assert.equal(repeated.dualWorld.v64.completed, 1);
      assert.equal(repeated.coins, rewards.coins);
      assert.equal(repeated.boxes, rewards.boxes);
    });
    const old = fixture();
    const oldRaw = JSON.stringify(old);
    await check('existing save: exact raw backup, theme/build/inventory/history/progress preserved', async page => {
      const actual = await state(page);
      for (const key of ['theme', 'owned', 'disabled', 'savedBuilds', 'activeSavedBuild', 'customHistory', 'choices', 'cards']) assert.deepEqual(actual[key], old[key], key);
      assert.equal(actual.dualWorld.classicTheme, 'navy');
      assert.equal(actual.dualWorld.records.classic.work, 12);
      assert.equal(actual.dualWorld.v65.earned.c01, NOW - 1000);
      assert.equal(actual.shop.mondrian, 1);
      assert.equal(actual.v68Migration, 1);
      assert.equal(await page.evaluate(key => localStorage.getItem(key + '-pre-v68'), KEY), oldRaw);
      assert.equal((await page.evaluate(() => __infinityTest.progress())).rows[0][1], 2, 'Composition is a theme, never a discovered gear entry');
      await page.locator('#v63-world-switch').click();
      await page.locator('[data-v63-pick="dream"]').click();
      assert.equal((await state(page)).theme, 'dream');
      await page.locator('#v63-world-switch').click();
      await page.locator('[data-v63-pick="classic"]').click();
      assert.equal((await state(page)).theme, 'navy');
      assert.deepEqual((await state(page)).owned, old.owned);
    }, {seed: {[KEY]: oldRaw}});
    await check('pre-upgrade backup exports through the save UI and restores through the existing importer', async page => {
      await page.locator('#v68-shortcut-menu').click();
      await page.locator('#v68-menu-save').click();
      const currentRaw = await page.evaluate(key => localStorage.getItem(key), KEY);
      await page.locator('#v68-export-preupgrade').click();
      const exported = JSON.parse(await page.locator('#savedata').inputValue());
      assert.equal(exported.game, '001-infinity');
      assert.deepEqual(exported.state, old, 'Recovery export must retain the original pre-migration state');
      assert.equal(await page.evaluate(key => localStorage.getItem(key + '-pre-v68'), KEY), oldRaw);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), currentRaw, 'Export must not overwrite the current save');
      page.once('dialog', dialog => dialog.accept());
      await Promise.all([
        page.waitForEvent('load'),
        page.locator('#saveimport').click(),
      ]);
      await page.waitForFunction(() => !!window.__infinityTest);
      const restored = await state(page);
      for (const key of ['theme', 'owned', 'disabled', 'savedBuilds', 'choices', 'cards', 'customHistory']) assert.deepEqual(restored[key], old[key], key);
      assert.equal(restored.shop.mondrian, 1, 'Re-imported legacy saves receive the same idempotent shared theme grant');
      assert.equal(await page.evaluate(key => localStorage.getItem(key + '-pre-v68'), KEY), oldRaw);
      assert.equal(await page.evaluate(key => localStorage.getItem(key + '-preimport') !== null, KEY), true);
    }, {seed: {[KEY]: oldRaw}});
    await check('existing composition ownership is idempotent and equipped theme remains unchanged', async page => {
      assert.equal((await state(page)).shop.mondrian, 4);
      assert.equal((await state(page)).theme, 'plum');
      await page.reload({waitUntil: 'load'});
      assert.equal((await state(page)).shop.mondrian, 4);
      assert.equal((await state(page)).theme, 'plum');
    }, {seed: {[KEY]: JSON.stringify(fixture({theme: 'plum', shop: {mondrian: 4}}))}});
    await check('legacy fallback key migrates without modifying original legacy bytes', async page => {
      assert.equal((await state(page)).shop.mondrian, 1);
      assert.equal((await state(page)).theme, 'navy');
      assert.equal(await page.evaluate(() => localStorage.getItem('observer-001-stable-v16')), oldRaw);
      assert.equal(await page.evaluate(key => localStorage.getItem(key + '-pre-v68'), KEY), oldRaw);
    }, {seed: {'observer-001-stable-v16': oldRaw}});
    await check('corrupt save is never overwritten by automatic saves', async page => {
      await page.clock.runFor(6000);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), '{broken-json');
      assert.equal(await page.locator('#v67-save-warning').isVisible(), true);
    }, {seed: {[KEY]: '{broken-json'}});
    await check('migration backup quota failure protects the exact original save', async page => {
      await page.clock.runFor(6000);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), oldRaw);
      assert.equal(await page.locator('#v67-save-warning').isVisible(), true);
      await page.evaluate(() => __infinityTest.save());
      assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), oldRaw);
    }, {seed: {[KEY]: oldRaw}, denyBackup: true});
    await check('temporary migration backup failure recovers without leaving a stale warning', async page => {
      assert.equal(await page.locator('#v67-save-warning').isVisible(), true);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), oldRaw);
      await page.evaluate(() => {window.__testRestoreStorageWrites();__infinityTest.save();});
      assert.equal(await page.evaluate(key => localStorage.getItem(key + '-pre-v68'), KEY), oldRaw);
      assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).v68Migration, KEY), 1);
      assert.equal(await page.locator('#v67-save-warning').isVisible(), false);
    }, {seed: {[KEY]: oldRaw}, denyBackup: true});
    for (const [name, fields] of [['non-numeric currency', {n: 'invalid'}], ['null inventory map', {owned: null}]]) {
      const malformedRaw = JSON.stringify(fixture(fields));
      await check(`malformed save ${name}: original protected and temporary gameplay remains usable`, async page => {
        assert.equal(await page.locator('#v67-save-warning').isVisible(), true);
        await chooseWorld(page, 'classic');
        await page.locator('#attack').click();
        assert.equal((await page.evaluate(() => __infinityTest.fight())).active, true);
        await page.clock.runFor(6000);
        assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), malformedRaw);
      }, {seed: {[KEY]: malformedRaw}});
    }
    await check('storage write denial leaves gameplay usable and exposes backup warning', async page => {
      await chooseWorld(page, 'classic');
      assert.equal(await page.locator('#v67-save-warning').isVisible(), true);
      await page.locator('#attack').click();
      assert.equal((await page.evaluate(() => __infinityTest.fight())).active, true);
      await page.evaluate(() => document.getElementById('saveexport').click());
      const exported = await page.locator('#savedata').inputValue();
      assert.equal(JSON.parse(exported).game, '001-infinity');
    }, {denyWrites: true});
    await check('storage read denial is not treated as a new save and cannot overwrite inaccessible data', async page => {
      await page.clock.runFor(6000);
      assert.equal(await page.evaluate(key=>window.__testStorageRead(key),KEY),oldRaw);
      assert.equal(await page.locator('#v67-save-warning').isVisible(),true);
      assert.equal((await state(page)).theme,'dark','An unreadable existing save is not a confirmed fresh game');
    }, {seed:{[KEY]:oldRaw},denyReads:true});
    await check('gems rename labels without changing the currency balance or save key', async page => {
      assert.match(await page.locator('#v69-wallet-coins').innerText(),/ジェム 17/);
      assert.match(await page.locator('#v69-wallet-coins').getAttribute('title'),/ジェム/);
      await page.locator('#v68-shortcut-gear').click();assert.match(await page.locator('#v72-box-coin-odds').innerText(),/ジェム/);
      assert.equal((await state(page)).coins,17);await page.evaluate(()=>__infinityTest.save());
      const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);assert.equal(saved.coins,17);assert.equal(saved.gems,undefined);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('all eleven dream destinations expose three distinct stable encounters', async page => {
      await chooseWorld(page,'dream');await page.evaluate(()=>__infinityTest.startDream());
      const events=await page.evaluate(()=>{const rows=[];for(let site=0;site<11;site++)for(let seed=0;seed<3;seed++){__infinityTest.patchDream({site,seed,step:0});rows.push(__infinityTest.dreamEvent());}return rows;});
      assert.equal(new Set(events.map(e=>e.key)).size,33);assert.equal(new Set(events.map(e=>e.title)).size,33);
      assert.deepEqual([...new Set(events.map(e=>e.favored))].sort(),[0,1,2]);
    });
    await check('dream encounter bonuses are capped and genuine steps retain energy tradeoffs', async page => {
      await chooseWorld(page,'dream');await page.evaluate(()=>{__infinityTest.startDream();__infinityTest.patchDream({seed:0});Math.random=()=>.9;});
      assert.match(await page.locator('#v64-exp-event').innerText(),/迷子のてんとう虫/);
      assert.match(await page.locator('[data-v64-choice="0"]').innerText(),/きらめき＋1/);
      await page.evaluate(()=>{for(const choice of [0,1,2,0])__infinityTest.chooseDream(choice);});
      const e=(await state(page)).dualWorld.v64.explore;assert.equal(e.step,4);assert.equal(e.energy,7);assert.equal(e.sparkle,7);assert.equal(e.v77Gifts,2);assert.equal(e.v77Shelter,true);
      assert.equal(Object.keys((await state(page)).dualWorld.v77.album).length,3);
      assert.match(e.history.at(-1),/元気.*→.*きらめき/);
      assert.equal(await page.evaluate(()=>__infinityTest.dreamEvent().key),'0:1');
    });
    await check('dream encounter and album persist across reload; invalid steps and double completion cannot grant twice', async page => {
      await chooseWorld(page,'dream');await page.evaluate(()=>{__infinityTest.startDream();__infinityTest.patchDream({seed:0});__infinityTest.chooseDream(0);});
      const before=await state(page),event=await page.evaluate(()=>__infinityTest.dreamEvent());await page.reload({waitUntil:'load'});
      assert.deepEqual(await page.evaluate(()=>__infinityTest.dreamEvent()),event);assert.deepEqual((await state(page)).dualWorld.v77,before.dualWorld.v77);
      await page.evaluate(()=>{__infinityTest.chooseDream(99);__infinityTest.startDream();});assert.equal((await state(page)).dualWorld.v64.explore.step,1);
      await page.locator('#v77-dream-journal-open').click();assert.match(await page.locator('#v77-dream-journal').innerText(),/迷子のてんとう虫/);await closeLibrary(page);
      await page.evaluate(()=>{for(let i=0;i<6;i++)__infinityTest.chooseDream(0);});
      const completed=await state(page);assert.equal(completed.dualWorld.v64.completed,1);
      await page.evaluate(()=>{__infinityTest.finishDream(true);__infinityTest.chooseDream(0);});
      const twice=await state(page);assert.equal(twice.boxes,completed.boxes);assert.equal(twice.coins,completed.coins);assert.equal(twice.dualWorld.v64.completed,1);
    });
    await check('enemy forecasts match the actual three-turn pattern and tactics have real costs', async page => {
      const data=await page.evaluate(()=>{
        __infinityTest.patch({lv:1,owned:{},disabled:{},shop:{mondrian:1},research:{opening:0,recycling:0,balance:0},cards:{},choices:{},rebirth:0,v80Knowledge:{books:{},diaries:{}},v80Relics:{counts:{}}});Math.random=()=>.99;
        const seed=tactic=>__infinityTest.setFight({e:{stage:1,hp:1000,atk:8,boss:false,metal:false,mech:''},hp:24,max:24,ehp:1000,last:Date.now(),active:true,v77Tactic:tactic});
        const out={};for(const tactic of ['attack','guard','focus']){seed(tactic);const intent=__infinityTest.enemyIntent();__infinityTest.turnBattle();out[tactic]={intent,fight:__infinityTest.fight()};}
        seed('attack');const forecasts=[];for(let i=0;i<3;i++){forecasts.push(__infinityTest.enemyIntent().power);__infinityTest.turnBattle();}out.forecasts=forecasts;return out;
      });
      assert.deepEqual(data.forecasts,[.75,.75,1.5]);
      assert.equal(data.attack.fight.ehp,995);assert.equal(data.guard.fight.ehp,996.25);assert.equal(data.focus.fight.ehp,993.75);
      assert.equal(data.attack.fight.hp,18);assert.ok(Math.abs(data.guard.fight.hp-20.1)<1e-9);assert.ok(Math.abs(data.focus.fight.hp-16.8)<1e-9);
      assert.equal(data.attack.fight.v77Turn,1);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('AUTO chooses a defensive tactic for danger and a finishing tactic without hidden stats', async page => {
      const actual=await page.evaluate(()=>{
        __infinityTest.patch({lv:1,owned:{},disabled:{},shop:{mondrian:1},research:{opening:0,recycling:0,balance:0},cards:{},choices:{},rebirth:0,v80Knowledge:{books:{},diaries:{}},v80Relics:{counts:{}}});
        const f={e:{stage:1,hp:1000,atk:8,boss:false,metal:false,mech:''},hp:24,max:24,ehp:1000,last:Date.now(),active:true,v77Turn:2,v68AutoOwned:true};
        __infinityTest.setFight(f);const danger=__infinityTest.stance();f.ehp=4;__infinityTest.setFight(f);const finish=__infinityTest.stance();f.v77Tactic='guard';__infinityTest.setFight(f);return {danger,finish,manual:__infinityTest.stance()};
      });assert.deepEqual(actual,{danger:'guard',finish:'focus',manual:'guard'});
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('battle tactic can be changed on a narrow phone and remains selected when AUTO resumes', async page => {
      await page.locator('#v68-auto-main').click();await page.clock.runFor(1000);
      await page.locator('#v77-tactic').focus();const paused=await page.evaluate(()=>__infinityTest.fight());
      await page.clock.runFor(1500);assert.equal((await runtime(page)).running,false);
      assert.equal((await page.evaluate(()=>__infinityTest.fight())).ehp,paused.ehp,'AUTO waits while the player chooses a tactic');
      await page.locator('#v77-tactic').selectOption('guard');await page.clock.runFor(500);assert.equal((await runtime(page)).running,true);
      assert.equal((await page.evaluate(()=>__infinityTest.fight())).v77Tactic,'guard');assert.equal(await page.locator('#v77-tactic').inputValue(),'guard');
      const box=await page.locator('#v77-tactic').boundingBox();assert.ok(box.width>0&&box.x>=0&&box.x+box.width<=320);assert.ok(box.height>=44);
      assert.match(await page.locator('#v77-tactic-effect').innerText(),/守り/);
      await page.locator('#v77-tactic').scrollIntoViewIfNeeded();
      await page.screenshot({path:path.join(artifacts,'tactics-classic-320.png')});
    },{context:{viewport:{width:320,height:568}},seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('rare catalogs add 100 functional items each without altering legacy inventories',async page=>{
      const data=await page.evaluate(()=>__infinityTest.rareCatalog());for(const kind of ['gear','card','trophy']){assert.equal(data[kind].length,100);assert.equal(new Set(data[kind].map(x=>x.name)).size,100);assert.deepEqual([...new Set(data[kind].map(x=>x.tier))],[0,1,2,3]);}
      const before=await state(page),base=await page.evaluate(()=>__infinityTest.balance());await page.evaluate(()=>__infinityTest.rareGrant('gear',0));const next=await page.evaluate(()=>__infinityTest.balance());assert.ok(next.income>base.income);assert.equal(next.combat.hp,base.combat.hp);assert.equal(next.combat.attack,base.combat.attack);assert.deepEqual((await state(page)).owned,before.owned);assert.deepEqual((await state(page)).cards,before.cards);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('rare tiers unlock by progress and pity grants common and ultra rewards correctly',async page=>{
      const result=await page.evaluate(()=>{const out=[];for(const stage of [1,30,75,150]){__infinityTest.rarePatch({highest:stage});__infinityTest.rareRandom(0);__infinityTest.rareRoll('gear');out.push(__infinityTest.state().v82Rare.last.id);}__infinityTest.rarePatch({highest:1,misses:{gear:499,card:0,trophy:0}});__infinityTest.rareRandom(.999);__infinityTest.rareRoll('gear');const common=__infinityTest.state().v82Rare;__infinityTest.rarePatch({highest:150,ultra:{gear:0,card:249999,trophy:0}});__infinityTest.rareRoll('card');return {out,common,ultra:__infinityTest.state().v82Rare};});
      assert.deepEqual(result.out,[0,25,50,75]);assert.equal(result.common.last.id,24);assert.equal(result.common.misses.gear,0);assert.equal(result.ultra.last.id,99);assert.equal(result.ultra.ultra.card,0);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('rare tier ticket boundaries match the disclosed exact base odds',async page=>{
      const result=await page.evaluate(()=>{const out=[];for(const ticket of [0,1,10,11,110,111,1110,1111]){__infinityTest.rarePatch({highest:150,misses:{gear:0,card:0,trophy:0},ultra:{gear:0,card:0,trophy:0},last:null});__infinityTest.rareRandom(ticket/4294967296);__infinityTest.rareRoll('gear');const last=__infinityTest.state().v82Rare.last;out.push(last?Math.floor(last.id/25):-1);}return out;});
      assert.deepEqual(result,[3,2,2,1,1,0,0,-1]);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('rare draws occur once per box even with extra gear and do not spend absent boxes',async page=>{
      await page.evaluate(()=>{Math.random=()=>.5;__infinityTest.rareRandom(.999);__infinityTest.patch({boxes:1,owned:{109:1}});__infinityTest.openBox();});let after=await state(page);assert.equal(after.v82Rare.rolls.gear,1);assert.equal(after.v82Rare.rolls.card,1);assert.equal(after.owned['21'],11);
      assert.equal(await page.evaluate(()=>__infinityTest.openBox()),false);after=await state(page);assert.equal(after.v82Rare.rolls.gear,1);assert.equal(after.v82Rare.rolls.card,1);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('rare equipment slots and collection sets have real effects and stable controls',async page=>{
      await page.evaluate(()=>{for(const id of [0,1,2,3])__infinityTest.rareGrant('gear',id);});let data=await state(page);assert.deepEqual(data.v82Rare.equipped,[0,1,2]);assert.equal(await page.evaluate(()=>__infinityTest.rareEquip(3)),false);assert.ok((await page.evaluate(()=>__infinityTest.rarePower())).sets>=1);
      await page.evaluate(()=>{__infinityTest.rareEquip(1);__infinityTest.rareEquip(3);});assert.deepEqual((await state(page)).v82Rare.equipped,[0,2,3]);
      await page.locator('#v68-shortcut-gear').click();await page.locator('#v82-open-rare').click();assert.equal(await page.locator('#v82-items article').count(),100);await page.locator('#v82-items button').first().focus();await page.clock.runFor(1500);assert.equal(await page.locator('#v82-items button').first().evaluate(n=>n===document.activeElement),true);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('rare trophy rolls cannot repeat for one victory and collections survive rebirth',async page=>{
      await page.evaluate(()=>{__infinityTest.rareRandom(0);__infinityTest.patch({lv:25});__infinityTest.rareGrant('gear',0);__infinityTest.rareGrant('card',1);const st=__infinityTest.balance().combat;__infinityTest.setFight({e:{stage:150,hp:1,atk:0,boss:false,metal:false,mech:''},hp:st.hp,max:st.hp,ehp:1,last:Date.now(),active:true});__infinityTest.turnBattle();__infinityTest.rareBattle();});const before=await state(page);assert.equal(before.v82Rare.rolls.trophy,1);assert.equal(before.v82Rare.counts.trophy['75'],1);await page.clock.runFor(500);
      page.once('dialog',d=>d.accept());await page.locator('#v81-rebirth').click();assert.deepEqual((await state(page)).v82Rare.counts,before.v82Rare.counts);await page.reload({waitUntil:'load'});assert.deepEqual((await state(page)).v82Rare.counts,before.v82Rare.counts);assert.equal((await state(page)).v82Rare.highest,150);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('museum bundled public-domain painting loads with external services unavailable',async page=>{
      await page.locator('#v68-shortcut-menu').click();await page.locator('#artMuseumBtn').click();await page.locator('#artMuseumRedeem').click();assert.equal((await state(page)).artOffers.some(o=>o.id==='moma-starry-night'),true);
      await page.locator('.art-buy').first().click();await page.locator('.art-empty-slot:enabled').first().click();const image=page.locator('.art-gallery-frame img').first();await image.scrollIntoViewIfNeeded();await waitImage(image);assert.ok(await image.evaluate(n=>n.naturalWidth>0));assert.equal((await state(page)).artCollection['moma-starry-night'].title,'星月夜');await page.screenshot({path:path.join(artifacts,'museum-bundled.png')});
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,coins:100000,artMuseumWelcome:true,artTickets:1}))}});
    await check('museum repairs failed MET images and cached owned paintings survive offline reload',async page=>{
      const jpeg=fs.readFileSync(path.join(root,'art/starry-night.jpg'));let offline=false;
      await page.route('https://images.metmuseum.org/**',route=>offline||route.request().url().includes('broken')?route.abort():route.fulfill({status:200,headers:{'Content-Type':'image/jpeg','Access-Control-Allow-Origin':'*'},body:jpeg}));
      await page.route('https://collectionapi.metmuseum.org/public/collection/v1/objects/1',route=>route.fulfill({json:{isPublicDomain:true,primaryImageSmall:'https://images.metmuseum.org/repaired.jpg'},headers:{'Access-Control-Allow-Origin':'*'}}));
      await page.locator('#v68-shortcut-menu').click();await page.locator('#artMuseumBtn').click();const retry=page.locator('.art-image-status button').first();await retry.waitFor({state:'visible'});await retry.click();await waitImage(page.locator('.art-gallery-frame img').first());
      assert.equal((await state(page)).artCollection['met-1'].image,'https://images.metmuseum.org/repaired.jpg');assert.equal((await state(page)).artCollection['met-1'].purchasedFor,777);
      for(let i=0;i<100;i++){if(await page.evaluate(async()=>{const c=await caches.open('001-art-images-v82');return (await c.keys()).length>0;}))break;await new Promise(r=>setTimeout(r,20));}
      assert.equal(await page.evaluate(async()=>{const c=await caches.open('001-art-images-v82');return (await c.keys()).length>0;}),true);
      offline=true;await page.reload({waitUntil:'load'});await page.locator('#v68-shortcut-menu').click();await page.locator('#artMuseumBtn').click();await waitImage(page.locator('.art-gallery-frame img').first());assert.equal((await state(page)).artRooms[0].slots[0].id,'met-1');
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,artV56Migrated:true,artMuseumWelcome:true,artTickets:0,artCollection:{'met-1':{id:'met-1',museum:'met',title:'保存済み作品',artist:'作者',date:'1900',image:'https://images.metmuseum.org/broken.jpg',source:'https://www.metmuseum.org/art/collection/search/1',purchasedFor:777}},artRooms:[{id:'studio',slots:[{id:'met-1',frame:'oak'},null,null,null,null,null]}],artRoomActive:'studio',artFramesOwned:['bare','oak']}))}});
    await check('151 species have unique identities and searchable drops without losing old trophies',async page=>{
      const all=await page.evaluate(()=>__infinityTest.catalog());assert.equal(all.length,151);for(const key of ['id','name','drop'])assert.equal(new Set(all.map(x=>x[key])).size,151);
      assert.equal((await state(page)).v80Relics.counts.ashkeeper,4);
      await page.locator('#v68-shortcut-menu').click();await page.locator('#v68-menu-permanent').click();await page.locator('#v81-enemy-search').fill('霧市の墓守犬');assert.match(await page.locator('#v81-enemy-count').innerText(),/^1 \/ 151/);
      assert.equal(await page.locator('#v68-pane-permanent article:visible').count(),1);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,v80Relics:{counts:{ashkeeper:4}}}))}});
    await check('hunting fixes enemy strength and rewards without progressing or farming bosses',async page=>{
      await page.evaluate(()=>{__infinityTest.patch({lv:100,wins:5,bosses:{},v81Hunt:{enabled:true,target:'ashkeeper',kills:0,runKills:0}});Math.random=()=>0;});await config(page,{explore:false,combat:true,boss:false,reward:false,speed:4});const before=await state(page);
      await page.locator('#v68-auto-main').click();for(let i=0;i<8;i++){await page.clock.runFor(1000);const e=(await page.evaluate(()=>__infinityTest.fight())).e;assert.equal(e.hunt,true);assert.equal(e.stage,1);assert.equal(e.hp,18);assert.equal(e.atk,2);assert.equal(e.boss,false);assert.equal(e.metal,false);}
      const after=await state(page);assert.equal(after.wins,5);assert.ok(after.v81Hunt.runKills>=3);assert.deepEqual(after.bosses,{});assert.equal(after.pendingBossReward,0);assert.equal(after.coins,before.coins);assert.ok(after.boxes>before.boxes);assert.ok(after.v80Relics.counts.ashkeeper>before.v80Relics.counts.ashkeeper);
      await page.locator('#v68-auto-main').click();await page.evaluate(()=>{const h=__infinityTest.state().v81Hunt;h.enabled=false;__infinityTest.patch({v81Hunt:h});});const next=await page.evaluate(()=>__infinityTest.nextEnemy());assert.equal(next.stage,6);assert.equal(next.boss,true);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('hunt selection applies next battle, respects unlocks and persists on reload',async page=>{
      await page.evaluate(()=>__infinityTest.patch({lv:100,wins:0}));await config(page,{combat:true,explore:false});await page.locator('#v68-auto-main').click();await page.clock.runFor(1000);const initial=await page.evaluate(()=>__infinityTest.fight());await page.locator('#v81-hunt-enabled').check();assert.equal((await page.evaluate(()=>__infinityTest.fight())).e.hunt,initial.e.hunt);assert.equal(await page.locator('#v81-hunt-target option').count(),1);
      await page.clock.runFor(4000);assert.equal((await state(page)).wins,1);assert.equal((await page.evaluate(()=>__infinityTest.fight())).e.hunt,true);await page.locator('#v68-auto-main').click();
      await page.evaluate(()=>{const h=__infinityTest.state().v81Hunt;h.target='star-jelly';__infinityTest.patch({wins:150,v81Hunt:h});__infinityTest.save();});await page.reload({waitUntil:'load'});assert.equal((await state(page)).v81Hunt.target,'star-jelly');assert.equal(await page.locator('#v81-hunt-target option').count(),147);assert.equal((await page.evaluate(()=>__infinityTest.huntTarget())).stage,147);
      await page.evaluate(()=>__infinityTest.patch({wins:0}));assert.equal((await page.evaluate(()=>__infinityTest.huntTarget())).stage,1);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('box count updates beside the box shortcut and large counts fit a phone',async page=>{
      await page.evaluate(()=>{__infinityTest.patch({boxes:42});Math.random=()=>.5;});assert.equal(await page.locator('#v81-box-nav-count').innerText(),'42');await page.locator('#v68-shortcut-gear').click();await page.locator('#open').click();assert.equal(await page.locator('#v81-box-nav-count').innerText(),'41');await closeLibrary(page);
      await page.evaluate(()=>__infinityTest.patch({boxes:1e30}));assert.match(await page.locator('#v68-shortcut-gear').getAttribute('title'),/1e\+30/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    },{context:{viewport:{width:320,height:568}},seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('main rebirth button explains unlocks and preserves permanent growth on confirmed reset',async page=>{
      const rect=await page.locator('#v81-rebirth').boundingBox();assert.ok(rect.width>=44&&rect.height>=44&&rect.x>=0&&rect.x+rect.width<=320);await page.locator('#v81-rebirth').click();assert.equal(await page.locator('#v68-pane-rebirth').isVisible(),true);assert.equal((await state(page)).rebirth,0);await closeLibrary(page);
      await page.evaluate(()=>{__infinityTest.readBook(1);const b=__infinityTest.state().v76Buildings;b.levels.market=2;__infinityTest.patch({lv:25,v76Buildings:b,v81Hunt:{enabled:true,target:'mist-hound',kills:12,runKills:7}});});const before=await state(page);page.once('dialog',d=>d.accept());await page.locator('#v81-rebirth').click();const after=await state(page);assert.equal(after.rebirth,1);assert.equal(after.v76Buildings.levels.market,0);assert.deepEqual(after.v80Knowledge,before.v80Knowledge);assert.deepEqual(after.v80Relics,before.v80Relics);assert.equal(after.v81Hunt.kills,12);assert.equal(after.v81Hunt.runKills,0);assert.equal(after.v81Hunt.target,'ashkeeper');assert.equal((await runtime(page)).running,false);
    },{context:{viewport:{width:320,height:568}},seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('footer removes buildings and labels the shared box and gear entry', async page => {
      assert.equal(await page.locator('#v76-shortcut-buildings').count(),0);
      assert.match(await page.locator('#v68-shortcut-gear').innerText(),/箱.*装備/s);
      await page.locator('#v68-shortcut-gear').click();assert.equal(await page.locator('#boxpanel').isVisible(),true);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('reading grants a small permanent bonus once and bulk reading respects unlocks and choices', async page => {
      const before=await state(page),baseline=await page.evaluate(()=>__infinityTest.permanent('production'));
      await page.evaluate(()=>__infinityTest.readBook(1));const first=await page.evaluate(()=>__infinityTest.permanent('production'));
      assert.ok(Math.abs(first-baseline-.0001)<1e-10);
      await page.evaluate(()=>__infinityTest.readBook(1));assert.equal(await page.evaluate(()=>__infinityTest.permanent('production')),first);
      await page.locator('#v68-shortcut-books').click();await page.locator('#backbooks').click();await page.locator('#v80-read-all-books').click();
      let actual=await state(page);assert.deepEqual(actual.v80Knowledge.books,{'0':true,'1':true,'2':true});assert.deepEqual(actual.novels,before.novels);assert.deepEqual(actual.choices,before.choices);assert.equal(actual.paper,before.paper);
      assert.equal(await page.locator('#v80-read-all-books').isDisabled(),true);
      const bulk=await page.evaluate(()=>__infinityTest.permanent('production'));assert.ok(Math.abs(bulk-first-.0001)<1e-10);
      await page.evaluate(()=>__infinityTest.readAll('books'));assert.equal(await page.evaluate(()=>__infinityTest.permanent('production')),bulk);
      await page.reload({waitUntil:'load'});assert.equal(await page.evaluate(()=>__infinityTest.permanent('production')),bulk);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,novels:{1:true,2:true}}))}});
    await check('legacy read evidence is credited without granting unread or locked books', async page => {
      const actual=await state(page);assert.deepEqual(actual.v80Knowledge.books,{'0':true,'1':true});assert.equal(actual.v80Knowledge.diaries['3'],true);
      assert.equal(Object.keys(actual.v80Knowledge.books).length,2);assert.equal(actual.novels['4'],true);assert.equal(actual.v80Knowledge.books['4'],undefined);
      assert.equal(actual.customHistory.note,'unknown fields survive');
      assert.ok(Math.abs(await page.evaluate(()=>__infinityTest.permanent('production'))-1.0003)<1e-10);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,novels:{1:true,4:true},dreamDiary:{read:{3:true},stamps:{}},dualWorld:{...fixture().dualWorld,records:{classic:{novel:2,seenNovels:{1:true}},dream:{diary:1}}}}))}});
    await check('legacy auto-selected branches do not disable bulk reading before novel progress is recorded', async page => {
      const bonus=await page.evaluate(()=>__infinityTest.permanent('production'));assert.equal(Object.keys((await state(page)).v80Knowledge.books).length,3);
      await page.locator('#v68-shortcut-books').click();assert.equal(await page.locator('#v80-read-all-books').isEnabled(),true);await page.locator('#v80-read-all-books').click();
      const after=await state(page);assert.equal(after.dualWorld.records.classic.novel,3);assert.equal(await page.evaluate(()=>__infinityTest.permanent('production')),bonus);assert.equal(await page.locator('#v80-read-all-books').isDisabled(),true);
      await page.evaluate(()=>__infinityTest.readAll('books'));assert.equal((await state(page)).dualWorld.records.classic.novel,3);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,novels:{1:true,2:true},choices:{0:1,1:0,2:1},dualWorld:{...fixture().dualWorld,records:{classic:{novel:1,seenNovels:{0:true}},dream:{}}}}))}});
    await check('all-read diary convenience grants knowledge without stamping or choosing branches', async page => {
      await page.evaluate(()=>__infinityTest.switchWorld('dream'));await page.locator('#v68-shortcut-books').click();await page.locator('#v80-read-all-diaries').click();
      const actual=await state(page);assert.equal(Object.keys(actual.dreamDiary.read).length,777);assert.equal(Object.keys(actual.v80Knowledge.diaries).length,777);assert.deepEqual(actual.dreamDiary.stamps,{});
      const bonus=await page.evaluate(()=>__infinityTest.permanent('production'));await page.evaluate(()=>__infinityTest.readAll('diaries'));assert.equal(await page.evaluate(()=>__infinityTest.permanent('production')),bonus);
      assert.equal((await state(page)).dualWorld.records.dream.diary,actual.dualWorld.records.dream.diary);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('enemy name and unique drop preview agree with the actual trophy and resolve only once', async page => {
      await page.evaluate(()=>{const stats=__infinityTest.balance().combat;__infinityTest.setFight({e:{stage:1,hp:1,atk:0,boss:false,metal:false,mech:''},hp:stats.hp,max:stats.hp,ehp:1,last:Date.now(),active:true,v77Tactic:'attack'});Math.random=()=>0;});
      assert.match(await page.locator('#foe').innerText(),/煤の門番/);assert.match(await page.locator('#v80-enemy-drop').innerText(),/煤けた門鍵.*8%/);
      const before=await page.evaluate(()=>__infinityTest.permanent('hp'));await page.evaluate(()=>__infinityTest.turnBattle());
      let actual=await state(page);assert.equal(actual.v80Relics.counts.ashkeeper,1);assert.ok(Math.abs(await page.evaluate(()=>__infinityTest.permanent('hp'))-before-.005)<1e-10);
      assert.equal(await page.evaluate(()=>__infinityTest.resolveDrop()),false);assert.equal((await state(page)).v80Relics.counts.ashkeeper,1);
      assert.match(await page.locator('#v80-drop-notice').innerText(),/煤けた門鍵/);
      await page.locator('#v68-shortcut-menu').click();await page.locator('#v68-menu-permanent').click();assert.match(await page.locator('#v68-pane-permanent').innerText(),/煤けた門鍵.*所持 1/);
      await page.reload({waitUntil:'load'});assert.equal((await state(page)).v80Relics.counts.ashkeeper,1);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('ordinary drops can miss and bosses guarantee their species trophy without changing base rewards', async page => {
      const data=await page.evaluate(()=>{
        const stats=__infinityTest.balance().combat;const seed=(boss,mech)=>__infinityTest.setFight({e:{stage:6,hp:1,atk:0,boss,metal:false,mech},hp:stats.hp,max:stats.hp,ehp:1,last:Date.now(),active:true,v77Tactic:'attack'});
        Math.random=()=>.99;seed(false,'');__infinityTest.turnBattle();const ordinary=__infinityTest.state().v80Relics.counts;
        seed(true,'⛓️ 装備封印');__infinityTest.turnBattle();const boss=__infinityTest.state();return {ordinary,boss};
      });assert.ok(Object.values(data.ordinary).every(n=>n===0));assert.equal(data.boss.v80Relics.counts.chainking,1);assert.equal(data.boss.pendingBossReward,6);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('knowledge and duplicate trophy growth survive rebirth while run buildings reset', async page => {
      await page.evaluate(()=>{__infinityTest.readBook(1);const relics=__infinityTest.state().v80Relics;relics.counts.ashkeeper=4;const b=__infinityTest.state().v76Buildings;b.levels.market=3;__infinityTest.patch({lv:25,v80Relics:relics,v76Buildings:b});});await page.clock.runFor(500);
      const before=await state(page),hp=await page.evaluate(()=>__infinityTest.permanent('hp'));assert.ok(hp>1.01);
      page.once('dialog',dialog=>dialog.accept());await page.evaluate(()=>document.getElementById('prestige').click());
      let after=await state(page);assert.deepEqual(after.v80Knowledge,before.v80Knowledge);assert.deepEqual(after.v80Relics,before.v80Relics);assert.equal(after.v76Buildings.levels.market,0);assert.equal(await page.evaluate(()=>__infinityTest.permanent('hp')),hp);
      await page.reload({waitUntil:'load'});assert.deepEqual((await state(page)).v80Knowledge,before.v80Knowledge);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('ten buildings are on the main screen and town shortcut never opens a modal', async page => {
      assert.equal(await page.locator('#v78-town #v76-buildings').count(),1);
      assert.equal(await page.locator('#v78-building-cards article').count(),10);
      await openTown(page);assert.equal(await page.locator('#v78-town').evaluate(n=>n.open),true);
      assert.equal(await page.locator('#v68-library').evaluate(n=>n.open),false);
      await page.locator('#v76-buy-dojo').click();const after=await state(page);assert.equal(after.v76Buildings.levels.dojo,1);assert.equal(after.n,12345-2400);
      assert.equal(await page.locator('#v68-library').evaluate(n=>n.open),false);
      await page.locator('#v68-shortcut-menu').click();await page.locator('#v68-menu-buildings').click();
      assert.equal(await page.locator('#v68-library').evaluate(n=>n.open),false);assert.equal(await page.locator('#v76-buildings').isVisible(),true);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('buildings strengthen combat and dream departures without granting again on reload', async page => {
      const stats=await page.evaluate(()=>{
        const old=__infinityTest.balance();const buildings=__infinityTest.state().v76Buildings;buildings.levels.dojo=25;buildings.levels.clinic=25;buildings.levels.observatory=25;
        __infinityTest.patch({v76Buildings:buildings});const next=__infinityTest.balance();return {old,next,rates:__infinityTest.buildingRates()};
      });
      assert.ok(Math.abs(stats.next.combat.attack/stats.old.combat.attack-(1+.06*25**.85))<1e-9);assert.ok(Math.abs(stats.next.combat.healing/stats.old.combat.healing-(1+.12*25**.85))<1e-9);
      assert.equal(stats.next.combat.hp,stats.old.combat.hp);assert.equal(stats.next.income,stats.old.income);assert.equal(stats.rates.sparkle,Math.floor(2*25**.85));
      await page.evaluate(()=>{__infinityTest.switchWorld('dream');__infinityTest.startDream();});assert.equal((await state(page)).dualWorld.v64.explore.sparkle,Math.floor(2*25**.85));
      await page.evaluate(()=>__infinityTest.chooseDream(0));const before=await state(page);await page.reload({waitUntil:'load'});
      assert.equal((await state(page)).dualWorld.v64.explore.sparkle,before.dualWorld.v64.explore.sparkle);
      assert.equal((await state(page)).v76Buildings.levels.observatory,25);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('status overlay toggles, tracks live stats, selects all fields and persists settings', async page => {
      assert.equal(await page.locator('#v78-status-overlay').isVisible(),false);
      await page.locator('#v78-hud-toggle').click();assert.equal(await page.locator('#v78-status-overlay').isVisible(),true);
      assert.equal(await page.locator('#v78-hud-toggle').getAttribute('aria-pressed'),'true');
      const rows=await page.evaluate(()=>__infinityTest.hudRows());assert.ok(rows.length>=70);assert.equal(new Set(rows.map(r=>r.key)).size,rows.length);assert.ok(rows.some(r=>r.key==='upgradeGap'));assert.equal(rows.some(r=>r.key==='dust'),false);
      const before=await page.locator('#v78-hud-values').innerText();await page.clock.runFor(1500);assert.notEqual(await page.locator('#v78-hud-values').innerText(),before);
      await page.locator('#v68-shortcut-menu').click();await page.locator('#v68-menu-hud').click();
      await page.locator('#v78-hud-all').click();assert.equal((await state(page)).v78HUD.fields.length,rows.length);
      await page.locator('#v78-hud-position').selectOption('left-bottom');await closeLibrary(page);
      assert.equal(await page.locator('#v78-status-overlay').getAttribute('data-position'),'left-bottom');
      await page.reload({waitUntil:'load'});assert.equal(await page.locator('#v78-status-overlay').isVisible(),true);assert.equal((await state(page)).v78HUD.position,'left-bottom');
      await page.locator('[aria-label="ステータス表示をOFF"]').click();assert.equal(await page.locator('#v78-status-overlay').isVisible(),false);
      await page.reload({waitUntil:'load'});assert.equal(await page.locator('#v78-status-overlay').isVisible(),false);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('status overlay fields can be selected independently without resetting other settings', async page => {
      await page.locator('#v68-shortcut-menu').click();await page.locator('#v68-menu-hud').click();await page.locator('#v78-hud-none').click();
      await page.locator('#v68-pane-hud details').filter({has:page.locator('#v78-hud-field-gems')}).locator('summary').click();
      await page.locator('#v78-hud-field-gems').check();await page.locator('#v78-hud-enabled').check();await closeLibrary(page);
      assert.deepEqual((await state(page)).v78HUD.fields,['gems']);assert.match(await page.locator('#v78-hud-values').innerText(),/ジェム/);assert.doesNotMatch(await page.locator('#v78-hud-values').innerText(),/攻撃力/);
      await page.evaluate(()=>__infinityTest.patch({coins:99}));await page.clock.runFor(1000);assert.match(await page.locator('#v78-hud-values').innerText(),/99/);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('buildings purchase with real money, reject unaffordable purchases and retain focused controls', async page => {
      assert.equal(await page.locator('[data-mode="fast"]').count(),0);
      await openTown(page);assert.equal(await page.locator('#v76-buildings').isVisible(),true);
      assert.equal(await page.locator('#v76-buy-market').isEnabled(),true);
      await page.locator('#v76-buy-market').click();
      let actual=await state(page);assert.equal(actual.v76Buildings.levels.market,1);assert.equal(actual.n,12345-120);
      assert.equal(await page.evaluate(()=>__infinityTest.buildingCost('market')),Math.ceil(120*2**1.75));
      await page.evaluate(()=>__infinityTest.patch({n:0}));
      assert.equal(await page.locator('#v76-buy-market').isDisabled(),true);
      assert.equal(await page.evaluate(()=>__infinityTest.buyBuilding('market')),false);
      assert.equal((await state(page)).v76Buildings.levels.market,1);
      await page.evaluate(()=>__infinityTest.patch({n:100000}));
      await page.locator('#v76-buy-factory').focus();const identity=await page.locator('#v76-buy-factory').evaluate(n=>{window.__buildingButton=n;return n===document.activeElement;});assert.equal(identity,true);
      await page.clock.runFor(1500);assert.equal(await page.locator('#v76-buy-factory').evaluate(n=>n===window.__buildingButton&&n===document.activeElement),true);
      await page.locator('#v76-buy-factory').click();assert.equal((await state(page)).v76Buildings.levels.factory,1);
      assert.equal((await state(page)).v76Buildings.levels.scrap,0);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('building production uses elapsed time, preserves fractional outputs and ignores AUTO speed', async page => {
      const result=await page.evaluate(()=>{
        const before=__infinityTest.state();const out=[];
        for(const speed of [1,2,4]){
          __infinityTest.patch({...before,n:0,boxes:0,paper:0,expeditionFraction:0,v76Buildings:{version:1,levels:{market:1,factory:1,scrap:1,press:1},paperFraction:0,scrapFraction:0}});
          __infinityTest.configure({speed});const income=__infinityTest.income();__infinityTest.step(30);const half=__infinityTest.state();__infinityTest.step(30);const full=__infinityTest.state();
          out.push({income,halfPaper:half.paper,fraction:half.v76Buildings.paperFraction,paper:full.paper,boxes:full.boxes,rates:__infinityTest.buildingRates()});
        }return out;
      });
      assert.deepEqual(result[0],result[1]);assert.deepEqual(result[1],result[2]);
      assert.equal(result[0].halfPaper,0);assert.equal(result[0].fraction,.75);assert.equal(result[0].paper,1);
      assert.ok(result[0].boxes>=69,'The existing sixty seconds of exploration plus nine factory boxes');
      assert.equal(result[0].rates.money,1.2);assert.equal(result[0].rates.scrap,3/60);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,rebirth:0,research:{opening:0,recycling:0,balance:0}}))}});
    await check('buildings survive reload and world change without changing inventory or progress', async page => {
      const before=await state(page);await openTown(page);await page.locator('#v76-buy-press').click();
      await page.evaluate(()=>__infinityTest.step(30));await page.evaluate(()=>__infinityTest.save());
      const saved=await state(page);await page.reload({waitUntil:'load'});
      let actual=await state(page);assert.deepEqual(actual.v76Buildings,saved.v76Buildings);assert.deepEqual(actual.owned,before.owned);assert.deepEqual(actual.savedBuilds,before.savedBuilds);
      await page.evaluate(()=>__infinityTest.switchWorld('dream'));await openTown(page);
      assert.match(await page.locator('#v76-name-press').innerText(),/おてがみ/);assert.equal((await state(page)).v76Buildings.levels.press,1);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('retired condition never affects income or combat and is absent from the HUD', async page => {
      const values=await page.evaluate(()=>{
        const out=[];for(const h of [0,20,100])for(const mode of ['fast','rest']){__infinityTest.patch({h,mode});out.push({income:__infinityTest.income(),combat:__infinityTest.balance().combat});}return out;
      });
      for(const row of values)assert.deepEqual(row,values[0]);
      assert.doesNotMatch(await page.locator('#v68-stats').innerText(),/調子/);
      assert.equal(await page.locator('#health').count(),0);
      await page.evaluate(()=>__infinityTest.patch({h:0,mode:'rest'}));
      await page.clock.runFor(1500);assert.equal((await runtime(page)).running,true);
      assert.equal((await page.evaluate(()=>__infinityTest.fight())).v68AutoOwned,true);
    },{nativeAutomatic:true,seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('malformed building fields normalize without touching existing assets or unknown state', async page => {
      const actual=await state(page);assert.equal(actual.n,12345);assert.equal(actual.v76Buildings.levels.market,0);
      assert.equal(actual.v76Buildings.levels.factory,999);assert.equal(actual.v76Buildings.levels.scrap,0);
      assert.equal(actual.v76Buildings.paperFraction,0);assert.equal(actual.v76Buildings.scrapFraction,0);
      assert.equal(actual.v76Buildings.custom,'preserve');assert.equal(actual.customHistory.note,'unknown fields survive');
      await page.evaluate(()=>__infinityTest.step(1));assert.ok(Number.isFinite((await state(page)).n));
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,v76Buildings:{levels:{market:'bad',factory:999,scrap:-3,press:null},paperFraction:'bad',scrapFraction:-2,custom:'preserve'}}))}});
    await check('offline building production credits elapsed time once without background combat', async page => {
      const before=await state(page);
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      await page.clock.runFor(60000);assert.equal((await state(page)).boxes,before.boxes);
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
      let after=await state(page);assert.equal(after.boxes-before.boxes,69);assert.equal(after.paper-before.paper,1);assert.equal(after.empty-before.empty,3);
      assert.equal(after.wins,before.wins);
      await page.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pageshow'));});
      const repeated=await state(page);assert.equal(repeated.boxes,after.boxes);assert.equal(repeated.paper,after.paper);assert.equal(repeated.empty,after.empty);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,autoPlayPaused:true,rebirth:0,research:{opening:0,recycling:0,balance:0},v76Buildings:{levels:{market:0,factory:1,scrap:1,press:1},paperFraction:0,scrapFraction:0}}))}});
    await check('buildings grow beyond old caps and numeric precision guards never charge for invalid upgrades', async page => {
      await page.evaluate(()=>{const b=__infinityTest.state().v76Buildings;for(const key of Object.keys(b.levels))b.levels[key]=25;__infinityTest.patch({v76Buildings:b});__infinityTest.patch({n:__infinityTest.quoteBuilding('market',100)*2});});
      const before=await page.evaluate(()=>__infinityTest.buildingRates());
      assert.equal(await page.evaluate(()=>__infinityTest.buyBuilding('market',100)),true);assert.equal((await state(page)).v76Buildings.levels.market,125);
      assert.ok((await page.evaluate(()=>__infinityTest.buildingRates())).money>before.money);
      await page.evaluate(()=>{const b=__infinityTest.state().v76Buildings;for(const key of Object.keys(b.levels))b.levels[key]=1000;__infinityTest.patch({v76Buildings:b});});
      const high=await page.evaluate(()=>__infinityTest.buildingRates());for(const key of Object.keys(before))assert.ok(high[key]>before[key],key+' keeps growing past Lv25');
      await page.evaluate(()=>{__infinityTest.switchWorld('dream');__infinityTest.startDream();});const sparkle=(await state(page)).dualWorld.v64.explore.sparkle;assert.ok(sparkle>100);
      await page.reload({waitUntil:'load'});assert.equal((await state(page)).dualWorld.v64.explore.sparkle,sparkle);
      await page.evaluate(()=>{const b=__infinityTest.state().v76Buildings;b.levels.market=Number.MAX_SAFE_INTEGER;__infinityTest.patch({v76Buildings:b});});
      const saved=await state(page);assert.equal(await page.evaluate(()=>__infinityTest.buyBuilding('market')),false);assert.equal((await state(page)).n,saved.n);
      assert.equal(await page.evaluate(()=>__infinityTest.buyBuilding('missing')),false);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('bulk purchases charge exact sequential prices and insufficient funds never partially buy', async page => {
      await page.evaluate(()=>__infinityTest.patch({n:1e9}));await openTown(page);await page.locator('#v79-building-batch').selectOption('10');
      const price=await page.evaluate(()=>__infinityTest.quoteBuilding('market',10));
      assert.ok(Math.abs(price-Array.from({length:10},(_,i)=>Math.ceil(120*(i+1)**1.75)).reduce((a,b)=>a+b,0))<1e-8);
      await page.locator('#v76-buy-market').click();assert.equal((await state(page)).v76Buildings.levels.market,10);assert.equal((await state(page)).n,1e9-price);
      await page.evaluate(()=>__infinityTest.patch({n:119}));const before=await state(page);
      assert.equal(await page.evaluate(()=>__infinityTest.buyBuilding('factory',100)),false);assert.equal((await state(page)).n,before.n);assert.equal((await state(page)).v76Buildings.levels.factory,0);
      await page.reload({waitUntil:'load'});assert.equal((await state(page)).v76Buildings.levels.market,10);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('all ten buildings use distinct names in both worlds and old levels do not reset on load', async page => {
      const before=(await state(page)).v76Buildings.levels;const names=await page.locator('#v78-building-cards h3').allTextContents();assert.equal(new Set(names).size,10);
      await page.evaluate(()=>__infinityTest.switchWorld('dream'));const dream=await page.locator('#v78-building-cards h3').allTextContents();assert.equal(new Set(dream).size,10);
      for(let i=0;i<10;i++)assert.notEqual(names[i],dream[i]);
      await page.evaluate(()=>__infinityTest.save());await page.reload({waitUntil:'load'});assert.deepEqual((await state(page)).v76Buildings.levels,before);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,v76Buildings:{version:1,levels:{market:25,factory:12,scrap:3,press:7,dojo:4,clinic:1,observatory:9},paperFraction:.4,scrapFraction:.7}}))}});
    await check('large guild rewards queue remaining boxes and storage does not truncate above the old cap', async page => {
      const result=await page.evaluate(()=>{Math.random=()=>.5;const b=__infinityTest.state().v76Buildings;b.levels.guild=1000000;__infinityTest.patch({boxes:0,opened:0,autoOpen:true,v76Buildings:b});const gained=__infinityTest.gainBoxes();return {gained,state:__infinityTest.state()};});
      assert.ok(result.gained>120);assert.equal(result.state.opened,120);assert.equal(result.state.boxes+result.state.opened,result.gained);
      await page.evaluate(()=>{__infinityTest.patch({boxes:1e9+5,autoOpen:false});__infinityTest.step(1);});assert.ok((await state(page)).boxes>1e9+5);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('fortress increases max HP and exchange gems are granted only once for a real boss', async page => {
      const data=await page.evaluate(()=>{const old=__infinityTest.balance();const b=__infinityTest.state().v76Buildings;b.levels.fortress=1;b.levels.exchange=1;__infinityTest.patch({v76Buildings:b,wins:5,bosses:{},lv:25,boxes:0});return {old,boost:__infinityTest.balance()};});
      assert.ok(data.boost.combat.hp>data.old.combat.hp);
      const coins=(await state(page)).coins;await config(page,{explore:false,combat:true,boss:true,reward:false});await page.locator('#v68-auto-main').click();
      for(let tick=0;tick<40&&(await state(page)).pendingBossReward===0;tick++)await page.clock.runFor(500);
      assert.equal((await state(page)).pendingBossReward,6);assert.equal((await state(page)).coins,coins+6);
      await page.clock.runFor(4000);assert.equal((await state(page)).coins,coins+6);
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('automatic defaults replace obsolete flags; speed and explicit stop survive reload', async page => {
      for(const selector of ['#auto','[data-mode="fast"]','[data-mode="rest"]','#v68-auto-settings-open','[data-v68-panel="auto"]'])assert.equal(await page.locator(selector).count(),0);
      assert.deepEqual((await state(page)).v68Auto,{explore:true,combat:true,boss:true,reward:true,speed:1,theater:true});
      await page.locator('#v68-auto-speed').selectOption('4');
      await page.clock.runFor(1000);assert.equal((await runtime(page)).running,true);
      await page.locator('#v68-auto-main').click();assert.equal((await state(page)).autoPlayPaused,true);
      await page.reload({waitUntil:'load'});await page.clock.runFor(2000);
      assert.equal((await state(page)).v68Auto.speed,4);assert.equal((await runtime(page)).running,false);
      await page.locator('#v68-auto-main').click();assert.equal((await runtime(page)).running,true);
    }, {nativeAutomatic:true,seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,v68Auto:{explore:false,combat:false,boss:false,reward:false,theater:false,speed:1}}))}});
    await check('fresh world waits for selection and tutorial, then starts battle automatically', async page => {
      await page.clock.runFor(3000);assert.equal(await page.evaluate(()=>__infinityTest.fight()),null);
      await chooseWorld(page,'classic');await page.clock.runFor(1500);
      assert.equal((await runtime(page)).running,true);assert.equal((await page.evaluate(()=>__infinityTest.fight())).v68AutoOwned,true);
      await page.screenshot({path:path.join(artifacts,'native-automatic-classic.png')});
      await page.evaluate(()=>{__infinityTest.initAuto();__infinityTest.initAuto();});
      await page.locator('#v68-auto-main').click();await page.clock.runFor(5000);assert.equal((await runtime(page)).running,false);
    },{nativeAutomatic:true});
    await check('dream starts automatically and details suspend then resume exploration', async page => {
      await chooseWorld(page,'dream');await page.locator('#v68-auto-speed').selectOption('4');await page.clock.runFor(12000);
      const before=await state(page);assert.ok(before.dualWorld.v64.completed>=1);assert.ok(before.dualWorld.v64.runs>=2);
      await page.locator('#v68-shortcut-gear').click();assert.equal((await runtime(page)).paused,true);
      const paused=(await state(page)).dualWorld.v64.explore;await page.clock.runFor(5000);
      assert.deepEqual((await state(page)).dualWorld.v64.explore,paused);
      await closeLibrary(page);await page.clock.runFor(1000);assert.equal((await runtime(page)).running,true);
      await page.screenshot({path:path.join(artifacts,'native-automatic-dream.png')});
      await page.locator('#v63-world-switch').click();await page.locator('[data-v63-pick="classic"]').click();
      await page.clock.runFor(1500);assert.equal((await runtime(page)).running,true);
      assert.equal((await page.evaluate(()=>__infinityTest.fight())).v68AutoOwned,true);
    },{nativeAutomatic:true});
    await check('retired condition does not delay automatic battles or modify old save assets', async page => {
      const before=await state(page);assert.equal(before.auto,false);assert.equal(before.h,20);
      await page.clock.runFor(16000);const after=await state(page);
      assert.equal(after.h,20);assert.ok(after.wins>before.wins);assert.equal(after.customHistory.note,'unknown fields survive');assert.deepEqual(after.savedBuilds,before.savedBuilds);
      assert.equal(after.shop.mondrian,1);assert.ok(after.dualWorld.records.dream.rest>=before.dualWorld.records.dream.rest);
    },{nativeAutomatic:true,seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,auto:true,h:20}))}});
    await check('idempotent AUTO binding and one-tap manual return from theater', async page => {
      await config(page, {combat: true, explore: false, theater: true});
      await page.evaluate(() => {__infinityTest.initAuto();__infinityTest.initAuto();});
      await page.locator('#v68-auto-main').click();
      assert.equal((await runtime(page)).running, true, 'Duplicate click listeners would undo the start');
      assert.equal(documentBodyTheater(await page.locator('body').getAttribute('class')), true);
      await page.locator('#v68-auto-manual').click();
      assert.equal((await runtime(page)).running, false);
      assert.equal(documentBodyTheater(await page.locator('body').getAttribute('class')), false);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('combat AUTO is independent, pause freezes owned fight, manual input pauses before action', async page => {
      await config(page, {combat: true, explore: false});
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(1000);
      const active = await page.evaluate(() => __infinityTest.fight());
      assert.equal(active.active, true);
      assert.equal(active.v68AutoOwned, true);
      await page.locator('#v68-auto-pause').click();
      assert.equal((await runtime(page)).paused, true);
      const frozen = await page.evaluate(() => __infinityTest.fight());
      await page.clock.runFor(4000);
      const later = await page.evaluate(() => __infinityTest.fight());
      assert.equal(later.ehp, frozen.ehp);
      assert.equal(later.hp, frozen.hp);
      await page.locator('#v68-auto-pause').click();
      assert.equal((await runtime(page)).paused, false);
      await page.evaluate(() => document.getElementById('v68-shortcut-gear').click());
      assert.equal((await runtime(page)).paused, true);
      assert.equal(await page.locator('#boxpanel').isVisible(),true);
      await closeLibrary(page);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('classic exploration AUTO collects a real box without enabling combat and stops cleanly', async page => {
      await page.evaluate(()=>{window.__originalRandom=Math.random;Math.random=()=>.5;});
      await config(page,{combat:false,explore:true});
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(1000);
      const opened=await state(page);
      assert.equal(opened.opened,1);
      assert.equal(opened.discoveredGear['21'],true,'Existing rarity and gear draw are used');
      assert.equal(await page.evaluate(()=>__infinityTest.fight()),null);
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(2500);
      assert.equal((await state(page)).opened,1);
      await page.evaluate(()=>{Math.random=window.__originalRandom;});
    }, {seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('combat AUTO repeatedly clicks next battle and resource explanations remain available', async page => {
      await page.evaluate(()=>{__infinityTest.patch({lv:25,wins:0});window.__nextBattleClicks=0;document.getElementById('attack').addEventListener('click',()=>window.__nextBattleClicks++);});
      await config(page,{combat:true,explore:false,boss:false});
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(12000);
      const current=await state(page);
      assert.ok(current.wins>=3,'AUTO must advance through multiple genuine victories');
      assert.ok(await page.evaluate(()=>window.__nextBattleClicks)>=3,'Next battle button is actually clicked repeatedly');
      for(const id of ['number','rate','v69-wallet-coins','boxes','papercount','emptycount','artTicketCount'])assert.ok((await page.locator('#'+id).getAttribute('title')).length>10,id+' explains its source');
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('explicit boss AUTO OFF prevents entry before the next boss', async page => {
      await config(page, {combat: true, explore: false, boss: false});
      await page.evaluate(() => __infinityTest.patch({wins: 5, bosses: {}}));
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(1500);
      assert.equal(await page.evaluate(() => __infinityTest.fight()), null);
      assert.equal((await state(page)).wins, 5);
      assert.equal((await runtime(page)).paused, true);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('legacy reward guard and duplicate clicks cannot grant rewards twice', async page => {
      await page.evaluate(() => __infinityTest.patch({pendingBossReward: 6, boxes: 10}));
      await config(page, {combat: true, reward: false});
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(1000);
      assert.equal((await state(page)).pendingBossReward, 6);
      assert.equal((await state(page)).v59BattleLog.filter(item=>item.kind==='reward').length,0,'No reward is selected by AUTO while disabled');
      const beforeClaim=(await state(page)).boxes;
      await page.evaluate(() => {const b=document.querySelector('[data-bossreward="boxes"]');b.click();b.click();});
      assert.equal((await state(page)).pendingBossReward, 0);
      assert.equal((await state(page)).boxes, beforeClaim+4);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('enabled boss AUTO runs the original boss and pauses for an unselected reward', async page => {
      await page.evaluate(()=>__infinityTest.patch({wins:5,bosses:{},lv:25,boxes:0,coins:0}));
      await config(page,{combat:true,explore:false,boss:true,reward:false});
      await page.locator('#v68-auto-main').click();
      for(let tick=0;tick<30&&(await state(page)).pendingBossReward===0;tick++)await page.clock.runFor(500);
      const cleared=await state(page);
      assert.equal(cleared.wins,6);
      assert.equal(cleared.bosses['6'],true);
      assert.equal(cleared.pendingBossReward,6);
      assert.equal((await runtime(page)).paused,true);
      assert.ok(cleared.coins>0,'Original boss coin reward applied');
      await config(page,{reward:true});
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(1000);
      const claimed=await state(page);
      assert.equal(claimed.pendingBossReward,0);
      assert.equal(claimed.v59BattleLog.filter(item=>item.kind==='reward').length,1);
    }, {seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('reward AUTO uses the existing reward handler once', async page => {
      await page.evaluate(() => __infinityTest.patch({pendingBossReward: 6, boxes: 10, coins: 0}));
      await config(page, {combat: true, explore: false, reward: true});
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(1000);
      const once = await state(page);
      assert.equal(once.pendingBossReward, 0);
      const rewardLogs = once.v59BattleLog.filter(item => item.kind === 'reward').length;
      assert.equal(rewardLogs, 1);
      await page.clock.runFor(1000);
      assert.equal((await state(page)).v59BattleLog.filter(item => item.kind === 'reward').length, 1);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('defeat pauses AUTO without endless automatic retries', async page => {
      await config(page, {combat: true, explore: false});
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(1000);
      await page.evaluate(() => {const f=__infinityTest.fight();f.active=false;f.hp=0;__infinityTest.setFight(f);});
      await page.clock.runFor(1000);
      assert.equal((await runtime(page)).paused, true);
      const lost = await page.evaluate(() => __infinityTest.fight());
      await page.clock.runFor(5000);
      assert.equal((await page.evaluate(() => __infinityTest.fight())).e.stage, lost.e.stage);
      assert.equal((await page.evaluate(() => __infinityTest.fight())).active, false);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('hidden page pauses AUTO and resuming does not catch up combat turns', async page => {
      await config(page, {combat: true, explore: false});
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(1000);
      const before = await page.evaluate(() => __infinityTest.fight());
      await page.evaluate(() => {Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
      await page.clock.runFor(60000);
      await page.evaluate(() => {Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
      await page.clock.runFor(500);
      assert.equal((await runtime(page)).running, true);
      const after = await page.evaluate(() => __infinityTest.fight());
      assert.equal(after.ehp, before.ehp);
      assert.equal(after.hp, before.hp);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('world switching pauses AUTO and preserves the current classic theme', async page => {
      await config(page, {combat: true, explore: false});
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(1000);
      assert.equal((await page.evaluate(() => __infinityTest.fight())).active, true);
      await page.locator('#v63-world-switch').click();
      await page.locator('[data-v63-pick="dream"]').click();
      assert.equal((await runtime(page)).paused || !(await runtime(page)).running, true);
      assert.equal((await state(page)).theme, 'dream');
      assert.equal((await state(page)).dualWorld.classicTheme, 'navy');
      await page.locator('#v68-auto-manual').click();
      const hiddenFight = await page.evaluate(() => __infinityTest.fight());
      await page.clock.runFor(4000);
      const stillHidden = await page.evaluate(() => __infinityTest.fight());
      assert.equal(stillHidden.ehp, hiddenFight.ehp, 'Manual handoff must not run hidden classic combat in Dream');
      assert.equal(stillHidden.hp, hiddenFight.hp);
      await page.locator('#v63-world-switch').click();
      await page.locator('[data-v63-pick="classic"]').click();
      await page.clock.runFor(1500);
      const visibleFight = await page.evaluate(() => __infinityTest.fight());
      assert.ok(visibleFight.ehp < hiddenFight.ehp, 'Returning to Classic resumes its original manual combat');
      assert.equal((await runtime(page)).running, false);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('speed choices do not multiply passive income or passive exploration rewards', async page => {
      const values = await page.evaluate(() => {
        const original=__infinityTest.state();const random=Math.random;Math.random=()=>.5;const out=[];
        try {for(const speed of [1,2,4]){__infinityTest.patch(JSON.parse(JSON.stringify(original)));__infinityTest.configure({speed});const start=__infinityTest.state();const income=__infinityTest.income();__infinityTest.step(10);const end=__infinityTest.state();out.push({income,n:end.n-start.n,boxes:end.boxes-start.boxes});}}finally{Math.random=random;}
        return out;
      });
      assert.deepEqual(values[1], values[0]);
      assert.deepEqual(values[2], values[0]);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('speed x1/x2/x4 executes one/two/four unchanged combat turns per second', async page => {
      await config(page, {combat: true, explore: false});
      await page.locator('#v68-auto-main').click();
      const hits=[];
      for(const speed of [1,2,4]) {
        await config(page,{speed});
        await page.evaluate(() => __infinityTest.seedFight());
        await page.clock.runFor(1000);
        hits.push((await state(page)).v59BattleLog.filter(item=>item.kind==='strike').length);
      }
      assert.deepEqual(hits,[1,2,4]);
      assert.equal((await state(page)).wins,0, 'No reward or enemy is skipped by speed');
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('dream exploration AUTO completes real choices and reaches the next site', async page => {
      await page.evaluate(() => __infinityTest.switchWorld('dream'));
      await config(page, {combat: false, explore: true, speed: 4});
      await page.locator('#v68-auto-main').click();
      await page.clock.runFor(12000);
      const actual = await state(page);
      assert.ok(actual.dualWorld.v64.completed >= 1, 'At least one genuine seven-step journey completed');
      assert.ok(actual.dualWorld.v64.runs >= 2, 'AUTO must start the next route');
      assert.ok(actual.dualWorld.v64.explore.site > 0 || Object.keys(actual.dualWorld.v64.sites).length > 1, 'Next area selection must advance');
      assert.ok(actual.dualWorld.v64.completed <= actual.dualWorld.v64.runs, 'No duplicate journey rewards');
      await page.locator('#v68-auto-main').click();
      const stopped = (await state(page)).dualWorld.v64.runs;
      await page.clock.runFor(5000);
      assert.equal((await state(page)).dualWorld.v64.runs, stopped);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('prestige retains original collections and pauses AUTO before rebuilding the world', async page => {
      await page.evaluate(() => {__infinityTest.buyBuilding('scrap');__infinityTest.patch({lv:25});});
      // The existing shared loop refreshes prestige availability after level changes.
      await page.clock.runFor(500);
      assert.equal(await page.locator('#prestige').isEnabled(), true);
      await config(page, {explore: true, combat: false});
      await page.locator('#v68-auto-main').click();
      page.once('dialog', dialog => dialog.accept());
      await page.evaluate(() => document.getElementById('prestige').click());
      const actual = await state(page);
      assert.equal(actual.rebirth, 1);
      assert.equal(actual.v76Buildings.levels.scrap,0);
      assert.equal(actual.lv, 1);
      assert.deepEqual(actual.owned, {});
      assert.deepEqual(actual.discoveredGear, {'0': true, '42': true});
      assert.deepEqual(actual.choices, {'0': 1});
      assert.equal(actual.shop.mondrian, 1);
      assert.equal((await runtime(page)).paused || !(await runtime(page)).running, true);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('rebirth resets every building and fraction only after confirmation and preserves a recovery snapshot', async page => {
      await page.evaluate(()=>{const b=__infinityTest.state().v76Buildings;for(const key of Object.keys(b.levels))b.levels[key]=40;b.paperFraction=.8;b.scrapFraction=.6;__infinityTest.patch({lv:25,v76Buildings:b,expeditionFraction:.9});});await page.clock.runFor(500);
      const before=await state(page);page.once('dialog',dialog=>dialog.dismiss());await page.evaluate(()=>document.getElementById('prestige').click());
      assert.deepEqual((await state(page)).v76Buildings,before.v76Buildings);assert.equal((await state(page)).rebirth,before.rebirth);
      let confirmation='';page.once('dialog',dialog=>{confirmation=dialog.message();return dialog.accept();});await page.evaluate(()=>document.getElementById('prestige').click());
      assert.match(confirmation,/建物.*全施設Lv0/);const after=await state(page);assert.ok(Object.values(after.v76Buildings.levels).every(n=>n===0));
      assert.equal(after.v76Buildings.paperFraction,0);assert.equal(after.v76Buildings.scrapFraction,0);assert.equal(after.expeditionFraction,0);
      assert.equal(after.paper,before.paper);assert.equal(after.coins,before.coins);assert.deepEqual(after.discoveredGear,before.discoveredGear);assert.deepEqual(after.dualWorld.records,before.dualWorld.records);
      const backup=await page.evaluate(key=>JSON.parse(JSON.parse(localStorage.getItem(key+'-snapshots'))[0].data),KEY);assert.deepEqual(backup.v76Buildings,before.v76Buildings);
      await page.reload({waitUntil:'load'});assert.ok(Object.values((await state(page)).v76Buildings.levels).every(n=>n===0));
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    await check('carry-book selector retains DOM identity and selection across the shared game loop', async page => {
      await page.evaluate(() => {window.__carryNode=document.getElementById('carrySelect');window.__carryNode.value='1';window.__carryNode.dispatchEvent(new Event('change'));});
      await page.clock.runFor(1500);
      assert.equal(await page.evaluate(() => document.getElementById('carrySelect')===window.__carryNode), true);
      assert.equal(await page.locator('#carrySelect').inputValue(), '1');
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    await check('all original detail routes remain reachable through the compact drawer', async page => {
      await page.locator('#v68-shortcut-menu').click();
      for(const [control,pane] of [['boxes','gear'],['shop','shop'],['cards','cards'],['books','books'],['artMuseumBtn','museum']]) {
        await page.locator('#'+control).click();
        assert.equal(await page.locator('#v68-pane-'+pane).isVisible(),true,control+' opens original content');
        await page.locator('#v68-library-back').click();
      }
      for(const key of ['permanent','hud','dreamjournal','progress','save','settings','rebirth','logs','dopa','extras']) {
        await page.locator('#v68-menu-'+key).click();
        assert.equal(await page.locator('#v68-pane-'+key).isVisible(),true,key+' pane');
        await page.locator('#v68-library-back').click();
      }
      await closeLibrary(page);
      await page.locator('#v54Theme').click();
      assert.equal(await page.locator('#themepanel').isVisible(),true);
      await page.locator('#themeClose').click();
      await page.locator('#v63-world-switch').click();
      await page.locator('[data-v63-pick="dream"]').click();
      await page.locator('#v68-shortcut-books').click();
      assert.equal(await page.locator('#v62-diary-panel').isVisible(),true);
      await page.locator('#v62-close-diary').click();
      assert.equal(await page.locator('#v68-library').evaluate(node=>node.open),false);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
    const bothIntro=fixture({v68Migration:1});
    bothIntro.dualWorld.records.classic={work:33,upgrade:5,win:3,box:33,novel:11,gear:11};
    bothIntro.dualWorld.records.dream={work:33,rest:11,upgrade:5,box:33,diary:77,stamp:11};
    bothIntro.dualWorld.treasures={classic:Array.from({length:11},(_,i)=>i),dream:Array.from({length:11},(_,i)=>i)};
    await check('double-complete linked bonuses remain intact and do not unlock true-completion gate early', async page => {
      let bonus=await page.evaluate(()=>__infinityTest.bonus());
      assert.equal(bonus.both,true);
      assert.equal(bonus.reality,false);
      assert.ok(Math.abs(bonus.income-1.11**3*1.06**2)<1e-10);
      assert.ok(Math.abs(bonus.rest-1.11**2*1.06)<1e-10);
      await page.evaluate(()=>__infinityTest.switchWorld('dream'));
      bonus=await page.evaluate(()=>__infinityTest.bonus());
      assert.ok(Math.abs(bonus.income-1.11**2*1.06**2)<1e-10);
      assert.ok(Math.abs(bonus.rest-1.11**3*1.06)<1e-10);
      assert.equal(bonus.reality,false);
      assert.deepEqual((await state(page)).dualWorld.treasures,bothIntro.dualWorld.treasures);
    }, {seed: {[KEY]:JSON.stringify(bothIntro)}});
    await check('persistent wallet reflects income and spending, keeps number-format interaction', async page => {
      await page.evaluate(()=>__infinityTest.patch({numFormat:'digits'}));
      const displayed = async () => (await page.locator('#number').innerText()).trim();
      const expected = async () => Math.floor((await state(page)).n).toLocaleString('ja-JP');
      assert.equal(await displayed(),await expected(),'Wallet starts with the actual owned money');
      const beforeIncome=(await state(page)).n;
      await page.clock.runFor(1500);
      assert.ok((await state(page)).n>beforeIncome,'Existing income really increases owned money');
      assert.equal(await displayed(),await expected(),'Always-visible number updates after income');
      const beforeSpend=await state(page);
      if(!await page.locator('#upgrade').isVisible())await page.locator('#v68-manual-controls > summary').click();
      await page.locator('#upgrade').click();
      const afterSpend=await state(page);
      assert.equal(afterSpend.lv,beforeSpend.lv+1,'The real upgrade action executes');
      assert.ok(afterSpend.n<beforeSpend.n,'The real upgrade spends money');
      assert.equal(await displayed(),await expected(),'Always-visible number updates immediately after spending');
      const beforeFormat=afterSpend.numFormat;
      await page.locator('#number').click();
      assert.notEqual((await state(page)).numFormat,beforeFormat,'Money still switches the existing number format');
      await assertWallet(page,'income / spending / format switch');
    }, {seed:{[KEY]:JSON.stringify(fixture({v68Migration:1,numFormat:'digits'}))}});
    await check('large balances keep a readable wallet and can switch formats without page overflow', async page => {
      await page.evaluate(()=>__infinityTest.patch({n:1e80,numFormat:'digits'}));
      assert.equal((await page.locator('#number').innerText()).trim(),Math.floor(1e80).toLocaleString('ja-JP'),'Large balances are not replaced with a dummy or ellipsis');
      await assertWallet(page,'large digits balance');
      const dimensions=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
      assert.ok(dimensions.scrollWidth<=dimensions.width,'Large money cannot make the whole page scroll horizontally');
      await page.locator('#number').click();
      await assertWallet(page,'large balance after format switch');
    }, {seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
    for (const world of ['classic', 'dream']) for (const [width, height] of [[320,568],[375,667],[390,844],[430,932]]) {
      await check(`${world} mobile ${width}x${height}: compact progress, available controls, bounded page`, async page => {
        await chooseWorld(page, world);
        const initialWallet=await assertWallet(page,`${world} ${width}px manual`);
        await page.locator('#v68-play').evaluate(node=>{node.scrollTop=node.scrollHeight;});
        const scrolledWallet=await assertWallet(page,`${world} ${width}px scrolled play area`);
        assert.equal(scrolledWallet.box.y,initialWallet.box.y,'Money never scrolls away with the play area');
        await page.locator('#v68-play').evaluate(node=>{node.scrollTop=0;});
        const layout = await page.evaluate(() => {
          const rect=id=>{const b=document.getElementById(id).getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right};};
          return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
            meter:rect('v65-hub'),main:rect('v68-auto-main'),pause:rect('v68-auto-pause'),manual:rect('v68-auto-manual'),speed:rect('v68-auto-speed'),footer:rect('v68-bottom')};
        });
        assert.ok(layout.scrollWidth <= width, 'No horizontal page overflow');
        assert.ok(layout.scrollHeight <= height + 1, 'Basic play must use internal scrolling on short screens');
        assert.ok(layout.meter.height <= 60, `Progress header too tall: ${layout.meter.height}`);
        for (const key of ['main','pause','manual','speed']) {
          const b=layout[key];assert.ok(b.height>=44,`${key} touch target`);assert.ok(b.y>=0&&b.bottom<=height,`${key} stays onscreen`);assert.ok(b.x>=0&&b.right<=width,`${key} does not overflow`);
        }
        const controls=['main','pause','manual','speed'];
        for(let i=0;i<controls.length;i++) for(let j=i+1;j<controls.length;j++) {
          const a=layout[controls[i]],b=layout[controls[j]];
          const overlap=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
          assert.equal(overlap,0,`${controls[i]} and ${controls[j]} touch targets overlap`);
        }
        await config(page,{explore:true,combat:false,theater:true});
        await page.locator('#v68-auto-main').click();
        assert.equal(documentBodyTheater(await page.locator('body').getAttribute('class')),true);
        assert.equal(await page.locator('#v68-manual-controls').evaluate(node=>node.open),false);
        await assertWallet(page,`${world} ${width}px AUTO theater`);
        const head=await page.evaluate(()=>['v63-world-switch','v81-rebirth','v54Theme'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};}));
        for(const r of head)assert.ok(r.width>=44&&r.height>=44&&r.x>=0&&r.right<=width,r.id+' stays usable');
        for(let i=0;i<head.length;i++)for(let j=i+1;j<head.length;j++)assert.equal(Math.max(0,Math.min(head[i].right,head[j].right)-Math.max(head[i].x,head[j].x))*Math.max(0,Math.min(head[i].bottom,head[j].bottom)-Math.max(head[i].y,head[j].y)),0,'Header touch targets do not overlap');
        const textFonts=await page.evaluate(()=>['v68-stats','v68-auto-status','v68-auto-main','v68-auto-pause','v68-auto-manual','v68-auto-speed','v68-shortcut-gear','v68-shortcut-books','v68-shortcut-progress','v68-shortcut-menu'].map(id=>({id,font:Number.parseFloat(getComputedStyle(document.getElementById(id)).fontSize)})));
        for(const value of textFonts)assert.ok(value.font>=14,`${world} ${width}px ${value.id} does not shrink essential text below14px (got ${value.font})`);
        const stop=await page.locator('#v68-auto-main').boundingBox();
        assert.ok(stop.y>=0&&stop.y+stop.height<=height,'Theater stop remains available');
        await page.locator('#v68-auto-manual').click();
        assert.equal(documentBodyTheater(await page.locator('body').getAttribute('class')),false);
        await assertWallet(page,`${world} ${width}px returned to manual`);
        assert.equal(await page.locator('#v68-shortcut-books').innerText(),world==='dream'?'日記':'書庫');
        await openTown(page);assert.equal(await page.locator('#v76-buildings').isVisible(),true);
        assert.match(await page.locator('#v69-wallet-label').innerText(),/所持金/);
        const panelWidth=await page.locator('#v76-buildings').evaluate(n=>({scroll:n.scrollWidth,width:n.clientWidth}));assert.ok(panelWidth.scroll<=panelWidth.width,'Town does not overflow horizontally');
        await page.screenshot({path:path.join(artifacts,`buildings-${world}-${width}.png`)});await closeLibrary(page);
        await page.locator('#v68-shortcut-progress').click();
        assert.equal(await page.locator('#v68-library').evaluate(node=>node.open),true);
        assert.equal(await page.locator('#v65-details').isVisible(),true);
        assert.equal(await page.locator('#v63-world-dashboard').isVisible(),true);
        await closeLibrary(page);
        await page.locator('#v68-shortcut-menu').click();
        assert.equal(await page.locator('#v54nav').isVisible(),true);
        await closeLibrary(page);
        await page.locator('#v78-hud-toggle').click();assert.equal(await page.locator('#v78-status-overlay').isVisible(),true);
        const overlay=await page.locator('#v78-status-overlay').boundingBox(),toggle=await page.locator('#v78-hud-toggle').boundingBox(),footer=await page.locator('#v68-bottom').boundingBox();
        assert.ok(overlay.x>=0&&overlay.x+overlay.width<=width&&overlay.y>=0&&overlay.y+overlay.height<=footer.y+1,'HUD stays within the play viewport and above controls');
        assert.ok(toggle.width>=44&&toggle.height>=44,'HUD toggle has a usable touch target');
        await page.screenshot({path:path.join(artifacts,`hud-${world}-${width}.png`)});
        await page.locator('#v78-hud-toggle').click();
        await page.screenshot({path:path.join(artifacts,`${world}-${width}.png`)});
      }, {context:{viewport:{width,height}}});
    }
    assert.ok(passed > 0);
    console.log(`${passed} regression checks passed (Chromium, isolated saves; real Safari not tested)`);
  } finally {
    fs.writeFileSync(path.join(artifacts,'results.json'),JSON.stringify({passed,outcomes},null,2));
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
function documentBodyTheater(classes) {return String(classes).split(/\s+/).includes('v68-theater');}
main().catch(error=>{console.error(error);process.exitCode=1;});
