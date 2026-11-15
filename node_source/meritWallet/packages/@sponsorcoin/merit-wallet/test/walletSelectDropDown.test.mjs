// File: test/walletSelectDropDown.test.mjs
//
// 2026-10-13 (owner request: WalletSelectDropDown, like the other AssetSelectDropDown wrappers, with the properties in public/assets/wallets/${walletName}): src/walletAssets.ts (the slug of a wallet id, the asset URLs, the one read of account.json per origin and folder) and the wrapper
// src/WalletSelectDropDown.tsx in spcoin-panels (pinned: it is built on AssetSelectDropDown, maps the wallet's name / type / website / description / icon onto the pill, has the same props and defaults as AccountSelectDropDown, and is exported). The four real asset folders are read through the same
// function and must be complete (a name, and an icon file that exists). Run: node test/walletSelectDropDown.test.mjs
// MUTANT=meritNotShared|slugFromName|noCache|badJsonThrows|iconFromName|noChevronDefault|nameNotAddress|notExported|baseUrlIgnored|configIgnored run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const PKG = path.join(HERE, '..');
const WEB = path.join(PKG, '..', '..', '..', '..', '..');
const PANELS = path.join(WEB, 'node_source', 'spCoinPanels', 'packages', '@sponsorcoin', 'spcoin-panels', 'src');
const ASSETS = path.join(WEB, 'public', 'assets', 'wallets');
const m = process.env.MUTANT;
const read = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let assetsSrc = read(path.join(PANELS, 'walletAssets.ts'));
let dropDown = read(path.join(PANELS, 'WalletSelectDropDown.tsx'));
let index = read(path.join(PANELS, 'index.ts'));
if (m === 'meritNotShared') assetsSrc = swap(assetsSrc, "if (id === 'serverKeystore' || id === 'browserVault' || id === 'localVault' || id === 'deviceVault' || id === 'injected:org.sponsorcoin.merit') return 'merit';", "if (id === 'serverKeystore') return 'merit';");
if (m === 'slugFromName') assetsSrc = swap(assetsSrc, "if (id === 'injected:io.metamask') return 'metamask';", "if (id === 'injected:io.metamask') return 'MetaMask';");
if (m === 'noCache') assetsSrc = swap(assetsSrc, 'if (!pending) {', 'if (true) {');
if (m === 'badJsonThrows') assetsSrc = swap(assetsSrc, '      .catch(() => undefined);\n    cache.set(key, pending);', '    ;\n    cache.set(key, pending);');
if (m === 'baseUrlIgnored') assetsSrc = swap(assetsSrc, "return `${baseUrl.replace(/\\/+$/, '')}/assets/wallets/", 'return `/assets/wallets/');
if (m === 'configIgnored') assetsSrc = swap(assetsSrc, 'baseUrl: string = configuredBaseUrl): string {', "baseUrl: string = ''): string {");
if (m === 'iconFromName') dropDown = swap(dropDown, "walletAssetUrl(slug, info.icon || 'wallet.png', baseUrl ?? getWalletAssetBaseUrl())", "walletAssetUrl(slug, 'wallet.png', baseUrl ?? getWalletAssetBaseUrl())");
if (m === 'noChevronDefault') dropDown = swap(dropDown, '(listOpen ? WALLET_SELECT_DISPLAY.CHEVRON_UP : WALLET_SELECT_DISPLAY.CHEVRON_DN) |', '');
if (m === 'nameNotAddress') dropDown = swap(dropDown, "address={displayName ?? info?.name ?? ''}", "address={info?.website ?? ''}");
if (m === 'notExported') index = swap(index, 'export { default as WalletSelectDropDown, WALLET_SELECT_DISPLAY, useWalletAsset, walletWebsiteHost }', '// not exported');

const js = ts.transpileModule(assetsSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)(req, mod, mod.exports);
const { walletAssetSlug, walletAssetUrl, loadWalletAsset, clearWalletAssetCache, setWalletAssetBaseUrl, getWalletAssetBaseUrl } = mod.exports;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
/** A fetch over the real asset folders on disk, counting calls. */
const diskFetch = (counter) => async (url) => {
  counter.n += 1;
  const rel = String(url).replace(/^https?:\/\/[^/]+/, '').replace(/^\/assets\/wallets\//, '');
  const file = path.join(ASSETS, ...rel.split('/').map(decodeURIComponent));
  if (!fs.existsSync(file)) return { ok: false, json: async () => ({}) };
  return { ok: true, json: async () => JSON.parse(fs.readFileSync(file, 'utf8')) };
};

await test('a wallet id becomes its folder slug, never from a display name: hardware:<kind>, MetaMask, every Merit wallet in one folder, another injected wallet by its last rdns part', () => {
  assert.equal(walletAssetSlug('hardware:ledger'), 'ledger');
  assert.equal(walletAssetSlug('hardware:trezor'), 'trezor');
  assert.equal(walletAssetSlug('injected:io.metamask'), 'metamask');
  for (const id of ['serverKeystore', 'browserVault', 'localVault', 'deviceVault', 'injected:org.sponsorcoin.merit']) assert.equal(walletAssetSlug(id), 'merit', id);
  assert.equal(walletAssetSlug('injected:app.phantom'), 'phantom');
  assert.equal(walletAssetSlug('hardware:Keystone'), 'keystone');
  assert.equal(walletAssetSlug(''), '');
});

await test('asset URLs are on this origin or on the given base address (the extension passes the web app\'s), with the folder and file encoded', () => {
  assert.equal(walletAssetUrl('ledger', 'wallet.png'), '/assets/wallets/ledger/wallet.png');
  assert.equal(walletAssetUrl('ledger', 'wallet.png', 'https://sponsorcoin.org/'), 'https://sponsorcoin.org/assets/wallets/ledger/wallet.png');
  assert.equal(walletAssetUrl('a b', 'x y.png'), '/assets/wallets/a%20b/x%20y.png');
});

await test('a host on another origin sets the asset address once and every default follows it (the pill, the list and the panel read the same place); unset it and they are back on this origin', async () => {
  clearWalletAssetCache();
  try {
    setWalletAssetBaseUrl('https://sponsorcoin.org/');
    assert.equal(getWalletAssetBaseUrl(), 'https://sponsorcoin.org/');
    assert.equal(walletAssetUrl('ledger', 'wallet.png'), 'https://sponsorcoin.org/assets/wallets/ledger/wallet.png');
    const asked = [];
    await loadWalletAsset('trezor', undefined, async (url) => { asked.push(url); return { ok: true, json: async () => ({ name: 'Trezor' }) }; });
    assert.deepEqual(asked, ['https://sponsorcoin.org/assets/wallets/trezor/account.json']);
  } finally {
    setWalletAssetBaseUrl(undefined);
    clearWalletAssetCache();
  }
  assert.equal(walletAssetUrl('ledger', 'wallet.png'), '/assets/wallets/ledger/wallet.png');
});

await test('the four real wallet folders each give a name and an icon file that exists (ledger, merit, metamask, trezor)', async () => {
  clearWalletAssetCache();
  const counter = { n: 0 };
  const fetchImpl = diskFetch(counter);
  const expected = { ledger: 'Ledger', merit: 'Merit (Web App)', metamask: 'MetaMask', trezor: 'Trezor' };
  for (const [slug, name] of Object.entries(expected)) {
    const info = await loadWalletAsset(slug, '', fetchImpl);
    assert.equal(info?.name, name, slug);
    assert.ok(info.type && info.website && info.description, slug + ' has type, website and description');
    assert.ok(fs.existsSync(path.join(ASSETS, slug, info.icon || 'wallet.png')), slug + ' icon file exists');
  }
  assert.deepEqual([(await loadWalletAsset('ledger', '', fetchImpl)).type, (await loadWalletAsset('trezor', '', fetchImpl)).type], ['hardware', 'hardware']);
});

await test('account.json is read once per origin and folder (the second ask is the same answer, no second request); another origin asks again', async () => {
  clearWalletAssetCache();
  const counter = { n: 0 };
  const fetchImpl = diskFetch(counter);
  const a = await loadWalletAsset('metamask', '', fetchImpl);
  const b = await loadWalletAsset('metamask', '', fetchImpl);
  assert.equal(a, b);
  assert.equal(counter.n, 1);
  await loadWalletAsset('metamask', 'https://sponsorcoin.org', fetchImpl);
  assert.equal(counter.n, 2);
});

await test('a wallet with no folder, a failed request, a bad file, or a file with no name is undefined, never an error', async () => {
  clearWalletAssetCache();
  assert.equal(await loadWalletAsset('nowallet', '', diskFetch({ n: 0 })), undefined);
  assert.equal(await loadWalletAsset('boom', '', async () => { throw new Error('offline'); }), undefined);
  assert.equal(await loadWalletAsset('bad', '', async () => ({ ok: true, json: async () => { throw new SyntaxError('bad json'); } })), undefined);
  assert.equal(await loadWalletAsset('noname', '', async () => ({ ok: true, json: async () => ({ type: 'software' }) })), undefined);
  assert.equal(await loadWalletAsset('', '', diskFetch({ n: 0 })), undefined);
});

await test('the wrapper is built on AssetSelectDropDown and maps the wallet onto the pill: its icon file, its NAME in the address slot, the description as the hover title, the type and the website host as symbol and name', () => {
  assert.match(dropDown, /import AssetSelectDropDown, \{ ASSET_SELECT_DISPLAY \} from '\.\/AssetSelectDropDown';/);
  assert.match(dropDown, /rootId="WALLET_SELECT_DROP_DOWN"/);
  assert.match(dropDown, /iconSrc = info && slug && !iconFailed \? walletAssetUrl\(slug, info\.icon \|\| 'wallet\.png', baseUrl \?\? getWalletAssetBaseUrl\(\)\) : undefined;/);
  assert.match(dropDown, /address=\{displayName \?\? info\?\.name \?\? ''\}/);
  assert.match(dropDown, /addressTitle=\{info\?\.description\}/);
  assert.match(dropDown, /symbol=\{info\?\.type\}/);
  assert.match(dropDown, /name=\{walletWebsiteHost\(info\?\.website\)\}/);
});

await test('same props and defaults as AccountSelectDropDown: icon, name, chevron (up when open), copy and pill; panel gate, sizes and onSelectClick pass straight through; a folder (walletName) or an id (walletId) selects the wallet', () => {
  assert.match(dropDown, /WALLET_SELECT_DISPLAY\.ICON \|\n      WALLET_SELECT_DISPLAY\.ADDRESS \|\n      \(listOpen \? WALLET_SELECT_DISPLAY\.CHEVRON_UP : WALLET_SELECT_DISPLAY\.CHEVRON_DN\) \|\n      WALLET_SELECT_DISPLAY\.COPY \|\n      WALLET_SELECT_DISPLAY\.ADDR_COMP/);
  for (const prop of ['onSelectClick', 'listOpen', 'yellowPill', 'restrictRowClickToChevron', 'showDisplay', 'collapseKey', 'onExpandedChange', 'iconSizeClassName', 'pillHeightClassName', 'chevronSize', 'copyIconSize', 'panelGateId', 'panelGate']) {
    assert.match(dropDown, new RegExp(`${prop}[?]?:`), prop + ' is a prop');
    assert.match(dropDown, new RegExp(`${prop}=\\{${prop}\\}|${prop}=\\{handleRowClick\\}|${prop},|${prop}\\n`), prop + ' reaches the pill');
  }
  assert.match(dropDown, /const slug = walletName \?\? walletAssetSlug\(walletId \?\? ''\);/);
  assert.match(dropDown, /label = 'Select Wallet'/);
  assert.match(dropDown, /placeholderLabel=\{label\}/);
});

await test('it is exported from the package index with its display flags, the reading hook and the asset helpers', () => {
  assert.match(index, /export \{ default as WalletSelectDropDown, WALLET_SELECT_DISPLAY, useWalletAsset, walletWebsiteHost \} from '\.\/WalletSelectDropDown';/);
  assert.match(index, /export \{ walletAssetSlug, walletAssetUrl, loadWalletAsset, clearWalletAssetCache, setWalletAssetBaseUrl, getWalletAssetBaseUrl, type WalletAssetInfo \} from '\.\/walletAssets';/);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
