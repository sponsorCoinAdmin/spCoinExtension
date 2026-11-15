// File: test/webDefaultAuthenticator.test.mjs
//
// Guards docs/design/accountAuthDesign.txt section 15.7, item W2: which backend signs for an account is the ACCOUNT's business, not the chain's (lib/spCoin/webDefaultAuthenticator.ts): the dev keystore for an address it holds
// (any case), the injected wallet for any other, and the old network rule only while the keystore's account list has not loaded. Also: the SponsorCoin Lab no longer asks getNetworkAuthSource, and the shared signer
// resolution passes the network rule only as that fallback. Run: node test/webDefaultAuthenticator.test.mjs
// MUTANT=chainRuleWins|caseSensitive|labAsksChain run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(path.join(WEB, 'package.json'));
const ts = req('typescript');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(WEB, ...p), 'utf8').replace(/\r\n/g, '\n');

let src = read('lib', 'spCoin', 'webDefaultAuthenticator.ts');
if (m === 'chainRuleWins') src = src.replace("if (state.accounts.some((a) => a.address.toLowerCase() === key)) return KEYSTORE_ID;", "if (networkFallback === 'merit') return KEYSTORE_ID;\n  if (state.accounts.some((a) => a.address.toLowerCase() === key)) return KEYSTORE_ID;");
if (m === 'caseSensitive') src = src.replace('a.address.toLowerCase() === key', 'a.address === address');
let state = { hasPassword: null, locked: true, accounts: [] };
const mod = { exports: {} };
const idsMod = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path.join(WEB, 'lib', 'spCoin', 'webWalletIds.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: 'ids.ts' }).outputText)(idsMod, idsMod.exports);
const WALLET_IDS = idsMod.exports;
new Function('require', 'module', 'exports', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: 'x.ts' }).outputText)(
  (id) => (id === '@/components/wallet/lib/keystoreBridge' ? { getKeystoreBridgeState: () => state } : id === '@/lib/spCoin/webWalletIds' ? WALLET_IDS : {}), mod, mod.exports);
const { webDefaultAuthenticatorId } = mod.exports;

const A1 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A2 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

test('an address the dev keystore holds signs through the keystore, in any case, whatever the chain rule says', () => {
  state = { hasPassword: true, locked: false, accounts: [{ address: A1 }] };
  assert.equal(webDefaultAuthenticatorId(A1, 'metamask'), 'serverKeystore');
  assert.equal(webDefaultAuthenticatorId(A1.toLowerCase(), 'metamask'), 'serverKeystore');
  assert.equal(webDefaultAuthenticatorId(A1.toUpperCase().replace('0X', '0x'), undefined), 'serverKeystore');
});
test('any other address signs through the injected wallet, even when the chain rule says merit', () => {
  state = { hasPassword: true, locked: false, accounts: [{ address: A1 }] };
  assert.equal(webDefaultAuthenticatorId(A2, 'merit'), 'injected:io.metamask');
  assert.equal(webDefaultAuthenticatorId(A2), 'injected:io.metamask');
});
test('only while nothing is known (the keystore list has not loaded) does the old network rule apply, as a fallback', () => {
  state = { hasPassword: null, locked: true, accounts: [] };
  assert.equal(webDefaultAuthenticatorId(A1, 'merit'), 'serverKeystore');
  assert.equal(webDefaultAuthenticatorId(A1, 'metamask'), 'injected:io.metamask');
  assert.equal(webDefaultAuthenticatorId(A1), 'injected:io.metamask');
  state = { hasPassword: true, locked: false, accounts: [] };
  assert.equal(webDefaultAuthenticatorId(A1, 'merit'), 'serverKeystore', 'an empty list is still "nothing known"');
});
test('the SponsorCoin Lab does not ask the chain which backend signs (it asks the wallet about the account)', () => {
  let lab = read('app', '(menu)', '(dynamic)', 'SponsorCoinLab', 'hooks', 'useSponsorCoinLabNetwork.ts');
  if (m === 'labAsksChain') lab += "\nconst x = getNetworkAuthSource(1);\n";
  const code = lab.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.ok(!/getNetworkAuthSource\s*\(/.test(code), 'the Lab still calls getNetworkAuthSource');
  assert.ok(code.includes('webWallet.backendIdFor('), 'the Lab does not use the wallet');
});
test('getConnectedSigner hands the network rule to the resolver only as the fallback (webDefaultAuthenticatorId decides)', () => {
  const resolver = read('lib', 'spCoin', 'webAuthenticators.ts');
  assert.ok(resolver.includes('webDefaultAuthenticatorId(accountAddress, networkAuthSource)'));
  assert.ok(resolver.includes('appDefault: (account): AuthenticatorId => webDefaultAuthenticatorId(account.address)'));
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
