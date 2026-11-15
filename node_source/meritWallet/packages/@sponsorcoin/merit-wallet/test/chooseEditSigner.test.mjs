// File: test/chooseEditSigner.test.mjs
//
// docs/design/accountAuthDesign.txt V4 and row 13 (lib/spCoin/chooseEditSigner.ts, used by the Edit / Create Account page): who signs a profile save. The account's own wallet first (the browser wallet or the Merit extension, when it is the active account and the person chose
// that wallet for it); otherwise as before: the dev keystore for an address it holds, the connected MetaMask account when it is the one edited, else the dev keystore. Run: node test/chooseEditSigner.test.mjs
// MUTANT=walletIgnoresActive|anyWalletCounts|keystoreFirst|caseSensitive|defaultFlipped|pageIgnoresChooser run against deliberately broken copies and must report failures.
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
let src = read('lib', 'spCoin', 'chooseEditSigner.ts');
const swap = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
if (m === 'walletIgnoresActive') swap('requested && activeAddress && same(requested, activeAddress) && activeAuthenticatorId', 'requested && activeAuthenticatorId');
if (m === 'anyWalletCounts') swap('WALLET_SIGNERS.includes(activeAuthenticatorId)', 'true');
const WALLET_LINE = "if (requested && activeAddress && same(requested, activeAddress) && activeAuthenticatorId && WALLET_SIGNERS.includes(activeAuthenticatorId)) return 'wallet';";
const KEYSTORE_LINE = "if (hardhatIndex >= 0) return 'ec2-base';";
if (m === 'keystoreFirst') swap(WALLET_LINE + String.fromCharCode(10) + '  ' + KEYSTORE_LINE, KEYSTORE_LINE + String.fromCharCode(10) + '  ' + WALLET_LINE);
if (m === 'caseSensitive') swap('a.trim().toLowerCase() === b.trim().toLowerCase()', 'a === b');
if (m === 'defaultFlipped') swap("return hardhatSignerAvailable ? 'ec2-base' : 'metamask';", "return hardhatSignerAvailable ? 'metamask' : 'ec2-base';");
let page = read('app', '(menu)', '(dynamic)', '(accounts)', 'EditAccount', 'EditAccountPageClient.tsx');
if (m === 'pageIgnoresChooser') page = page.replace('const authSignerSource = chooseEditSigner({', "const authSignerSource = (() => 'ec2-base')({");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)((id) => req(id), mod, mod.exports);
const { chooseEditSigner } = mod.exports;

const A = '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25';
const base = { requested: A, hardhatIndex: -1, metamaskAddress: '', activeAddress: '', activeAuthenticatorId: undefined, hardhatSignerAvailable: true };
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the browser wallet signs when it is the active account being edited, even for an address the dev keystore also holds', () => {
  assert.equal(chooseEditSigner({ ...base, activeAddress: A, activeAuthenticatorId: 'browserVault' }), 'wallet');
  assert.equal(chooseEditSigner({ ...base, hardhatIndex: 3, activeAddress: A, activeAuthenticatorId: 'browserVault' }), 'wallet');
});

await test('the Merit extension signs the same way', () => {
  assert.equal(chooseEditSigner({ ...base, activeAddress: A, activeAuthenticatorId: 'injected:org.sponsorcoin.merit' }), 'wallet');
});

await test('only the wallets that have their own screen count: the dev keystore, MetaMask or nothing chosen do not make it "wallet"', () => {
  for (const id of ['serverKeystore', 'injected:io.metamask', undefined]) assert.notEqual(chooseEditSigner({ ...base, activeAddress: A, activeAuthenticatorId: id }), 'wallet', String(id));
});

await test('an account that is not the one being edited does not decide: the edited one falls to the old rules', () => {
  const other = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  assert.equal(chooseEditSigner({ ...base, activeAddress: other, activeAuthenticatorId: 'browserVault', hardhatIndex: 2 }), 'ec2-base');
  assert.equal(chooseEditSigner({ ...base, activeAddress: '', activeAuthenticatorId: 'browserVault' }), 'ec2-base');
});

await test('addresses compare without case', () => {
  assert.equal(chooseEditSigner({ ...base, requested: A.toLowerCase(), activeAddress: A.toUpperCase().replace('0X', '0x'), activeAuthenticatorId: 'browserVault' }), 'wallet');
});

await test('the old rules are unchanged: the dev keystore for its address, the connected MetaMask account when it is the one edited, else the dev keystore (MetaMask when there is none)', () => {
  assert.equal(chooseEditSigner({ ...base, hardhatIndex: 1 }), 'ec2-base');
  assert.equal(chooseEditSigner({ ...base, metamaskAddress: A }), 'metamask');
  assert.equal(chooseEditSigner({ ...base, hardhatIndex: 1, metamaskAddress: A }), 'ec2-base');
  assert.equal(chooseEditSigner({ ...base }), 'ec2-base');
  assert.equal(chooseEditSigner({ ...base, hardhatSignerAvailable: false }), 'metamask');
});

await test('the page asks this function, and a wallet signer needs no connection of its own and signs for the active account', () => {
  assert.match(page, /const authSignerSource = chooseEditSigner\(\{/);
  assert.match(page, /authSignerSource === 'wallet'\n\s+\? true/);
  assert.match(page, /activeAddress: authSignerSource === 'wallet' \? appActiveAddress \|\| undefined/);
  assert.match(page, /!requestedMatchesMetaMask &&\n\s+authSignerSource !== 'wallet'/);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
