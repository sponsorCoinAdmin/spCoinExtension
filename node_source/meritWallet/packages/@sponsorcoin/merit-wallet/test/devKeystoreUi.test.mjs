// File: test/devKeystoreUi.test.mjs
//
// docs/design/accountAuthDesign.txt V4 and V6, and docs/design/accountAuthDesign.txt section 17 item 8, in the web app's screens: where the dev keystore is CLOSED (a public release answers 404 on every key route) the main wallet
// says so in plain words with where to go, the Config tab's Test Accounts section is not shown and the main wallet's create / import entries are disabled with the reason; the wallet page's cards say when a wallet is not installed and offer the install.
// Checked live (a normal dev server and one started with SPCOIN_PUBLIC_RELEASE=1). Run: node test/devKeystoreUi.test.mjs
// MUTANT=noHeaderLink|hookIgnoresStatus|testAccountsAlways|entriesAlwaysOpen|rawFailureText|noInstallNote|installUrlLost run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(WEB, ...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let hook = read('lib', 'spCoin', 'useDevKeystoreAvailable.ts');
let config = read('components', 'views', 'MeritWallet.tsx');
let manager = read('lib', 'spCoin', 'useWebAddAccountHost.ts');
let state = read('components', 'wallet', 'lib', 'useWebWalletPasswordSession.ts');
let provider = read('components', 'wallet', 'lib', 'walletState.tsx');
let panel = read('components', 'views', 'BrowserWalletPanel.tsx');
if (m === 'hookIgnoresStatus') hook = swap(hook, 'if (alive) setOpen(status.available);', 'if (alive) setOpen(true);');
if (m === 'testAccountsAlways') config = swap(config, 'configTestAccounts: showTestAccounts ? {', 'configTestAccounts: true ? {');
if (m === 'entriesAlwaysOpen') manager = swap(manager, 'devKeystoreOpen ? undefined : {', 'true ? undefined : {');
if (m === 'rawFailureText') state = swap(state, 'response.status === 404 ? DEV_WALLET_NOT_AVAILABLE', 'false ? DEV_WALLET_NOT_AVAILABLE');
if (m === 'noInstallNote') panel = swap(panel, '{reachable[c.id] === false ? (', '{false ? (');
if (m === 'installUrlLost') panel = swap(panel, "installUrl: 'https://metamask.io/download/'", "installUrl: ''");

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the dev keystore counts as open only when its own status says so (the probe reads the 404 of a public release)', () => {
  assert.match(hook, /serverKeystoreAuthenticator\.status\(\)\.then\(\(status\) => \{\n\s+if \(alive\) setOpen\(status\.available\);/);
});

await test('the Config tab shows Test Accounts only where the dev keystore is open', () => {
  assert.match(config, /const showTestAccounts = useDevKeystoreAvailable\(\);/);
  assert.match(config, /configTestAccounts: showTestAccounts \? \{ api: webTestAccountsApi, [^\n]+ : undefined,/);
});

await test('the main wallet\'s create / import entries are disabled with the reason where the dev keystore is closed', () => {
  assert.match(manager, /\.\.\.\(devKeystoreOpen \? \{\} : \{ createAccount: DEV_KEYSTORE_CLOSED, importAccount: DEV_KEYSTORE_CLOSED, importWallet: DEV_KEYSTORE_CLOSED \}\)/);
  assert.match(manager, /export const DEV_KEYSTORE_CLOSED = 'The development keystore is not available on this site\. Use the Wallet page \(\/Wallet\)/);
});

await test('a closed dev keystore (404) is said in plain words with where to go, not as a failed check', () => {
  assert.match(state, /response\.status === 404\s*\? DEV_WALLET_NOT_AVAILABLE\s*: 'Failed to check Merit Wallet password status\.'/);
  assert.match(provider, /DEV_WALLET_NOT_AVAILABLE = 'The development wallet is not available on this site\. Use the Wallet page \(\/Wallet\) or the Merit extension\.'/);
});

await test('a wallet card says when its wallet is not installed and offers the install (the extension download, the MetaMask page)', () => {
  assert.match(panel, /\{reachable\[c\.id\] === false \? \(/);
  assert.match(panel, /Install \{c\.title\}<\/a>/);
  assert.match(panel, /installUrl: '\/spCoinExtension\/spCoinExtension\.zip'/);
  assert.match(panel, /installUrl: 'https:\/\/metamask\.io\/download\/'/);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
