// File: test/webSigner.test.mjs
//
// Guards the web app's signing choke point (docs/design/accountAuthDesign.txt rows 3-5): getConnectedSigner must choose the signer through the authenticator resolver and the web registry, not through an
// inline per-network if, and both web authenticators must be registered with their ethers signers. Run: node test/webSigner.test.mjs   MUTANT=inlineBranch|missingInjected must fail.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
let getSigner = fs.readFileSync(path.join(WEB, 'lib', 'spCoin', 'getConnectedSigner.ts'), 'utf8');
let registry = fs.readFileSync(path.join(WEB, 'lib', 'spCoin', 'webAuthenticators.ts'), 'utf8');
if (process.env.MUTANT === 'inlineBranch') getSigner += "\nexport const x = async (authSource) => { if (authSource === 'merit') { return 1; } };\n";
if (process.env.MUTANT === 'missingInjected') registry = registry.replace('webAuthenticatorRegistry.register(withApprovalNotice(injectedWalletAuthenticator));', '');

const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

test('getConnectedSigner resolves its authenticator through the registry', () => {
  const body = getSigner.slice(getSigner.indexOf('export async function getConnectedSigner('));
  assert.ok(body.includes('resolveWebAuthenticator('), 'no resolver call');
  assert.ok(body.includes('.getEthersSigner(params)'), 'does not take the signer from the authenticator');
});
test('no inline per-network branch picks the signer any more', () => {
  assert.ok(!/if \(authSource === 'merit'\)/.test(getSigner), "an inline if (authSource === 'merit') is back");
});
test('both web authenticators are registered', () => {
  assert.ok(registry.includes('webAuthenticatorRegistry.register(serverKeystoreAuthenticator);'));
  assert.ok(registry.includes('webAuthenticatorRegistry.register(withApprovalNotice(injectedWalletAuthenticator));'));
});
// 2026-10-11 (docs/design/accountAuthDesign.txt section 15.7, item W2): the default is decided by the ACCOUNT (the dev keystore for an address it holds, the injected wallet for any other); the old chain rule
// ('merit' -> serverKeystore) survives only as the fallback while the keystore's account list has not loaded (see test/webDefaultAuthenticator.test.mjs for the rule itself).
test('the app default is account-based; the old chain rule is only the fallback', () => {
  assert.ok(registry.includes('webDefaultAuthenticatorId(accountAddress, networkAuthSource)'));
});
test('the old signer bodies are kept as exported functions', () => {
  assert.ok(/export async function getServerKeystoreSigner\(/.test(getSigner));
  assert.ok(/export async function getInjectedWalletSigner\(/.test(getSigner));
  assert.ok(getSigner.includes('requestMeritWriteApproval('), 'the Merit approval gate is gone from the server keystore signer');
  assert.ok(getSigner.includes('new BrowserProvider('), 'the injected wallet provider is gone');
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
