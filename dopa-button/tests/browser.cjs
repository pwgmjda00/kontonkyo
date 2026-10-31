// Functional browser checks against a production build, with isolated browser state.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium, webkit } = require('playwright');

const root = path.resolve(__dirname, '..');
const active = new Set();

async function serve() {
  if (process.env.DOPA_BASE_URL) return { url: process.env.DOPA_BASE_URL, close() {} };
  const child = spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
  active.add(child);
  let output = '';
  const url = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error(`Preview did not start: ${output}`)); }, 15000);
    const read = chunk => {
      output += chunk.toString();
      const match = output.replace(/\x1b\[[0-9;]*m/g, '').match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) { clearTimeout(timeout); resolve(`http://127.0.0.1:${match[1]}`); }
    };
    child.stdout.on('data', read); child.stderr.on('data', read);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Preview exited ${code}: ${output}`)); });
  });
  return { url, close() { try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill(); } active.delete(child); } };
}

async function main() {
  const server = await serve();
  let browser;
  let passed = 0;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
    async function check(name, run, options = {}) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ja-JP', isMobile: true, hasTouch: true, ...options });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      try {
        await page.clock.install({ time: new Date('2026-10-30T15:00:00Z') });
        await page.clock.pauseAt(new Date('2026-10-30T15:00:00Z'));
        await run(page, context, server.url);
        assert.deepEqual(errors, [], `${name}: uncaught page errors`);
        console.log(`PASS ${name}`); passed++;
      } finally { await context.close(); }
    }

    const tid = (page, id) => page.getByTestId(id);
    const phase = async page => {
      return await page.locator('.app-shell').getAttribute('data-phase');
    };
    const score = async page => Number((await tid(page, 'score').innerText()).replace(/[^0-9]/g, ''));
    const press = page => tid(page, 'main-push').click({ force: true });
    async function step(page, ms) {
      await page.clock.runFor(ms);
      await page.evaluate(() => Promise.resolve());
    }
    async function open(page, url, worker = {}) {
      await page.addInitScript(({ outcome }) => {
        window.__roundWord = 0;
        window.__workerOutcome = outcome;
        window.__workerRequests = [];
        Object.defineProperty(crypto, 'getRandomValues', { configurable: true, value(array) { array.fill(window.__roundWord); return array; } });
        class FakeWorker extends EventTarget {
          onmessage = null;
          dead = false;
          postMessage(request) {
            window.__workerRequests.push(request.type);
            const outcome = window.__workerOutcome || {};
            const response = { id: request.id, hits: [], trigger: false, candidateId: null, theater: false, tier: request.type === 'gaming' ? 'normal' : null, durationMs: .2, ...outcome };
            queueMicrotask(() => { if (!this.dead) { const event = new MessageEvent('message', { data: response }); this.onmessage?.(event); this.dispatchEvent(event); } });
          }
          terminate() { this.dead = true; }
        }
        if (outcome !== null) window.Worker = FakeWorker;
      }, { outcome: worker });
      const response = await page.goto(url, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      await page.getByRole('button', { name: /旧3モードへ/ }).click();
      assert.equal(await phase(page), 'READY');
    }
    async function begin(page) {
      await press(page);
      assert.equal(await phase(page), 'COUNTDOWN');
      await step(page, 950);
      assert.equal(await phase(page), 'ROUND');
    }
    async function finishWithGoTimeout(page) {
      await page.evaluate(() => { window.__roundWord = 0; });
      if (await phase(page) === 'GAP') await step(page, 260);
      assert.equal(await phase(page), 'ROUND');
      await step(page, 1600);
      assert.equal(await phase(page), 'GAME_OVER');
    }
    const readRecords = page => page.evaluate(() => JSON.parse(localStorage.getItem('dopa-button-records-v1')));
    const inputEvents = JSON.parse(fs.readFileSync(path.join(root, 'data/probability_events_1026.json'), 'utf8'));
    const eligible = inputEvents.find(event => event.bonusEligible);

    await check('iPhone 17e main machine screen shows PUSH without scrolling and catalog starts collapsed', async (page, context, url) => {
      const response=await page.goto(url, {waitUntil:'networkidle'});
      assert.equal(response.status(), 200);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth),true);
      const push=tid(page,'machine-push');
      const bounds=await push.boundingBox();
      const screen=await page.evaluate(()=>({height:innerHeight,width:innerWidth}));
      assert.equal(screen.width,390);
      assert.ok(bounds && bounds.y>=0 && bounds.y+bounds.height<=screen.height-12,
        `PUSH must fit first viewport, got ${JSON.stringify(bounds)} vs ${JSON.stringify(screen)}`);
      assert.ok(await page.locator('.machine-legacy-link').isVisible());
      const catalog=page.locator('.machine-catalog-expand');
      assert.equal(await catalog.getAttribute('open'),null, 'Large machine list should not crowd the game');
      await catalog.locator('summary').click();
      assert.ok(await catalog.locator('.real-machine-list article').first().isVisible());
      await catalog.locator('summary').click();
      assert.equal(await catalog.getAttribute('open'),null);
    }, {viewport:{width:390,height:844},deviceScaleFactor:3,reducedMotion:'reduce'});

    await check('Initial mobile cabinet, mute, mode selection, and 320px layout', async (page, context, url) => {
      await open(page, url);
      assert.match(await page.title(), /ドパボタン/);
      assert.equal(await score(page), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await tid(page, 'sound').getAttribute('aria-pressed'), 'false');
      await tid(page, 'mode-dopa').click();
      assert.equal(await tid(page, 'mode-dopa').getAttribute('aria-pressed'), 'true');
      await tid(page, 'mode-gaming').click();
      assert.equal(await tid(page, 'mode-gaming').getAttribute('aria-pressed'), 'true');
      await tid(page, 'mode-normal').click();
      await begin(page);
      assert.equal(await tid(page, 'mode-gaming').isEnabled(), false);
      assert.equal(await phase(page), 'ROUND');
    }, { viewport: { width: 320, height: 720 }, reducedMotion: 'reduce' });

    await check('Start input is not carried into the first GO round; one tap adds exactly one score', async (page, context, url) => {
      await open(page, url);
      await press(page);
      await press(page);
      assert.equal(await score(page), 0);
      await step(page, 950);
      assert.equal(await tid(page, 'instruction').innerText(), '押せ！');
      assert.equal(await score(page), 0);
      await press(page);
      assert.equal(await score(page), 1);
      await press(page);
      assert.equal(await score(page), 1, 'Transition tap cannot double-score');
      assert.equal(await page.evaluate(() => window.__workerRequests.length), 1);
      await step(page, 260);
      assert.equal(await phase(page), 'ROUND');
      await press(page);
      assert.equal(await score(page), 2, 'New rounds advance without a next button');
    });

    await check('STOP round succeeds without input and GO timeout ends immediately', async (page, context, url) => {
      await open(page, url);
      await page.evaluate(() => { window.__roundWord = 1; });
      await begin(page);
      assert.equal(await tid(page, 'instruction').innerText(), '押すな！');
      await page.evaluate(() => { window.__roundWord = 0; });
      await step(page, 1530);
      assert.equal(await score(page), 1);
      await step(page, 260);
      assert.equal(await phase(page), 'ROUND');
      assert.equal(await tid(page, 'instruction').innerText(), '押せ！');
      await step(page, 1600);
      assert.equal(await phase(page), 'GAME_OVER');
      const records = await readRecords(page);
      assert.equal(records.totals.stopSuccesses, 1);
      assert.equal(records.totals.successes, 1);
    });

    await check('Pressing STOP is instant game over and PUSH retries cleanly', async (page, context, url) => {
      await open(page, url);
      await page.evaluate(() => { window.__roundWord = 1; });
      await begin(page);
      await press(page);
      assert.equal(await phase(page), 'GAME_OVER');
      assert.equal(await score(page), 0);
      assert.equal(await page.evaluate(() => window.__workerRequests.length), 0);
      await press(page);
      assert.equal(await phase(page), 'COUNTDOWN');
      assert.equal(await score(page), 0);
      await step(page, 950);
      assert.equal(await phase(page), 'ROUND');
    });

    await check('Touch input uses one click path and never scores twice', async (page, context, url) => {
      await open(page, url);
      await tid(page, 'main-push').tap();
      await step(page, 950);
      await tid(page, 'main-push').tap();
      assert.equal(await score(page), 1);
      assert.equal(await page.evaluate(() => window.__workerRequests.length), 1);
      await press(page);
      assert.equal(await score(page), 1);
    });

    await check('Hidden tab freezes the current round and returns through countdown', async (page, context, url) => {
      await open(page, url);
      await begin(page);
      await step(page, 200);
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.equal(await phase(page), 'PAUSED');
      await step(page, 15000);
      assert.equal(await phase(page), 'PAUSED');
      assert.equal(await score(page), 0);
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.equal(await phase(page), 'COUNTDOWN');
      await step(page, 950);
      assert.equal(await phase(page), 'ROUND');
      await press(page);
      assert.equal(await score(page), 1);
    });

    await check('Actual BONUS pauses the round, skips into countdown, and records its real hit', async (page, context, url) => {
      await open(page, url, { hits: [eligible.id], trigger: true, candidateId: eligible.id });
      await begin(page);
      await press(page);
      assert.equal(await phase(page), 'BONUS');
      assert.equal(await tid(page, 'bonus-overlay').isVisible(), true);
      assert.match(await tid(page, 'bonus-overlay').innerText(), new RegExp(eligible.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      const frozenScore = await score(page);
      await step(page, 1800);
      assert.equal(await phase(page), 'BONUS');
      assert.equal(await score(page), frozenScore);
      assert.equal((await readRecords(page)).discoveries[eligible.id].count, 1);
      await tid(page, 'bonus-skip').click();
      assert.equal(await phase(page), 'COUNTDOWN');
      await press(page);
      assert.equal(await score(page), frozenScore);
      await step(page, 1150);
      assert.equal(await phase(page), 'ROUND');
    });

    await check('Theater is explicitly cosmetic and never unlocks discoveries', async (page, context, url) => {
      await open(page, url, { hits: [], trigger: true, candidateId: null, theater: true });
      await begin(page);
      await press(page);
      assert.equal(await phase(page), 'BONUS');
      const text = await tid(page, 'bonus-overlay').innerText();
      assert.match(text, /確率シアター/);
      assert.match(text, /実当選ではありません/);
      assert.deepEqual((await readRecords(page)).discoveries, {});
    });

    await check('Silent actual hits persist when the 1/99 presentation trigger misses', async (page, context, url) => {
      await open(page, url, { hits: [eligible.id], trigger: false, candidateId: null });
      await begin(page);
      await press(page);
      assert.notEqual(await phase(page), 'BONUS');
      const records = await readRecords(page);
      assert.equal(records.discoveries[eligible.id].count, 1);
      assert.equal(records.history.length, 1);
      assert.equal(records.rarestId, eligible.id);
    });

    await check('Normal and dopa share best; gaming has separate best and no actual unlocks', async (page, context, url) => {
      await open(page, url);
      await begin(page); await press(page);
      await finishWithGoTimeout(page);
      await tid(page, 'mode-dopa').click();
      assert.match(await tid(page, 'best').innerText(), /1/);
      await tid(page, 'mode-gaming').click();
      assert.match(await tid(page, 'best').innerText(), /0/);
      await page.evaluate(({ id }) => { window.__workerOutcome = { tier: 'super', hits: [id], trigger: true, candidateId: id }; }, { id: eligible.id });
      await begin(page); await press(page);
      assert.equal(await phase(page), 'BONUS');
      assert.match(await tid(page, 'bonus-overlay').innerText(), /演出/);
      const records = await readRecords(page);
      assert.equal(records.best.shared, 1);
      assert.equal(records.best.gaming, 1);
      assert.deepEqual(records.discoveries, {});
      assert.deepEqual(await page.evaluate(() => window.__workerRequests), ['roll', 'gaming']);
    });

    await check('Records survive reload and the encyclopedia identifies its 18 experimental families', async (page, context, url) => {
      await open(page, url, { hits: [eligible.id], trigger: false });
      await begin(page); await press(page);
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await phase(page), 'READY');
      assert.match(await tid(page, 'best').innerText(), /1/);
      await tid(page, 'encyclopedia').click();
      const dialog = page.locator('dialog[open]');
      assert.equal(await dialog.isVisible(), true);
      const text = await dialog.innerText();
      assert.match(text, /1026|1,026/);
      assert.match(text, /18/);
      assert.match(text, /数学/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const before = await readRecords(page);
      const preview = dialog.getByRole('button', { name: /プレビュー/ }).first();
      if (await preview.count()) {
        await preview.click();
        assert.deepEqual((await readRecords(page)).discoveries, before.discoveries);
      }
    });

    await check('Denied localStorage still permits successful play and game over', async (page, context, url) => {
      await page.addInitScript(() => {
        Storage.prototype.getItem = () => { throw new DOMException('Disabled', 'SecurityError'); };
        Storage.prototype.setItem = () => { throw new DOMException('Disabled', 'SecurityError'); };
      });
      await open(page, url); await begin(page); await press(page);
      assert.equal(await score(page), 1);
      await finishWithGoTimeout(page);
      assert.equal(await phase(page), 'GAME_OVER');
    });

    await check('Game-over share includes score, mode, current playable URL, and hashtag', async (page, context, url) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copiedShare = text; } } });
      });
      await open(page, url); await begin(page); await press(page);
      await finishWithGoTimeout(page);
      await tid(page, 'share').click();
      const text = await page.evaluate(() => window.__copiedShare);
      assert.match(text, /1/);
      assert.match(text, /通常/);
      assert.match(text, /#ドパボタン/);
      assert.ok(text.includes(url), 'Share includes the URL the game is actually served from');
    });

    await check('The production Worker completes all-event drawing without blocking the page', async (page, context, url) => {
      await open(page, url, null);
      await begin(page);
      await press(page);
      await page.waitForFunction(() => {
        const saved = JSON.parse(localStorage.getItem('dopa-button-records-v1') || 'null');
        return saved?.totals?.successes === 1;
      }, {}, { timeout: 15000 });
      const saved = await readRecords(page);
      const knownIds = new Set(inputEvents.map(event => event.id));
      assert.equal(saved.totals.successes, 1);
      assert.ok(Object.keys(saved.discoveries).every(id => knownIds.has(id)));
      assert.ok(saved.history.length <= 100, 'History is capped independently of aggregate discoveries');
      assert.ok(['GAP', 'BONUS'].includes(await phase(page)));
      assert.equal(await page.evaluate(() => document.readyState), 'complete');
    });

    assert.ok(passed > 0, 'At least one functional browser check must execute');
    console.log(`${passed} browser checks passed (Chromium touch emulation)`);
    if (!fs.existsSync(webkit.executablePath())) console.log('WebKit is not installed; real iPhone Safari remains unverified.');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  for (const child of active) { try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill(); } }
});
