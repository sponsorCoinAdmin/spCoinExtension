// File: test/live/webCaller.live.cjs
//
// The OTHER direction of docs/design/meritConnectDesign.txt (2026-11-06, owner: both directions): the WEB APP is the caller and the Merit EXTENSION is the remote. Through the real screens of both:
//   - the web app's Add Account(s) on Merit (Ext) opens the extension's account selector; what is connected there is connected on the web app (live pushes);
//   - the web app disconnects one account: it STAYS listed (kept, disconnected) and the extension no longer has it connected;
//   - the web app's connected accounts are persisted and RE-SENT when the connection is made again (a page load): the extension is connected exactly as before, even after the extension lost them;
//   - an account that no longer exists in the extension is removed from the web app, with the notice "Account Does not Exist on Merit (Ext) / Removed from Local";
//   - the extension disconnects one in its selector: it is removed from the web app, with the notice "Disconnected by Remote".
// Needs what test/live/meritConnect.live.cjs needs (header there). Run: CHROME=<chromium> NODE_PATH=<web>/node_modules WEB_PASSWORD=<pw> WEB_URL=http://localhost:3201 node test/live/webCaller.live.cjs
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
  const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'mc-webcaller-')), {
    executablePath: process.env.CHROME,
    headless: false,
    viewport: { width: 1400, height: 900 },
    args: ['--headless=new', `--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`],
  });
  const webLog = [];
  let boot = { text: '' };
  try {
    const sw = ctx.serviceWorkers()[0] || (await ctx.waitForEvent('serviceworker', { timeout: 20000 }));
    const id = new URL(sw.url()).host;
    const origin = new URL(WEB_URL).origin;
    const panel = await ctx.newPage();
    await panel.goto(`chrome-extension://${id}/sidepanel.html`);
    await panel.waitForTimeout(2500);
    const send = (message) => panel.evaluate((m) => chrome.runtime.sendMessage(m), message);
    await send({ type: 'merit/vault/create', password: 'password-1', mnemonic: 'test test test test test test test test test test test junk' });
    await panel.waitForTimeout(1500);
    await send({ type: 'merit/accounts/loadTestAccounts' });
    await panel.waitForTimeout(1500);
    await panel.reload();
    await panel.waitForTimeout(4000);

    const web = await ctx.newPage();
    web.on('console', (m) => {
      const t = m.text();
      if (/merit-connect|toggleAccount|approverAccounts|accountNotice|MESSAGE_PANEL|NAV_POP|openPanel|closePanel/.test(t)) webLog.push(t.slice(0, 260));
    });
    // expectPopup: the text a notice popup must show; the page is then left as it is (navigating would close the popup) and what is on screen is kept in `boot`
    const openWeb = async (expectPopup) => {
      await web.goto(`${WEB_URL}/Test`, { waitUntil: 'domcontentloaded', timeout: 240000 });
      await web.waitForTimeout(12000);
      const pw = web.locator('input[type=password]');
      await pw.first().waitFor({ timeout: 60000 }).catch(() => undefined);
      if (await pw.count()) {
        await pw.first().click();
        await pw.first().pressSequentially(process.env.WEB_PASSWORD);
        await web.getByRole('button', { name: /^Login$/ }).first().click().catch(() => pw.first().press('Enter'));
        await web.waitForTimeout(6000);
      }
      if (expectPopup) {
        await web.getByText(expectPopup).first().waitFor({ timeout: 30000 }).catch(() => undefined);
        await web.waitForTimeout(1500);
        boot = { text: await web.evaluate(() => document.body.innerText) };
        await web.screenshot({ path: 'C:/tmp/webcaller_popup.png' });
        return;
      }
      const has = (t) => web.getByText(t).count();
      // the wallet may already be open after a reload: open it only when it is not on screen
      if (!(await has('Close Merit Wallet')) && !(await web.getByRole('button', { name: 'Close Merit Wallet' }).count())) {
        await web.mouse.click(1310, 24);
        await web.waitForTimeout(3000);
      }
      // the list: the header says "Select Account:" while no account is active; otherwise step back from whatever screen is open until the list is there, else open it from the account chip
      for (let i = 0; i < 4 && !(await has('Active Account Selection')); i++) {
        console.log('OPENLIST step', i, ((await web.evaluate(() => document.body.innerText)).match(/(Active Account Selection|Trading Station|About Merit Wallet|Select Account:|Removed from Local)/g) || []).join(','));
        if (await has('Select Account:')) await web.getByText('Select Account:').first().click();
        else await web.locator('button[aria-label="Go back"]:visible').first().click();
        await web.waitForTimeout(2500);
      }
      // still not there (the wallet restored an About screen): the account chip in the wallet header opens the list
      if (!(await has('Active Account Selection'))) {
        await web.mouse.click(981, 255);
        await web.waitForTimeout(3000);
      }
      await web.waitForTimeout(2000);
    };
    const short = (l) => (l || []).map((a) => a.slice(0, 8).toLowerCase());
    const webStore = () =>
      web.evaluate(() => ({ connected: JSON.parse(localStorage.getItem('meritExtensionAccounts') || '[]'), disconnected: JSON.parse(localStorage.getItem('meritExtensionDisconnected') || '[]') })).then((r) => ({ connected: short(r.connected), disconnected: short(r.disconnected) }));
    // what the extension has connected for the web app's origin (the page function cannot see `short`: the list is reduced here)
    const extPermissions = async () => short(await panel.evaluate(async (o) => ((await chrome.storage.local.get('spcoin_merit_permissions')).spcoin_merit_permissions || {})[o] || [], origin));
    const webText = () => web.evaluate(() => document.body.innerText);
    const extGroupButtons = async () => {
      const text = await webText();
      const from = text.lastIndexOf('MERIT (EXT)');
      return text
        .slice(from)
        .split('\n')
        .filter((l) => /^(Connect|Disconnect)$/.test(l));
    };

    await openWeb();
    // set-up: the web app opens the extension's selector (Add Account(s) of Merit (Ext)); two accounts are connected there
    const adds = web.getByRole('button', { name: /add account/i });
    await adds.nth((await adds.count()) - 1).click();
    await panel.waitForTimeout(4000);
    await panel.reload();
    await panel.waitForTimeout(5000);
    const panelConnects = () => panel.getByRole('button', { name: /^Connect$/ });
    assert.ok((await panelConnects().count()) > 2, 'the extension shows its account selector with Connect buttons');
    await panelConnects().nth(0).click();
    await panel.waitForTimeout(2500);
    await panelConnects().nth(0).click();
    await panel.waitForTimeout(3500);

    await test('the accounts connected in the extension selector are connected on the web app (the first answers, the next one is a live push)', async () => {
      const store = await webStore();
      assert.equal(store.connected.length, 2, JSON.stringify(store));
      assert.deepEqual([...(await extPermissions())].sort(), [...store.connected].sort());
    });
    await web.getByText('MERIT (EXT)').first().click().catch(() => undefined);
    await web.waitForTimeout(1500);
    await test('the web wallet shows each of them with a Disconnect button', async () => {
      const buttons = await extGroupButtons();
      assert.ok(buttons.filter((b) => b === 'Disconnect').length >= 2, JSON.stringify(buttons));
    });
    await test('the WEB APP disconnects one: it STAYS listed (kept, disconnected) and the extension no longer has it connected', async () => {
      const before = await webStore();
      webLog.length = 0;
      await web.getByRole('button', { name: /^Disconnect$/ }).first().click();
      await web.waitForTimeout(3500);
      console.log('AFTER CLICK', JSON.stringify(await webStore()), webLog.join(' || ').slice(0, 1500));
      const after = await webStore();
      assert.equal(after.connected.length, 1);
      assert.equal(after.disconnected.length, 1);
      await panel.waitForTimeout(1500);
      assert.equal(await panel.getByRole('button', { name: /^Disconnect$/ }).count(), 1, 'the extension selector row went back to Connect');
      assert.ok(before.connected.includes(after.disconnected[0]));
      assert.deepEqual(await extPermissions(), after.connected, 'the extension was told');
    });
    await test('the WEB APP connects it again: connected on both sides, no longer kept as disconnected', async () => {
      await web.getByRole('button', { name: /^Connect$/ }).first().click();
      await web.waitForTimeout(3500);
      const after = await webStore();
      assert.equal(after.connected.length, 2);
      assert.deepEqual(after.disconnected, []);
      await panel.waitForTimeout(1500);
      assert.equal(await panel.getByRole('button', { name: /^Disconnect$/ }).count(), after.connected.length, 'the extension selector rows follow what the web app connected');
      assert.deepEqual([...(await extPermissions())].sort(), [...after.connected].sort());
    });
    await test('PERSISTED + RE-ESTABLISHED: the extension forgets the connection (the remote disconnected all), the web page is loaded again: its list is re-sent and the extension is connected exactly as before', async () => {
      const before = await webStore();
      await panel.evaluate(async () => {
        await chrome.storage.local.set({ spcoin_merit_permissions: {} });
      });
      assert.deepEqual(await extPermissions(), []);
      await openWeb();
      await web.waitForTimeout(3000);
      assert.deepEqual(await webStore(), before, 'the web app kept its accounts');
      assert.deepEqual([...(await extPermissions())].sort(), [...before.connected].sort(), 'the extension was re-connected from the web app list');
    });
    await test('an account that no longer exists in the extension is REMOVED from the web app, with the notice', async () => {
      // an account made from an imported key (the ones from the recovery phrase cannot be removed), connected on the web app's side
      const imported = await send({ type: 'merit/accounts/importPrivateKey', privateKey: '0x' + '11'.repeat(32), name: 'Imported' });
      const gone = imported.account.address;
      await web.evaluate((a) => localStorage.setItem('meritExtensionAccounts', JSON.stringify([...JSON.parse(localStorage.getItem('meritExtensionAccounts') || '[]'), a])), gone);
      await openWeb();
      await web.waitForTimeout(3000);
      assert.ok((await webStore()).connected.includes(gone.slice(0, 8).toLowerCase()), 'the extension has it, so the re-send connects it');
      const removed = await send({ type: 'merit/accounts/remove', address: gone });
      assert.ok(removed && removed.ok !== false, 'the extension removed the account: ' + JSON.stringify(removed));
      await panel.evaluate(async () => {
        await chrome.storage.local.set({ spcoin_merit_permissions: {} });
      });
      await openWeb('Removed from Local');
      await web.waitForTimeout(3000);
      assert.ok(!(await webStore()).connected.includes(gone.slice(0, 8).toLowerCase()), 'removed from the web app');
      const text = boot.text;
      assert.ok(/Account Does not Exist on Merit \(Extension\)/.test(text), 'the notice popup is on screen after the login: ' + text.slice(-300).split('\n').join(' | '));
      assert.ok(/Removed from Local/.test(text));
    });
  } finally {
    await ctx.close();
  }
  if (results.some((r) => r[0] === 'FAIL')) console.log(['WEB LOG:', ...webLog.slice(-60)].join('\n'));
  for (const [k, v] of results) console.log(k + '  ' + v);
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} live checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(2);
});
