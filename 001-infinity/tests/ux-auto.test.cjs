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
  boxCoinRoll: () => v72BoxCoinRoll(), openBox: () => openOne(),
  balance: () => ({income:income(),cost:lvCost(),combat:v74CombatStats(),synergy:synergyBonus(),rebirth:v74Rebirth()}),
  save: () => save(), draw: () => draw(), income: () => income(), step: dt => step(dt),
  closeTutorial: () => closeTutorial(true), switchWorld: w => v63Switch(w),
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
    const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, locale: 'ja-JP', reducedMotion: 'reduce', ...options.context});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.stack || error.message));
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(url).origin ? route.continue() : route.abort());
    await page.clock.install({time: new Date(NOW)});
    await page.clock.pauseAt(new Date(NOW));
    await page.addInitScript(({seed, denyBackup, denyWrites, denyReads}) => {
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
    }, {seed: options.seed || {}, denyBackup: !!options.denyBackup, denyWrites: !!options.denyWrites, denyReads: !!options.denyReads});
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
      assert.match(await page.locator('#boxresult').innerText(),/通貨＋1/);
      assert.match(await page.locator('#v72-box-coin-notice').innerText(),/通貨＋1/);
      await page.locator('#open10').click();
      current=await state(page);assert.equal(current.coins,11);assert.equal(current.boxCoinTotal,11);
      assert.match(await page.locator('#boxresult').innerText(),/通貨＋10/);
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
    await check('closing details explains paused AUTO and explicit resume continues', async page => {
      await config(page,{explore:true,combat:false});await page.locator('#v68-auto-main').click();await page.clock.runFor(1000);
      await page.locator('#v68-shortcut-gear').click();assert.equal((await runtime(page)).paused,true);
      await closeLibrary(page);await page.clock.runFor(1);
      assert.match(await page.locator('#v68-auto-status').innerText(),/閉じました/);
      assert.equal((await runtime(page)).running,false);
      await page.locator('#v68-auto-main').click();assert.equal((await runtime(page)).running,true);
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
      assert.ok(values.first.cost/values.first.income>10&&values.first.cost/values.first.income<60);
      assert.ok(values.reborn.rebirth>1&&values.reborn.rebirth<5);
      assert.equal(values.state.owned['0'],10000,'Owned quantities are retained');assert.equal(values.state.lv,178);
      assert.ok(Object.values(values.first.combat).every(Number.isFinite));
    },{seed:{[KEY]:JSON.stringify(fixture({v68Migration:1}))}});
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
    await check('settings UI persists independent flags and speed, runtime stays stopped after reload', async page => {
      await page.locator('#v68-auto-settings-open').click();
      for (const key of ['explore', 'combat', 'boss', 'reward']) await page.locator('#v68-auto-' + key).check();
      await page.locator('#v68-auto-theater').uncheck();
      await closeLibrary(page);
      await page.locator('#v68-auto-speed').selectOption('4');
      await page.locator('#v68-auto-main').click();
      assert.equal((await runtime(page)).running, true);
      await page.reload({waitUntil: 'load'});
      const saved = await state(page);
      assert.deepEqual(saved.v68Auto, {explore: true, combat: true, boss: true, reward: true, speed: 4, theater: false});
      assert.equal((await runtime(page)).running, false);
      assert.equal(documentBodyTheater(await page.locator('body').getAttribute('class')), false);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
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
      await page.evaluate(() => document.querySelector('[data-mode="rest"]').click());
      assert.equal((await runtime(page)).paused, true);
      assert.equal((await state(page)).mode, 'rest');
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
    await check('pending boss reward remains manual by default and duplicate clicks cannot grant twice', async page => {
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
      assert.equal((await runtime(page)).paused, true);
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
      await page.evaluate(() => __infinityTest.patch({lv: 25}));
      // The existing shared loop refreshes prestige availability after level changes.
      await page.clock.runFor(500);
      assert.equal(await page.locator('#prestige').isEnabled(), true);
      await config(page, {explore: true, combat: false});
      await page.locator('#v68-auto-main').click();
      page.once('dialog', dialog => dialog.accept());
      await page.evaluate(() => document.getElementById('prestige').click());
      const actual = await state(page);
      assert.equal(actual.rebirth, 1);
      assert.equal(actual.lv, 1);
      assert.deepEqual(actual.owned, {});
      assert.deepEqual(actual.discoveredGear, {'0': true, '42': true});
      assert.deepEqual(actual.choices, {'0': 1});
      assert.equal(actual.shop.mondrian, 1);
      assert.equal((await runtime(page)).paused || !(await runtime(page)).running, true);
    }, {seed: {[KEY]: JSON.stringify(fixture({v68Migration: 1}))}});
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
      for(const key of ['progress','save','settings','auto','rebirth','logs','dopa','extras']) {
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
        const textFonts=await page.evaluate(()=>['v68-stats','v68-auto-status','v68-auto-main','v68-auto-pause','v68-auto-manual','v68-auto-speed','v68-shortcut-gear','v68-shortcut-books','v68-shortcut-progress','v68-shortcut-menu'].map(id=>({id,font:Number.parseFloat(getComputedStyle(document.getElementById(id)).fontSize)})));
        for(const value of textFonts)assert.ok(value.font>=14,`${world} ${width}px ${value.id} does not shrink essential text below14px (got ${value.font})`);
        const stop=await page.locator('#v68-auto-main').boundingBox();
        assert.ok(stop.y>=0&&stop.y+stop.height<=height,'Theater stop remains available');
        await page.locator('#v68-auto-manual').click();
        assert.equal(documentBodyTheater(await page.locator('body').getAttribute('class')),false);
        await assertWallet(page,`${world} ${width}px returned to manual`);
        await page.locator('#v68-shortcut-progress').click();
        assert.equal(await page.locator('#v68-library').evaluate(node=>node.open),true);
        assert.equal(await page.locator('#v65-details').isVisible(),true);
        assert.equal(await page.locator('#v63-world-dashboard').isVisible(),true);
        await closeLibrary(page);
        await page.locator('#v68-shortcut-menu').click();
        assert.equal(await page.locator('#v54nav').isVisible(),true);
        await closeLibrary(page);
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
