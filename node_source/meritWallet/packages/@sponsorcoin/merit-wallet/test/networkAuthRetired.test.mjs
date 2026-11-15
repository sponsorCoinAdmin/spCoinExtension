// File: test/networkAuthRetired.test.mjs
//
// Row 8 of docs/design/accountAuthDesign.txt (10.3): the per-NETWORK authorization setting is RETIRED. Which wallet signs is the account's business; the network never chooses. What is left is one fixed chain rule (the dev keystore on
// Hardhat, the injected wallet everywhere else) that nothing can change, nothing stores, and no screen offers a toggle for: no setter or hook in authSource.ts, no stored authSourceByChain, no Merit / MM radios on the network lists
// (web, the floating network picker, the package's own wallet used by the extension), and the walletState no longer copies an account choice into a chain setting. Run: node test/networkAuthRetired.test.mjs
// MUTANT=settable|hookBack|storedAgain|toggleBack|packageToggleBack|walletStateSync|ruleInverted|feedsKeepIt|panelsKeepIt run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(path.join(WEB, 'package.json'));
const ts = req('typescript');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(WEB, ...p), 'utf8').replace(/\r\n/g, '\n');
const add = (text, extra) => text + '\n' + extra + '\n';

let authSource = read('components', 'wallet', 'lib', 'meritConnect', 'authSource.ts');
if (m === 'settable') authSource = add(authSource, 'export function setNetworkAuthSource(chainId: number, source: string) { return source; }');
if (m === 'hookBack') authSource = add(authSource, 'export function useNetworkAuthSource(chainId: number) { return [chainId, () => undefined]; }');
if (m === 'ruleInverted') authSource = authSource.replace("? 'merit' : 'metamask'", "? 'metamask' : 'merit'");
let networks = read('components', 'wallet', 'lib', 'networks.tsx');
if (m === 'toggleBack') networks = add(networks, 'export function NetworkAuthToggle() { return null; }');
let storage = read('components', 'wallet', 'lib', 'meritWalletStorage.ts');
if (m === 'storedAgain') storage = storage.replace('export interface MeritWalletLS {', 'export interface MeritWalletLS {\n  authSourceByChain: Record<number, string>;');
let pkg = read('node_source', 'meritWallet', 'packages', '@sponsorcoin', 'merit-wallet', 'src', 'MeritWallet.tsx');
if (m === 'packageToggleBack') pkg = add(pkg, 'const rowProps = { onAuthSourceChange: () => undefined };');
let walletState = read('components', 'wallet', 'lib', 'walletState.tsx');
if (m === 'feedsKeepIt') feedsTypes = add(feedsTypes, 'export interface X { defaultAuthSource: string }');
if (m === 'panelsKeepIt') panelsRow = add(panelsRow, 'function AuthToggle() { return null; }');
if (m === 'walletStateSync') walletState = add(walletState, 'const syncNetworkAuthSourceToWalletSource = () => undefined;');
let feedsTypes = read('node_source', 'spCoinFeeds', 'packages', '@sponsorcoin', 'spcoin-feeds', 'src', 'networks', 'types.ts');
let panelsRow = read('node_source', 'spCoinPanels', 'packages', '@sponsorcoin', 'spcoin-panels', 'src', 'NetworkListRow.tsx');
let popup = read('app', '(menu)', '(dynamic)', 'SpCoinAccessController', 'components', 'NetworkSelectionPopup.tsx');

// the fixed rule, run for real
const js = ts.transpileModule(authSource.replace(/import[^\n]*keystore[^\n]*\n/, 'const MERIT_WALLET_HARDHAT_CHAIN_ID = 31337;\n').replace(/import type[^\n]*\n/, '').replace(/export type \{[^\n]*\n/, ''), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)(req, mod, mod.exports);
const { getNetworkAuthSource } = mod.exports;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the chain rule is fixed: the dev keystore on Hardhat, the injected wallet on every other chain', () => {
  assert.equal(getNetworkAuthSource(31337), 'merit');
  for (const id of [1, 10, 8453, 11155111, 137]) assert.equal(getNetworkAuthSource(id), 'metamask', String(id));
});

await test('nothing can change the rule: no setter and no hook in authSource.ts, none exported by the meritConnect index', () => {
  assert.doesNotMatch(authSource, /setNetworkAuthSource|useNetworkAuthSource|localStorage|useState/);
  assert.deepEqual(Object.keys(mod.exports), ['getNetworkAuthSource']);
  const index = read('components', 'wallet', 'lib', 'meritConnect', 'index.ts');
  assert.doesNotMatch(index, /setNetworkAuthSource|useNetworkAuthSource/);
});

await test('nothing is stored: the saved wallet settings have no per-network source', () => {
  assert.doesNotMatch(storage, /authSourceByChain/);
});

await test('no screen offers it: no NetworkAuthToggle, no per-row source on the web network list, the floating picker or the package wallet', () => {
  assert.doesNotMatch(networks, /NetworkAuthToggle|onAuthSourceChange|authSource:/);
  assert.doesNotMatch(popup, /NetworkAuthToggle/);
  assert.doesNotMatch(pkg, /onAuthSourceChange|networkAuthSources|authSource: /);
});

await test('the shared libraries carry nothing of it either: no defaultAuthSource / authSource in the networks feed, no AuthToggle in the panels network row', () => {
  assert.doesNotMatch(feedsTypes, /AuthSource|authSource/);
  assert.doesNotMatch(panelsRow, /AuthToggle|AuthSource|authSource|groupId/);
});

await test('selecting an account no longer copies the choice into a network setting', () => {
  assert.doesNotMatch(walletState, /syncNetworkAuthSourceToWalletSource|setNetworkAuthSource/);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
