// File: test/metamaskRelay.test.mjs
//
// docs/connectionDesign.txt item 9 (MetaMask as an approver for the extension, src/metamaskRelay.ts): the worker's relay finds (or opens, inactive) the person's own app tab, injects a hidden iframe into
// it for the relay page, passes only an allow-listed set of calls, accepts an answer only from that iframe's own address, ends the request with MetaMask's own codes when the app tab is closed (4001) or
// cannot be opened (4900), sends requests one at a time reusing the same tab/iframe, shows an on-page "Approve..." notice while a request is open and hides it again once idle, and lets only the
// extension's own pages use it. The page script and the content script act on the relay page only. Checked live with a real MetaMask (scripts/live/extensionMetaMaskRelayFocus.cjs in the web repo).
// Run: node test/metamaskRelay.test.mjs
// 2026-10-27: the relay is a hidden iframe in an EXISTING app tab (chrome.scripting.executeScript), never its own tab/window -- see the file's own header comment for the three designs this replaced.
// MUTANT=anyMethod|anyTab|anyAddress|anyExtension|closeIgnored|notSerial|noAppTabFound|appTabNeverActive|noFrameInject|noBanner|bannerNotHidden|pageNotChecked|contentScriptEverywhere|inpageEverywhere run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const { transformSync } = await import('rolldown/experimental');
const m = process.env.MUTANT;
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };
const read = (rel) => fs.readFileSync(path.join(HERE, '..', rel), 'utf8').replace(/\r\n/g, '\n');

let relaySrc = read('src/metamaskRelay.ts');
let content = read('src/contentScript.ts');
let inpage = read('src/inpage.ts');
if (m === 'anyMethod') relaySrc = swap(relaySrc, 'if (!RELAY_METHODS.has(method)) return', 'if (false) return');
if (m === 'anyTab') { relaySrc = swap(relaySrc, '|| sender.tab.id !== relayTabId) return false;', ') return false;'); relaySrc = swap(relaySrc, 'if (!entry || entry.tabId !== sender.tab.id) return false;', 'if (!entry) return false;'); }
if (m === 'anyAddress') relaySrc = swap(relaySrc, '|| !sender.url.startsWith(relayUrl)) return false;', ') return false;');
if (m === 'anyExtension') relaySrc = swap(relaySrc, 'if (sender.id !== chrome.runtime.id || sender.tab?.id', 'if (sender.tab?.id');
if (m === 'closeIgnored') relaySrc = swap(relaySrc, "entry.resolve(fail(4001, 'The app tab was closed before MetaMask answered.'));", '');
if (m === 'notSerial') relaySrc = swap(relaySrc, 'const next = chain.then(() => run(method, params));', 'const next = run(method, params);');
if (m === 'noAppTabFound') relaySrc = swap(relaySrc, 'const [existing] = await chrome.tabs.query({ url: `${base}/*` });', 'const existing = undefined;');
if (m === 'appTabNeverActive') relaySrc = swap(relaySrc, "chrome.tabs.create({ url: base, active: false })", "chrome.tabs.create({ url: base, active: true })");
if (m === 'noFrameInject') relaySrc = swap(relaySrc, 'await injectRelayFrame(tabId, url);', '');
if (m === 'noBanner') relaySrc = swap(relaySrc, 'void showApprovalBanner(tabId);', '');
if (m === 'bannerNotHidden') relaySrc = swap(relaySrc, 'void hideApprovalBanner(tabId);', '');
if (m === 'pageNotChecked') relaySrc = swap(relaySrc, "if (sender.id !== chrome.runtime.id || typeof sender.url !== 'string' || !sender.url.startsWith(chrome.runtime.getURL(''))) {\n    sendResponse({ ok: false, error: { code: 4100", "if (false) {\n    sendResponse({ ok: false, error: { code: 4100");
if (m === 'contentScriptEverywhere') content = swap(content, "const isRelayPage = () => window.location.pathname === RELAY_PATH;", 'const isRelayPage = () => true;');
if (m === 'inpageEverywhere') inpage = swap(inpage, "if (window.location.pathname === '/metamaskRelay.html') {", 'if (true) {');

const APP_URL = 'http://localhost:3000';
const RELAY_URL = 'http://localhost:3000/metamaskRelay.html';

// ---- a fake chrome for the worker ----
function makeChrome({ seedAppTab = true } = {}) {
  const calls = { tabsCreated: [], tabsRemoved: [], sent: [], query: [], inject: [], bannerShow: [], bannerHide: [] };
  const tabs = new Map(); // id -> { id, url, status }
  let nextId = 100;
  const updated = new Set();
  const removedListeners = new Set();
  const runtimeListeners = [];
  const store = {};
  if (seedAppTab) tabs.set(nextId++, { id: 99, url: APP_URL, status: 'complete' });
  // fix the seeded tab's own id to match the map key (the line above used a pre-incremented nextId by mistake-proofing):
  if (seedAppTab) { tabs.clear(); tabs.set(99, { id: 99, url: APP_URL, status: 'complete' }); nextId = 100; }
  const chromeMock = {
    runtime: { id: 'ext-1', getURL: (p) => 'chrome-extension://ext-1/' + p, onMessage: { addListener: (l) => runtimeListeners.push(l) } },
    storage: { local: { get: async (k) => ({ [k]: store[k] }), set: async (o) => Object.assign(store, o) } },
    tabs: {
      query: async ({ url }) => {
        calls.query.push(url);
        const prefix = url.endsWith('/*') ? url.slice(0, -2) : url;
        return Array.from(tabs.values()).filter((t) => t.url === prefix || t.url.startsWith(prefix + '/'));
      },
      create: async ({ url, active }) => {
        const id = nextId++;
        const tab = { id, url, status: 'loading' };
        tabs.set(id, tab);
        calls.tabsCreated.push({ url, active });
        setTimeout(() => { tab.status = 'complete'; for (const l of Array.from(updated)) l(id, { status: 'complete' }); }, 5);
        return tab;
      },
      get: async (id) => { if (!tabs.has(id)) throw new Error('No tab'); return tabs.get(id); },
      remove: async (id) => { calls.tabsRemoved.push(id); tabs.delete(id); for (const l of Array.from(removedListeners)) l(id); },
      sendMessage: async (id, message) => { if (!tabs.has(id)) throw new Error('No tab'); calls.sent.push({ id, message }); },
      onUpdated: { addListener: (l) => updated.add(l), removeListener: (l) => updated.delete(l) },
      onRemoved: { addListener: (l) => removedListeners.add(l) },
    },
    scripting: {
      executeScript: async ({ target, func, args }) => {
        if (!tabs.has(target.tabId)) throw new Error('No tab');
        const src = func.toString();
        if (src.includes('frameId')) { calls.inject.push({ tabId: target.tabId, args }); return [{ result: 'loaded' }]; }
        if (src.includes('block')) { calls.bannerShow.push({ tabId: target.tabId }); return [{ result: undefined }]; }
        if (src.includes('none')) { calls.bannerHide.push({ tabId: target.tabId }); return [{ result: undefined }]; }
        return [{ result: undefined }];
      },
    },
  };
  // simulates the app tab (or its relay iframe) going away some OTHER way, not through our own idle logic.
  const closeTab = (tabId) => chromeMock.tabs.remove(tabId);
  return { chromeMock, calls, tabs, runtimeListeners, store, closeTab };
}

function loadRelay(opts) {
  const env = makeChrome(opts);
  // the extension's TypeScript is the native one (no JS API), so the file is compiled with the transform the build uses (oxc, in rolldown) and turned into a function over a fake chrome
  let code = transformSync('metamaskRelay.ts', relaySrc, { lang: 'ts', sourceType: 'module', target: 'es2022' }).code;
  const NLC = String.fromCharCode(10);
  code = code.replace(/^import \{[^}]*\} from ['"]\.\/openTargetStorage['"];?$/m, 'const { readOpenTarget, urlForOpenTarget } = deps;').replace(/^export (async function|function|const) /gm, '$1 ');
  const mod = { exports: new Function('chrome', 'deps', code + NLC + 'return { RELAY_PATH, METAMASK_ACCOUNTS_KEY, RELAY_METHODS, relayRequest, acceptRelayResult, readMetaMaskAccounts, writeMetaMaskAccounts };')(env.chromeMock, { readOpenTarget: async () => 'local', urlForOpenTarget: () => APP_URL }) };
  const handle = (message, sender) => new Promise((resolve) => {
    let answered = false;
    const done = (r) => { answered = true; resolve(r); };
    setTimeout(() => resolve('TIMEOUT'), 700);
    for (const l of env.runtimeListeners) if (l(message, sender, done) === true) return;
    setTimeout(() => resolve(answered ? undefined : 'NO ANSWER'), 20);
  });
  return { ...mod.exports, ...env, handle };
}
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// a request that never answers must fail the test, not hang it
const within = (promise, ms = 1500) => Promise.race([promise, wait(ms).then(() => { throw new Error('no answer in time'); })]);
const fromRelay = (tabId, extra = {}) => ({ id: 'ext-1', tab: { id: tabId }, url: RELAY_URL, ...extra });
const answerOnce = async (r, reply) => { for (let i = 0; i < 100 && r.calls.sent.length === 0; i++) await wait(10); const s = r.calls.sent[r.calls.sent.length - 1]; return r.acceptRelayResult({ id: s.message.id, ...reply }, fromRelay(s.id)); };

await test('a request reuses the person\'s EXISTING app tab (never creates one), injects the hidden relay frame into it, shows the on-page notice, sends the call, and resolves with MetaMask\'s answer', async () => {
  const r = loadRelay();
  const pending = r.relayRequest('eth_requestAccounts');
  assert.equal(await answerOnce(r, { ok: true, result: ['0xabc'] }), true);
  assert.deepEqual(await within(pending), { ok: true, result: ['0xabc'] });
  assert.equal(r.calls.tabsCreated.length, 0, 'the existing app tab is reused, never recreated');
  assert.deepEqual(r.calls.inject, [{ tabId: 99, args: [r.calls.inject[0]?.args?.[0], RELAY_URL] }]);
  assert.equal(r.calls.bannerShow.length, 1, 'the on-page notice is shown');
  assert.equal(r.calls.sent[0].id, 99, 'the call goes to the app tab (reaching the iframe inside it)');
  assert.equal(r.calls.sent[0].message.type, 'merit/relay/call');
  assert.equal(r.calls.sent[0].message.method, 'eth_requestAccounts');
});

await test('when no app tab is open, one is opened INACTIVE -- never active, never disturbing whatever the person is looking at', async () => {
  const r = loadRelay({ seedAppTab: false });
  const pending = r.relayRequest('eth_requestAccounts');
  assert.equal(await answerOnce(r, { ok: true, result: ['0xabc'] }), true);
  await within(pending);
  assert.deepEqual(r.calls.tabsCreated, [{ url: APP_URL, active: false }]);
});

await test('only the allow-listed calls are passed to MetaMask; any other is refused and no app tab is even looked for', async () => {
  const r = loadRelay();
  for (const method of ['eth_sign', 'wallet_addEthereumChain', 'eth_getBalance', 'eth_decrypt']) {
    const reply = await within(r.relayRequest(method), 400);
    assert.equal(reply.ok, false);
    assert.equal(reply.error.code, -32601);
  }
  assert.equal(r.calls.query.length, 0);
});

await test('an answer from another tab, another address or another extension is refused and the request keeps waiting', async () => {
  const r = loadRelay();
  const pending = r.relayRequest('personal_sign', ['0x00', '0xabc']);
  for (let i = 0; i < 100 && r.calls.sent.length === 0; i++) await wait(10);
  const { id } = r.calls.sent[0];
  const { id: msgId } = r.calls.sent[0].message;
  assert.equal(r.acceptRelayResult({ id: msgId, ok: true, result: '0xforged' }, fromRelay(id + 5)), false, 'another tab');
  assert.equal(r.acceptRelayResult({ id: msgId, ok: true, result: '0xforged' }, { ...fromRelay(id), url: 'https://evil.example/metamaskRelay.html' }), false, 'another address');
  assert.equal(r.acceptRelayResult({ id: msgId, ok: true, result: '0xforged' }, { ...fromRelay(id), id: 'other-extension' }), false, 'another extension');
  assert.equal(r.acceptRelayResult({ id: msgId + 7, ok: true, result: '0xforged' }, fromRelay(id)), false, 'an id nobody asked');
  assert.equal(r.acceptRelayResult({ id: msgId, ok: true, result: '0xsig' }, fromRelay(id)), true);
  assert.deepEqual(await within(pending), { ok: true, result: '0xsig' });
});

await test('MetaMask\'s own error comes back with its code (4001 rejected stays 4001)', async () => {
  const r = loadRelay();
  const pending = r.relayRequest('personal_sign', ['0x00', '0xabc']);
  await answerOnce(r, { ok: false, error: { code: 4001, message: 'User rejected the request.' } });
  assert.deepEqual(await within(pending), { ok: false, error: { code: 4001, message: 'User rejected the request.' } });
});

await test('closing the app tab before MetaMask answers ends the request with 4001', async () => {
  const r = loadRelay();
  const pending = r.relayRequest('eth_requestAccounts');
  for (let i = 0; i < 100 && r.calls.sent.length === 0; i++) await wait(10);
  await r.closeTab(r.calls.sent[0].id);
  const reply = await within(pending);
  assert.equal(reply.ok, false);
  assert.equal(reply.error.code, 4001);
});

await test('requests go one at a time (the second is not sent until the first is answered), reusing the same app tab', async () => {
  const r = loadRelay();
  const first = r.relayRequest('eth_chainId');
  const second = r.relayRequest('eth_accounts');
  for (let i = 0; i < 100 && r.calls.sent.length === 0; i++) await wait(10);
  await wait(60);
  assert.equal(r.calls.sent.length, 1, 'the second must wait');
  await answerOnce(r, { ok: true, result: '0x1' });
  await within(first);
  for (let i = 0; i < 100 && r.calls.sent.length < 2; i++) await wait(10);
  assert.equal(r.calls.sent.length, 2);
  assert.equal(r.calls.sent[1].id, r.calls.sent[0].id, 'the same app tab');
  await r.acceptRelayResult({ id: r.calls.sent[1].message.id, ok: true, result: [] }, fromRelay(r.calls.sent[1].id));
  await within(second);
  assert.equal(r.calls.tabsCreated.length, 0, 'still never created a new tab');
});

await test('the on-page notice hides itself shortly after the last request, once nothing is pending', async () => {
  const r = loadRelay();
  const pending = r.relayRequest('eth_accounts');
  await answerOnce(r, { ok: true, result: [] });
  await within(pending);
  assert.equal(r.calls.bannerHide.length, 0, 'not at once');
  await wait(1800);
  assert.equal(r.calls.bannerHide.length, 1);
});

await test('only the extension\'s own pages may use the relay; a content script (a web page\'s URL) is refused', async () => {
  const r = loadRelay();
  const web = await r.handle({ type: 'merit/metamask/request', method: 'eth_accounts' }, { id: 'ext-1', url: 'https://evil.example/', tab: { id: 1 } });
  assert.deepEqual(web, { ok: false, error: { code: 4100, message: 'forbidden' } });
  const other = await r.handle({ type: 'merit/metamask/setAccounts', accounts: ['0x1'] }, { id: 'other-extension', url: 'chrome-extension://other/x.html' });
  assert.equal(other.ok, false);
  assert.equal(r.calls.query.length, 0);
});

await test('the shared accounts are kept and read back; anything that is not an address string is dropped', async () => {
  const r = loadRelay();
  const own = { id: 'ext-1', url: 'chrome-extension://ext-1/sidepanel.html' };
  await r.handle({ type: 'merit/metamask/setAccounts', accounts: ['0xA', 7, null, '0xB'] }, own);
  const back = await r.handle({ type: 'merit/metamask/accounts' }, own);
  assert.deepEqual(back, { ok: true, accounts: ['0xA', '0xB'] });
});

await test('the content script and the page script act on the relay page only (not on every page)', () => {
  assert.match(content, /const isRelayPage = \(\) => window\.location\.pathname === RELAY_PATH;/);
  assert.match(content, /message\?\.type === 'merit\/relay\/call' && isRelayPage\(\)/);
  assert.match(content, /if \(event\.source !== window \|\| !isRelayPage\(\)\) return;/);
  assert.match(inpage, /if \(window\.location\.pathname === '\/metamaskRelay\.html'\) \{/);
  assert.match(inpage, /detail\?\.info\?\.rdns === 'io\.metamask'/);
});

await test('the manifest grants exactly what the hidden-iframe relay needs: scripting permission, and all_frames on both content scripts (MetaMask\'s own content script must also reach a nested iframe)', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.ok(manifest.permissions.includes('scripting'), 'scripting permission');
  for (const cs of manifest.content_scripts) assert.equal(cs.all_frames, true, JSON.stringify(cs.js));
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
