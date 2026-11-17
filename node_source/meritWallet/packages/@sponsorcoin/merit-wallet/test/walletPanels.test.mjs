// File: test/walletPanels.test.mjs
//
// 2026-10-13 (owner request): the wallet list, WALLET_PANEL as a new branch under ASSET_RADIO_PANELS (the active wallet's account.json), and the WalletSelectDropDown whose DOWN chevron opens the list.
// 2026-11-17 (owner): REMOTE_WALLET_LIST (id 166), a second panel flag for the same wallet list, is REMOVED; the one wallet list is WALLET_LIST_SELECT_PANEL. This test now pins that it is gone and that the pill opens the one list.
// Pinned: the three wallet panel ids and their names, REMOTE_WALLET_LIST gone everywhere, the radio groups, the default panel tree (the built spcoin-common is also loaded and asked), the hosted pill (chevron-only open of WALLET_LIST_SELECT_PANEL, icon opens WALLET_PANEL, a pick wins over the active wallet), the overlay slot for WALLET_PANEL, and no pill row left in MeritWallet. Run: node test/walletPanels.test.mjs
// MUTANT=notInAssetRadio|backInDisplay|backInTree|backInRegistry|hostHasWalletCase|rowAlwaysChevron|iconNoPanel|pickLoses|pillOpensOldPanel|rowBack run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const NS = path.join(PKG, '..', '..', '..', '..');
const COMMON = path.join(NS, 'spCoinCommon', 'packages', '@sponsorcoin', 'spcoin-common');
const PANELS = path.join(NS, 'spCoinPanels', 'packages', '@sponsorcoin', 'spcoin-panels', 'src');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let display = read(COMMON, 'src', 'panels', 'spCoinDisplay.ts');
let groups = read(COMMON, 'src', 'panels', 'panelGroups.ts');
let registry = read(COMMON, 'src', 'panels', 'panelRegistry.ts');
let tree = read(COMMON, 'src', 'panels', 'defaultPanelTree.ts');
let host = read(PANELS, 'AssetSelectListPanel.tsx');
let hosted = read(PANELS, 'containers', 'dropdowns', 'WalletSelectDropDown.tsx');
let wallet = read(PKG, 'src', 'MeritWallet.tsx');
const contract = read(PKG, 'src', 'hostContract.ts');
if (m === 'notInAssetRadio') groups = swap(groups, '  SP.NETWORK_PANEL,\n  SP.WALLET_PANEL,\n]', '  SP.NETWORK_PANEL,\n]');
if (m === 'backInDisplay') display = swap(display, '  WALLET_PANEL = 167,', '  REMOTE_WALLET_LIST = 166,\n  WALLET_PANEL = 167,');
if (m === 'backInTree') tree = swap(tree, '          node(SP.REMOTE_TOKEN_LIST, false),\n', '          node(SP.REMOTE_TOKEN_LIST, false),\n          node(SP.REMOTE_WALLET_LIST, false),\n');
if (m === 'backInRegistry') registry = swap(registry, 'SP.REMOTE_TOKEN_LIST] })', 'SP.REMOTE_TOKEN_LIST, SP.REMOTE_WALLET_LIST] })');
if (m === 'hostHasWalletCase') host = swap(host, '    default:', '    case SP_COIN_DISPLAY.REMOTE_WALLET_LIST:\n      return null;\n    default:');
if (m === 'rowAlwaysChevron') hosted = swap(hosted, 'restrictRowClickToChevron = true', 'restrictRowClickToChevron = false');
if (m === 'iconNoPanel') hosted = swap(hosted, "openPanel(SP_COIN_DISPLAY.WALLET_PANEL, 'WalletSelectDropDown:icon');", '');
if (m === 'pickLoses') hosted = swap(hosted, 'walletName={walletName ?? picked}', 'walletName={walletName}');
if (m === 'pillOpensOldPanel') hosted = swap(hosted, "openPanel(SP_COIN_DISPLAY.WALLET_LIST_SELECT_PANEL, 'WalletSelectDropDown:open');", "openPanel(SP_COIN_DISPLAY.WALLET_PANEL, 'WalletSelectDropDown:open');");
if (m === 'rowBack') wallet = swap(wallet, 'const walletPanelOverlay =', '/* <div id="WALLET_SELECT_ROW"> */ const walletPanelOverlay =');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the three wallet panel ids exist with their names: WALLET_PANEL, WALLET_LOGO, WALLET_META_DATA', () => {
  for (const [name, id] of [['WALLET_PANEL', 167], ['WALLET_LOGO', 168], ['WALLET_META_DATA', 169]]) {
    assert.match(display, new RegExp(`  ${name} = ${id},`), name + ' id');
    assert.match(display, new RegExp(`\\[SP_COIN_DISPLAY\\.${name}\\]: '${name}',`), name + ' name');
  }
});

await test('REMOTE_WALLET_LIST is gone: not an id or a name, not an ACTIVE_LIST_PANEL mode, child or default-tree node; the one wallet list is WALLET_LIST_SELECT_PANEL, a leaf of the account list', () => {
  assert.doesNotMatch(display, /REMOTE_WALLET_LIST = \d+,/);
  assert.doesNotMatch(display, /\[SP_COIN_DISPLAY\.REMOTE_WALLET_LIST\]/);
  assert.doesNotMatch(groups, /REMOTE_WALLET_LIST/);
  assert.doesNotMatch(registry, /REMOTE_WALLET_LIST/);
  assert.doesNotMatch(tree, /REMOTE_WALLET_LIST/);
  assert.match(registry, /def\(\{ id: SP\.LOCAL_ACCOUNT_WALLET_LIST, kind: 'flag', children: \[SP\.ADD_WALLET_ACCOUNT, SP\.WALLET_LIST_SELECT_PANEL\] \}\)/);
  assert.match(tree, /node\(SP\.WALLET_LIST_SELECT_PANEL, false\),\n          \]\),/);
});

await test('WALLET_PANEL is a branch under ASSET_RADIO_PANELS with its own LOGO and META_DATA children, like NETWORK_PANEL: in the radio group, the registry and the default tree', () => {
  assert.match(groups, /export const ASSET_RADIO_PANELS_CHILDREN = \[[^\]]*SP\.NETWORK_PANEL,\n  SP\.WALLET_PANEL,\n\]/);
  // 2026-11-09 (owner): LOGO first, then META_DATA, the order ACCOUNT_PANEL has
  assert.match(registry, /const WALLET_PANEL_CHILDREN: readonly SP\[\] = \[\n  SP\.WALLET_LOGO,\n  SP\.WALLET_META_DATA,\n\]/);
  assert.match(registry, /def\(\{ id: SP\.WALLET_PANEL, kind: 'panel', children: WALLET_PANEL_CHILDREN \}\)/);
  assert.match(tree, /node\(SP\.WALLET_PANEL, false, \[\n          node\(SP\.WALLET_LOGO, true\),\n          node\(SP\.WALLET_META_DATA, true\),\n        \]\),/);
  assert.match(registry, /const NETWORK_PANEL_CHILDREN: readonly SP\[\] = \[\n  SP\.NETWORK_LOGO,\n  SP\.NETWORK_META_DATA,\n\]/);
  assert.match(registry, /const TOKEN_CONTRACT_PANEL_CHILDREN: readonly SP\[\] = \[\n  SP\.TOKEN_LOGO,\n  SP\.TOKEN_META_DATA,\n\]/);
  assert.match(tree, /node\(SP\.NETWORK_PANEL, false, \[\n          node\(SP\.NETWORK_LOGO, true\),\n          node\(SP\.NETWORK_META_DATA, true\),\n        \]\),/);
  assert.match(tree, /node\(SP\.TOKEN_PANEL, false, \[\n          node\(SP\.TOKEN_LOGO, true\),\n          node\(SP\.TOKEN_META_DATA, true\),\n        \]\),/);
});

await test('the BUILT spcoin-common agrees: the ids resolve, REMOTE_WALLET_LIST is gone and the panel is an ASSET_RADIO_PANELS child (no mutant: this reads dist)', async () => {
  if (m) return; // the mutants break sources only
  const mod = await import(pathToFileURL(path.join(COMMON, 'dist', 'panels', 'index.js')).href);
  const SP = mod.SP_COIN_DISPLAY;
  assert.deepEqual([SP.WALLET_PANEL, SP.WALLET_LOGO, SP.WALLET_META_DATA], [167, 168, 169]);
  assert.equal(SP.REMOTE_WALLET_LIST, undefined, 'REMOTE_WALLET_LIST is gone');
  assert.equal(SP.WALLET_LIST_SELECT_PANEL, 171);
  assert.ok(mod.ASSET_RADIO_PANELS_CHILDREN.includes(SP.WALLET_PANEL));
  assert.equal(new Set(Object.values(SP).filter((v) => typeof v === 'number')).size, Object.values(SP).filter((v) => typeof v === 'number').length, 'no id is used twice');
});

await test('the list host no longer has a wallet-list case: REMOTE_WALLET_LIST is not handled and WalletListPanel is not imported there', () => {
  assert.doesNotMatch(host, /REMOTE_WALLET_LIST/);
  assert.doesNotMatch(host, /WalletListPanel/);
});

await test('the hosted pill: the chevron opens WALLET_LIST_SELECT_PANEL (and only the chevron by default), the icon opens WALLET_PANEL, a pick wins over the active wallet', () => {
  assert.match(hosted, /restrictRowClickToChevron = true/);
  assert.match(hosted, /openPanel\(SP_COIN_DISPLAY\.WALLET_LIST_SELECT_PANEL, 'WalletSelectDropDown:open'\);/);
  assert.match(hosted, /const listOpen = usePanelVisible\(SP_COIN_DISPLAY\.WALLET_LIST_SELECT_PANEL\);/);
  assert.doesNotMatch(hosted, /REMOTE_WALLET_LIST/);
  assert.match(hosted, /openPanel\(SP_COIN_DISPLAY\.WALLET_PANEL, 'WalletSelectDropDown:icon'\);/);
  assert.match(hosted, /walletName=\{walletName \?\? picked\}/);
});

await test('MeritWallet has no pill row of its own any more, still shows WALLET_PANEL, and the host contract no longer lists showWalletSelect', () => {
  assert.doesNotMatch(wallet, /WALLET_SELECT_ROW/);
  assert.doesNotMatch(wallet, /showWalletSelect/);
  assert.doesNotMatch(wallet, /REMOTE_WALLET_LIST/);
  assert.match(wallet, /const walletPanelOverlay = walletPanelVisible \? React\.createElement\(WalletPanel,/);
  assert.match(wallet, /networkDetailOverlay \?\? walletPanelOverlay \?\?/);
  assert.match(contract, /'activeWalletId' \| 'nativeWalletId' \| 'walletConnection' \| 'onDisconnectWallet' \| 'walletAssetBaseUrl'/);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
