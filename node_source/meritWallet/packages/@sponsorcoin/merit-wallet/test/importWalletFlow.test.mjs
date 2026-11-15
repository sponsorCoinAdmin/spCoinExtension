// File: test/importWalletFlow.test.mjs
//
// docs/design/accountAuthDesign.txt section 17 item 2 (Import a wallet, the shared Add a Wallet/Account flow, src/account/AddAccountFlow.tsx): the menu row opens an Import a wallet screen instead of doing nothing; the screen checks the phrase and shows the first account BEFORE anything is imported
// (the form's button stays disabled without that preview); the host is handed the phrase normalised; a host that cannot import shows the row disabled with a reason, never a silent dead row; the form's note no longer says "dev/test use only". Checked live in the real extension
// (scripts/live/extensionImportWallet.cjs). Run: node test/importWalletFlow.test.mjs
// MUTANT=menuDoesNothing|noDefaultReason|phraseNotNormalised|noPreviewGate|oldNoteBack|screenMissing run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const NODE_SOURCE = path.join(PKG, '..', '..', '..', '..');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let flow = read(PKG, 'src', 'account', 'AddAccountFlow.tsx');
let wallet = read(PKG, 'src', 'MeritWallet.tsx');
let screens = read(NODE_SOURCE, 'spCoinPanels', 'packages', '@sponsorcoin', 'spcoin-panels', 'src', 'AccountManagementScreens.tsx');
if (m === 'menuDoesNothing') wallet = swap(wallet, ": SP_COIN_DISPLAY.IMPORT_A_WALLET, 'MeritWallet:addAccounts:leaf'", ": undefined, 'MeritWallet:addAccounts:leaf'");
if (m === 'noDefaultReason') flow = swap(flow, "if (!host.importWallet) unavailable.importWallet ??= 'Importing a wallet is not available here.';", '');
if (m === 'phraseNotNormalised') flow = swap(flow, 'host.importWallet!(normalizeMnemonic(phrase), target?.id)', 'host.importWallet!(phrase, target?.id)');
if (m === 'noPreviewGate') screens = swap(screens, '<PrimaryButton disabled={!previewAddress || isImporting} onClick={onImport}>\n        {isImporting ? \'Importing...\' : \'Import Wallet\'}', '<PrimaryButton disabled={isImporting} onClick={onImport}>\n        {isImporting ? \'Importing...\' : \'Import Wallet\'}');
if (m === 'oldNoteBack') screens = swap(screens, 'It is kept beside your other wallets and', 'dev/test use only. It is kept beside your other wallets and');
if (m === 'screenMissing') flow = swap(flow, "{flow.importWalletVisible && (", '{false && (');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the host can import a whole wallet (a phrase), and the flow has a screen for it', () => {
  assert.match(flow, /importWallet\?\(mnemonic: string, targetId\?: AuthenticatorId\): Promise<void>;/);
  // the screen is driven by the panel tree (IMPORT_A_WALLET), not by a local screen state
  assert.match(flow, /\{flow\.importWalletVisible && \(\n\s+<ImportWalletForm/);
  assert.doesNotMatch(flow, /type Screen\s*=|\[screen, setScreen\]/);
});

await test('the Add Account(s) drop-down option "Import Wallet" opens that screen (the Add menu is gone, 2026-11-12)', () => {
  assert.match(wallet, /: SP_COIN_DISPLAY\.IMPORT_A_WALLET, 'MeritWallet:addAccounts:leaf'/);
  assert.doesNotMatch(flow, /<AddWalletMenu/);
});

await test('a host that cannot import shows the row disabled with a reason', () => {
  assert.match(flow, /if \(!host\.importWallet\) unavailable\.importWallet \?\?= 'Importing a wallet is not available here\.';/);
});

await test('the phrase is checked before anything is imported and handed to the host normalised; the button is disabled without a preview of the first account', () => {
  assert.match(flow, /const phraseInvalid = phraseWords >= 12 && !phraseValid;/);
  assert.match(flow, /const phrasePreview = phraseValid \? firstAddressOfMnemonic\(phrase\) : '';/);
  assert.match(flow, /host\.importWallet!\(normalizeMnemonic\(phrase\), target\?\.id\)/);
  assert.match(screens.slice(screens.indexOf('export function ImportWalletForm')), /<PrimaryButton disabled=\{!previewAddress \|\| isImporting\} onClick=\{onImport\}>/);
});

await test('the form\'s note says what really happens (kept beside the other wallets, encrypted with the wallet password), not "dev/test use only"', () => {
  assert.match(screens, /It is kept beside your other wallets and\n\s+encrypted with your wallet password/);
  const form = screens.slice(screens.indexOf('export function ImportWalletForm'));
  assert.doesNotMatch(form.slice(0, 900), /dev\/test use only/);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
