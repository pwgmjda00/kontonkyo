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

    // Test cases are populated with the stable UI contracts as the app lands.

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
