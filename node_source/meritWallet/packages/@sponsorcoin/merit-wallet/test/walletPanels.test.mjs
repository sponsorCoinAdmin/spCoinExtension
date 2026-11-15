// File: test/walletPanels.test.mjs
//
// 2026-10-13 (owner request): REMOTE_WALLET_LIST under ACTIVE_LIST_PANEL (the data list of wallets), WALLET_PANEL as a new branch under ASSET_RADIO_PANELS (the active wallet's account.json), and the WalletSelectDropDown just under the tabs, whose DOWN chevron opens the list.
// Pinned: the four new panel ids and their names, their place in the registry, the radio groups and the default panel tree (the built spcoin-common is also loaded and asked), the list mode of ActiveListPanelHost, the hosted pill (chevron-only open, icon opens
// WALLET_PANEL, a pick wins over the active wallet), the overlay slot for WALLET_PANEL, the pill row under the tabs (not on the lock screen) in MeritWallet, and the host-contract classification of its new props. Run: node test/walletPanels.test.mjs
// MUTANT=notInModes|notInAssetRadio|noRegistryChild|noTreeNode|rowAfterBody|rowOnLockScreen|rowAlwaysChevron|iconNoPanel|pickLoses|noListMode run against deliberately broken copies and must report failures.
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
if (m === 'notInModes') groups = swap(groups, '  SP.REMOTE_WALLET_LIST,\n] as const', '] as const');
if (m === 'notInAssetRadio') groups = swap(groups, '  SP.NETWORK_PANEL,\n  SP.WALLET_PANEL,\n]', '  SP.NETWORK_PANEL,\n]');
if (m === 'noRegistryChild') registry = swap(registry, 'SP.REMOTE_TOKEN_LIST, SP.REMOTE_WALLET_LIST] }', 'SP.REMOTE_TOKEN_LIST] }');
if (m === 'noTreeNode') tree = swap(tree, '          node(SP.REMOTE_WALLET_LIST, false),\n', '');
if (m === 'rowAfterBody') {
  // the pill row moved BELOW the body instead of just under the tabs
  const bodyLine = '<WalletRadioPanels>{bodyWithTab}{stakingListNode}</WalletRadioPanels>';
  const rowStart = wallet.indexOf('{showWalletSelect &&');
  const bodyIdx = wallet.indexOf(bodyLine, rowStart);
  assert.ok(rowStart > 0 && bodyIdx > rowStart, 'mutant anchor missing: row before body');
  wallet = wallet.slice(0, rowStart) + bodyLine + String.fromCharCode(10) + wallet.slice(rowStart, bodyIdx) + wallet.slice(bodyIdx + bodyLine.length);
}
if (m === 'rowOnLockScreen') wallet = swap(wallet, '{showWalletSelect && !passwordPanelShowing && panelTreeListOpen', '{showWalletSelect && panelTreeListOpen');
if (m === 'rowOnTabPages') wallet = swap(wallet, "{showWalletSelect && !remoteSelection && !passwordPanelShowing && panelTreeListOpen && walletListVisible && !addMenuVisible && !walletListLeafVisible && (", '{showWalletSelect && !passwordPanelShowing && (');
if (m === 'rowAlwaysChevron') hosted = swap(hosted, 'restrictRowClickToChevron = true', 'restrictRowClickToChevron = false');
if (m === 'iconNoPanel') hosted = swap(hosted, "openPanel(SP_COIN_DISPLAY.WALLET_PANEL, 'WalletSelectDropDown:icon');", '');
if (m === 'pickLoses') hosted = swap(hosted, 'walletName={walletName ?? picked}', 'walletName={walletName}');
if (m === 'noListMode') host = swap(host, '    case SP_COIN_DISPLAY.REMOTE_WALLET_LIST:', '    case -1:');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the four ids exist with their names: REMOTE_WALLET_LIST, WALLET_PANEL, WALLET_LOGO, WALLET_META_DATA', () => {
  for (const [name, id] of [['REMOTE_WALLET_LIST', 166], ['WALLET_PANEL', 167], ['WALLET_LOGO', 168], ['WALLET_META_DATA', 169]]) {
    assert.match(display, new RegExp(`  ${name} = ${id},`), name + ' id');
    assert.match(display, new RegExp(`\\[SP_COIN_DISPLAY\\.${name}\\]: '${name}',`), name + ' name');
  }
});

await test('REMOTE_WALLET_LIST is a content-kind child of ACTIVE_LIST_PANEL: in its modes (exactly one open), in its registry children, in the default tree under it', () => {
  assert.match(groups, /export const ACTIVE_LIST_PANEL_MODES = \[[^\]]*SP\.REMOTE_WALLET_LIST,[^\]]*\]/);
  assert.match(registry, /id: SP\.ACTIVE_LIST_PANEL, kind: 'panel', defaultVisible: false, children: \[[^\]]*SP\.REMOTE_WALLET_LIST\]/);
  assert.match(registry, /def\(\{ id: SP\.REMOTE_WALLET_LIST, kind: 'flag' \}\)/);
  assert.match(tree, /node\(SP\.REMOTE_TOKEN_LIST, false\),\n          node\(SP\.REMOTE_WALLET_LIST, false\),\n        \]\),/);
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

await test('the BUILT spcoin-common agrees: the ids resolve, the list is an ACTIVE_LIST_PANEL mode and the panel an ASSET_RADIO_PANELS child (no mutant: this reads dist)', async () => {
  if (m) return; // the mutants break sources only
  const mod = await import(pathToFileURL(path.join(COMMON, 'dist', 'panels', 'index.js')).href);
  const SP = mod.SP_COIN_DISPLAY;
  assert.deepEqual([SP.REMOTE_WALLET_LIST, SP.WALLET_PANEL, SP.WALLET_LOGO, SP.WALLET_META_DATA], [166, 167, 168, 169]);
  assert.ok(mod.ACTIVE_LIST_PANEL_MODES.includes(SP.REMOTE_WALLET_LIST));
  assert.ok(mod.ASSET_RADIO_PANELS_CHILDREN.includes(SP.WALLET_PANEL));
  assert.equal(new Set(Object.values(SP).filter((v) => typeof v === 'number')).size, Object.values(SP).filter((v) => typeof v === 'number').length, 'no id is used twice');
});

await test('the list host shows the wallet list when REMOTE_WALLET_LIST is open, remembers the pick, tells the host, and closes the list', () => {
  assert.match(host, /case SP_COIN_DISPLAY\.REMOTE_WALLET_LIST:\n\s+return \(\n\s+<div id="ACTIVE_LIST_PANEL"[^\n]*\n\s+<WalletListPanel/);
  assert.match(host, /walletSelectionStore\.set\(slug\);\n\s+walletList\?\.onSelect\?\.\(slug\);\n\s+closeActiveListPanel\('WalletList:select'\);/);
});

await test('the hosted pill: the chevron opens REMOTE_WALLET_LIST (and only the chevron by default), the icon opens WALLET_PANEL, a pick wins over the active wallet', () => {
  assert.match(hosted, /restrictRowClickToChevron = true/);
  assert.match(hosted, /openActiveListPanel\(null, 'WalletSelectDropDown:open', SP_COIN_DISPLAY\.REMOTE_WALLET_LIST\)/);
  assert.match(hosted, /const listOpen = usePanelVisible\(SP_COIN_DISPLAY\.REMOTE_WALLET_LIST\) \|\| leafOpen;/);
  assert.match(hosted, /openPanel\(SP_COIN_DISPLAY\.WALLET_PANEL, 'WalletSelectDropDown:icon'\);/);
  assert.match(hosted, /walletName=\{walletName \?\? picked\}/);
});

await test('MeritWallet puts the wallet pill just under the tabs (after the tab bar opens, before the body), not on the lock screen, and shows WALLET_PANEL itself', () => {
  assert.match(wallet, /const pillWalletId = nativeWalletId \?\? activeWalletId \?\? \(activeGroupId === 'hardhat' \? 'serverKeystore'/);
  assert.match(wallet, /\{showWalletSelect && !remoteSelection && !passwordPanelShowing && panelTreeListOpen && walletListVisible && !addMenuVisible && !walletListLeafVisible && \(\n\s+<div id="WALLET_SELECT_ROW"[^\n]*\n\s+<WalletSelectDropDownHosted walletId=\{pillWalletId\} displayName=\{pillWalletId \? walletName\(pillWalletId\) : undefined\} baseUrl=\{walletAssetBaseUrl\} \/>\n\s+<\/div>\n\s+\)\}\n\s+<WalletRadioPanels>\{bodyWithTab\}\{stakingListNode\}<\/WalletRadioPanels>/);
  assert.match(wallet, /const walletPanelOverlay = walletPanelVisible \? React\.createElement\(WalletPanel,/);
  assert.match(wallet, /networkDetailOverlay \?\? walletPanelOverlay \?\?/);
  assert.match(contract, /'activeWalletId' \| 'nativeWalletId' \| 'walletConnection' \| 'onDisconnectWallet' \| 'showWalletSelect' \| 'walletAssetBaseUrl'/);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
