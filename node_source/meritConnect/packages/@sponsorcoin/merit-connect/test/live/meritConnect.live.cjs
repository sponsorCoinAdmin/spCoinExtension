// File: test/live/meritConnect.live.cjs
//
// Row M11 of docs/design/meritConnectDesign.txt: the LIVE end-to-end test. The real Merit extension (its built `deploy` folder) and the real Merit web app talk the protocol in a real Chromium; the test plays the side panel by
// sending the same message the panel sends (merit/web/request) and plays the person in the web app by clicking its screens. It covers: the account selection and live sync (connect, disconnect, the selector starting from what the
// extension holds, a tab click closing it), the handshake correcting a stale copy, revoke, and signing (a refusal for an account that is not shared, the dev keystore's limits).
//
// Needs: the web dev server running (default http://localhost:3000, env WEB_URL), the extension built (`bash scripts/syncNodeSource.sh --vite`; env EXT_DIR), a Chromium that can load extensions (env CHROME, e.g. Playwright's),
// playwright-core resolvable (run it from the web app with NODE_PATH=<web>/node_modules), and the web test password (env WEB_PASSWORD) to unlock the web wallet.
// Run:  CHROME=<chromium> NODE_PATH=<web>/node_modules WEB_PASSWORD=<password> node test/live/meritConnect.live.cjs        (exits non-zero on any failure)
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';
const EXT_DIR = process.env.EXT_DIR || path.resolve(__dirname, '../../../../../../../../spCoinExtension/deploy');
const PASSWORD = process.env.WEB_PASSWORD;
const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};

(async () => {
  assert.ok(process.env.CHROME, 'set CHROME to a Chromium that can load extensions');
  assert.ok(PASSWORD, 'set WEB_PASSWORD (the web test wallet password)');
  assert.ok(fs.existsSync(path.join(EXT_DIR, 'manifest.json')), 'the extension is not built at ' + EXT_DIR);
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'mc-live-')), {
    executablePath: process.env.CHROME,
    headless: false,
    viewport: { width: 1400, height: 900 },
    args: ['--headless=new', `--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`],
  });
  try {
    const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker', { timeout: 20000 }));
    const id = new URL(sw.url()).host;
    const panel = await ctx.newPage();
    await panel.goto(`chrome-extension://${id}/sidepanel.html`);
    await panel.waitForTimeout(2500);
    await panel.evaluate(() => chrome.runtime.sendMessage({ type: 'merit/vault/create', password: 'password-1', mnemonic: 'test test test test test test test test test test test junk' }));
    await panel.waitForTimeout(1500);
    const web = await ctx.newPage();
    const webTrace = [];
    web.on('console', (m) => {
      const t = m.text();
      if (/merit-connect|remoteSelection/.test(t)) webTrace.push(t);
    });
    await web.goto(`${WEB_URL}/Test`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await web.waitForTimeout(12000);
    const pw = web.locator('input[type=password]');
    if (await pw.count()) {
      await pw.first().fill(PASSWORD);
      await pw.first().press('Enter');
      await web.waitForTimeout(5000);
    }

    const send = (method, params, rid) => panel.evaluate(([m, p, r]) => chrome.runtime.sendMessage({ type: 'merit/web/request', method: m, params: p, rid: r }), [method, params, rid]);
    const stored = () => panel.evaluate(async () => (await chrome.storage.local.get('meritWebAppAccounts')).meritWebAppAccounts || []);
    const webList = () => web.evaluate(() => JSON.parse(localStorage.getItem('meritExtensionSharedAccounts') || '[]'));
    const connected = () => web.getByRole('button', { name: /^(Connected|Disconnect)$/ }).count();
    const settle = (ms = 1200) => web.waitForTimeout(ms);
    const lower = (list) => list.map((a) => a.toLowerCase());
    // the group header toggles, and its open state is kept between selections: open it only when it is closed
    const openGroup = async () => {
      if ((await web.getByRole('button', { name: /^Connect$/ }).count()) === 0) await web.getByText('MERIT (WEB APP)').first().click();
      await settle();
    };

    let first;
    let second;
    // ---- the selection and the live sync ----
    await test('the extension asks; the web app opens its account selector with the new title and offers its accounts', async () => {
      panel.evaluate(() => {
        window.__sel = chrome.runtime.sendMessage({ type: 'merit/web/request', method: 'eth_requestAccounts', rid: 'rq-live-sel', params: [{ shared: [] }] });
      });
      await web.waitForTimeout(4000);
      assert.match(await web.evaluate(() => document.body.innerText), /Remote Merit \(EXT\) Account Selector/);
      await openGroup();
      assert.ok((await web.getByRole('button', { name: /^Connect$/ }).count()) > 1);
      assert.ok(webTrace.some((t) => /merit-connect:selection\.request.*rq-live-sel/.test(t)), 'the web trace names the request id');
    });
    await test('the FIRST connect answers the extension with that account, and the extension keeps it', async () => {
      await web.getByRole('button', { name: /^Connect$/ }).first().click();
      await settle(2500);
      const answer = await panel.evaluate(() => window.__sel);
      assert.equal(answer.ok, true);
      first = answer.result[0];
      assert.equal(answer.result.length, 1);
      // (the side panel's own requestAccounts stores this answer; this test plays the panel with a raw message, so only the pushes after it reach storage)
    });
    await test('a SECOND connect reaches the extension as a push (live sync)', async () => {
      await web.getByRole('button', { name: /^Connect$/ }).first().click();
      await settle(2000);
      const list = await stored();
      assert.equal(list.length, 2);
      second = lower(list).find((a) => a !== first);
      assert.ok(webTrace.some((t) => /posted.*merit_remoteSelection.*"taken":true/.test(t)), 'the push was taken by the worker');
    });
    await test('a DISCONNECT in the web app reaches the extension too', async () => {
      await web.getByRole('button', { name: /^(Connected|Disconnect)$/ }).first().click();
      await settle(2000);
      assert.equal((await stored()).length, 1);
      assert.deepEqual(lower(await webList()).sort(), lower(await stored()).sort());
    });
    await test('a new request starts the selector from what the extension holds (the buttons read Connected at once)', async () => {
      const held = await stored();
      panel.evaluate((h) => {
        window.__sel2 = chrome.runtime.sendMessage({ type: 'merit/web/request', method: 'eth_requestAccounts', rid: 'rq-live-sel2', params: [{ shared: h }] });
      }, held);
      await web.waitForTimeout(3000);
      assert.ok((await connected()) >= held.length);
      // the first remote call is a SYNC: before anyone clicks, the web app's shared list IS what the extension holds (and an account the web app does not have is dropped)
      assert.deepEqual(lower(await webList()).sort(), lower(held).sort());
    });
    await test('a tab click in the web wallet ends the selector: no selector, no plain list left over', async () => {
      await web.getByText('Send', { exact: true }).first().click();
      await settle(2500);
      assert.equal(await web.getByText(/Remote Merit \(EXT\)/).count(), 0);
      assert.equal(await web.getByText('Active Account Selection').count(), 0);
      const answer = await panel.evaluate(() => window.__sel2);
      assert.equal(answer.ok, false);
      assert.equal(answer.error.code, 4001);
    });

    // ---- the handshake and revoke ----
    await test('the handshake corrects a STALE copy in the extension from the web app (the link comes up, the list loads)', async () => {
      const web1 = await webList();
      assert.ok(web1.length >= 1);
      await panel.evaluate((s) => chrome.storage.local.set({ meritWebAppAccounts: [s] }), '0x' + '11'.repeat(20));
      await panel.reload();
      await panel.waitForTimeout(8000);
      assert.deepEqual(lower(await stored()).sort(), lower(web1).sort());
    });
    await test('revoke from the extension clears the web app\'s shared list too', async () => {
      const reply = await send('wallet_revokePermissions', undefined, 'rq-live-revoke');
      assert.equal(reply.ok, true);
      assert.deepEqual(await webList(), []);
    });

    // ---- signing ----
    await test('signing: an account that is not shared is refused 4100 and the person is never asked', async () => {
      const reply = await send('personal_sign', ['0x' + Buffer.from('hi').toString('hex'), '0x' + '9'.repeat(40)], 'rq-live-sig1');
      assert.equal(reply.error.code, 4100);
    });
    await test('signing: a shared dev-keystore account asks the person HERE; its own limits answer 4200 (text, typed data)', async () => {
      panel.evaluate(() => {
        window.__sel3 = chrome.runtime.sendMessage({ type: 'merit/web/request', method: 'eth_requestAccounts', rid: 'rq-live-sel3', params: [{ shared: [] }] });
      });
      await web.waitForTimeout(3500);
      await openGroup();
      await web.getByRole('button', { name: /^Connect$/ }).first().click();
      await settle(2000);
      const account = (await panel.evaluate(() => window.__sel3)).result[0];
      await web.getByText('Send', { exact: true }).first().click();
      await settle();
      const pending = send('personal_sign', ['0x' + Buffer.from('hello').toString('hex'), account], 'rq-live-sig2');
      await web.waitForTimeout(4000);
      const approve = web.getByRole('button', { name: /approve/i });
      assert.ok((await approve.count()) >= 1, 'the web app shows its approval page');
      await approve.first().click();
      const reply = await pending;
      assert.equal(reply.ok, false);
      assert.equal(reply.error.code, 4200);
      assert.match(reply.error.message, /dev keystore/);
      const typed = await send('eth_signTypedData_v4', [account, JSON.stringify({ types: { EIP712Domain: [{ name: 'name', type: 'string' }], T: [{ name: 'a', type: 'string' }] }, primaryType: 'T', domain: { name: 'x' }, message: { a: 'b' } })], 'rq-live-sig3');
      assert.equal(typed.error.code, 4200);
    });
    // (a request in another protocol version is answered 4901: that is covered by test/protocol.test.mjs and test/transports.test.mjs, it cannot be sent from this panel)
    // ---- the connection monitor's input (row M13): the worker tells a page that is OPEN BUT SILENT from one that answers ----
    await test('the worker tells an open-but-silent tab on the web app origin from the page that answers (candidates)', async () => {
      // the worker only looks at tabs on the origins in the manifest host permissions: a verification server on another port is not one of them
      const granted = await panel.evaluate((origin) => (chrome.runtime.getManifest().host_permissions || []).some((p) => p.startsWith(origin + '/')), new URL(WEB_URL).origin);
      if (!granted) return;
      const before = await panel.evaluate(() => chrome.runtime.sendMessage({ type: 'merit/web/status' }));
      assert.ok(before.reporting >= 1, 'the web app page answers');
      const silent = await ctx.newPage();
      await silent.goto(new URL('/favicon.ico', WEB_URL).href, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await silent.waitForTimeout(3000);
      const during = await panel.evaluate(() => chrome.runtime.sendMessage({ type: 'merit/web/status' }));
      await silent.close();
      assert.equal(during.candidates, before.candidates + 1, 'the silent tab is counted, the answering one is not');
      assert.equal(during.reporting, before.reporting);
    });
    await test('the extension announces its Merit provider to the web page', async () => {
      const answer = await web.evaluate(async () => {
        const found = [];
        window.addEventListener('eip6963:announceProvider', (e) => found.push(e.detail));
        window.dispatchEvent(new Event('eip6963:requestProvider'));
        const merit = found.find((x) => x.info.rdns === 'org.sponsorcoin.merit');
        return !!merit;
      });
      assert.equal(answer, true, 'the extension announces its provider to the page');
    });
  } finally {
    await ctx.close();
  }
  for (const [k, v] of results) console.log(k + '  ' + v);
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} live checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(2);
});
