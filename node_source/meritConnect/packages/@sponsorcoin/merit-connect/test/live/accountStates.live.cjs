// File: test/live/accountStates.live.cjs
//
// Row M15 of docs/design/meritConnectDesign.txt: the account-state rules, through the REAL screens of the extension (its Active Account Selection list) and the web app (its Remote Account Selector).
//   - the caller (the extension) changes an account: the account STAYS in its list and only the Connect / Disconnect state changes, and the web app is told;
//   - the remote (the web app) disconnects an account: it is REMOVED from the extension list;
//   - the caller's wallet list has a Connect / Disconnect button on every web app row.
// Needs what test/live/meritConnect.live.cjs needs (header there). Run: CHROME=<chromium> NODE_PATH=<web>/node_modules WEB_PASSWORD=<pw> node test/live/accountStates.live.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000';
const EXT_DIR = process.env.EXT_DIR || path.resolve(__dirname, '../../../../../../../../spCoinExtension/deploy');
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
  assert.ok(process.env.CHROME && process.env.WEB_PASSWORD, 'set CHROME and WEB_PASSWORD');
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'mc-states-')), {
    executablePath: process.env.CHROME,
    headless: false,
    viewport: { width: 1400, height: 900 },
    args: ['--headless=new', `--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`],
  });
  try {
    const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker', { timeout: 20000 }));
    const id = new URL(sw.url()).host;
    const web = await ctx.newPage();
    await web.goto(`${WEB_URL}/Test`, { waitUntil: 'domcontentloaded', timeout: 240000 });
    await web.waitForTimeout(12000);
    const pw = web.locator('input[type=password]');
    if (await pw.count()) {
      await pw.first().fill(process.env.WEB_PASSWORD);
      await pw.first().press('Enter');
      await web.waitForTimeout(5000);
    }
    const panel = await ctx.newPage();
    await panel.goto(`chrome-extension://${id}/sidepanel.html`);
    await panel.waitForTimeout(2500);
    await panel.evaluate(() => chrome.runtime.sendMessage({ type: 'merit/vault/create', password: 'password-1', mnemonic: 'test test test test test test test test test test test junk' }));
    await panel.waitForTimeout(1500);
    await panel.reload();
    await panel.waitForTimeout(5000);
    await panel.mouse.click(140, 40);
    await panel.waitForTimeout(3000);

    const store = () =>
      panel.evaluate(async () => {
        const r = await chrome.storage.local.get(['meritWebAppAccounts', 'meritWebAppDisconnected']);
        const short = (l) => (l || []).map((a) => a.slice(0, 8).toLowerCase());
        return { connected: short(r.meritWebAppAccounts), disconnected: short(r.meritWebAppDisconnected) };
      });
    const webList = () => web.evaluate(() => JSON.parse(localStorage.getItem('meritExtensionSharedAccounts') || '[]').map((a) => a.slice(0, 8).toLowerCase()));
    // the buttons on the extension's web app rows, in order (Connect / Disconnect)
    const rowButtons = async () => {
      const text = await panel.evaluate(() => document.body.innerText);
      return text
        .slice(text.indexOf('MERIT (WEB APP)'))
        .split('\n')
        .filter((l) => /^(Connect|Disconnect)$/.test(l));
    };
    const click = async (page, name) => {
      await page.getByRole('button', { name }).first().click();
      await page.waitForTimeout(3000);
    };

    // after a reload the panel may keep the list open (its screen is remembered): open it and the group only when they are closed
    const showWebAppRows = async () => {
      if (!(await panel.evaluate(() => document.body.innerText)).includes('Active Account Selection')) {
        await panel.mouse.click(140, 40);
        await panel.waitForTimeout(2500);
      }
      if ((await rowButtons()).length === 0) {
        await panel.getByText('MERIT (WEB APP)').first().click();
        await panel.waitForTimeout(1500);
      }
    };
    // set-up: the extension opens the web app's selector (Add Account(s)); two accounts are connected there
    const adds = panel.getByRole('button', { name: /add account/i });
    await adds.nth((await adds.count()) - 1).click();
    await web.waitForTimeout(4500);
    if ((await web.getByRole('button', { name: /^Connect$/ }).count()) === 0) await web.getByText('MERIT (WEB APP)').first().click();
    await web.waitForTimeout(1200);
    await web.getByRole('button', { name: /^Connect$/ }).first().click();
    await web.waitForTimeout(1500);
    await web.getByRole('button', { name: /^Connect$/ }).first().click();
    await web.waitForTimeout(2500);
    await panel.getByText('MERIT (WEB APP)').first().click();
    await panel.waitForTimeout(1200);

    await test('both shared accounts are rows in the extension, each with a Disconnect button', async () => {
      assert.equal((await store()).connected.length, 2);
      assert.deepEqual(await rowButtons(), ['Disconnect', 'Disconnect']);
    });
    await test('the EXTENSION disconnects one: the account STAYS listed (now Connect), is kept as disconnected, and the web app no longer has it connected', async () => {
      const before = await store();
      await click(panel, /^Disconnect$/);
      const after = await store();
      assert.equal(after.connected.length, 1);
      assert.equal(after.disconnected.length, 1);
      assert.ok(before.connected.includes(after.disconnected[0]));
      assert.deepEqual(await rowButtons(), ['Disconnect', 'Connect']);
      assert.deepEqual(await webList(), after.connected, 'the web app was told');
    });
    await test('PERSISTED: the extension is reloaded (its side panel page): the accounts and each state, connected or disconnected, are the same', async () => {
      const before = await store();
      const buttons = await rowButtons();
      await panel.reload();
      await panel.waitForTimeout(5000);
      await showWebAppRows();
      assert.deepEqual(await store(), before);
      assert.deepEqual(await rowButtons(), buttons);
      assert.deepEqual(buttons, ['Disconnect', 'Connect'], 'a connected and a disconnected account');
    });
    await test('the EXTENSION connects it again: it is connected here and on the web app', async () => {
      await click(panel, /^Connect$/);
      const after = await store();
      assert.equal(after.connected.length, 2);
      assert.deepEqual(after.disconnected, []);
      assert.deepEqual([...(await webList())].sort(), [...after.connected].sort());
      assert.deepEqual(await rowButtons(), ['Disconnect', 'Disconnect']);
    });
    await test('the WEB APP disconnects one: it is REMOVED from the extension (not kept as disconnected)', async () => {
      await click(web, /^(Connected|Disconnect)$/);
      const after = await store();
      assert.equal(after.connected.length, 1);
      assert.deepEqual(after.disconnected, []);
      assert.deepEqual(await rowButtons(), ['Disconnect']);
    });
    await test('the EXTENSION disconnects the last one: it stays listed as Connect and the web app has nothing connected', async () => {
      await click(panel, /^Disconnect$/);
      const after = await store();
      assert.deepEqual(after.connected, []);
      assert.equal(after.disconnected.length, 1);
      assert.deepEqual(await rowButtons(), ['Connect']);
      assert.deepEqual(await webList(), []);
    });
    await test('PERSISTED: the web app page is reloaded too: its connected list is the same and the extension still shows its disconnected account', async () => {
      const extBefore = await store();
      const webBefore = await webList();
      await web.reload({ waitUntil: 'domcontentloaded' });
      await web.waitForTimeout(12000);
      assert.deepEqual(await webList(), webBefore);
      await panel.reload();
      await panel.waitForTimeout(5000);
      await showWebAppRows();
      assert.deepEqual(await store(), extBefore);
      assert.deepEqual(await rowButtons(), ['Connect'], 'the disconnected account is still listed, as Connect');
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
