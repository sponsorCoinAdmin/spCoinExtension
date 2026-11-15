// File: test/unlockWhileSigning.test.mjs
//
// docs/design/accountAuthDesign.txt V4 (the browser wallet's "unlock while signing", found and fixed with a live run, scripts/live/browserWalletUnlockWhileSigning.cjs): (1) the browser wallet's AUTHENTICATOR asks to be unlocked before any signature, whoever calls it; (2) the profile
// page unlocks BEFORE its "wallet action in progress" screen goes up (that screen covered the unlock dialog and made it unclickable) and before the server is asked for anything; (3) the ethers signer uses the same gate, not a copy; (4) the cross-process catch-up no longer applies an
// empty "nothing saved" snapshot (revision 0), which used to wipe the active account a few seconds after a brand-new account was chosen. Run: node test/unlockWhileSigning.test.mjs
// MUTANT=authSkipsUnlock|typedSkipsUnlock|sendSkipsUnlock|hostUnlockAfterOverlay|signerCopy|emptyCatchUpApplied run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(WEB, ...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let auth = read('lib', 'spCoin', 'webAuthenticators.ts');
let host = read('lib', 'spCoin', 'webAccountFormHost.ts');
let vault = read('lib', 'spCoin', 'browserVault.ts');
let state = read('components', 'wallet', 'lib', 'useWalletExchangeContextSync.ts');
if (m === 'authSkipsUnlock') auth = swap(auth, "signMessage: async (address, message, display) => {\n    await unlockBrowserVaultForSigning();\n", "signMessage: async (address, message, display) => {\n");
if (m === 'typedSkipsUnlock') auth = swap(auth, "signTypedData: async (address, typedData) => {\n    await unlockBrowserVaultForSigning();\n", "signTypedData: async (address, typedData) => {\n");
if (m === 'sendSkipsUnlock') auth = swap(auth, "sendTransaction: async (tx) => {\n    await unlockBrowserVaultForSigning();\n", "sendTransaction: async (tx) => {\n");
if (m === 'hostUnlockAfterOverlay') host = swap(host, "if (authenticator.id === 'browserVault') await unlockBrowserVaultForSigning();\n", '');
if (m === 'signerCopy') vault = swap(vault, 'await unlockBrowserVaultForSigning(params.interactive);', 'await requestBrowserVaultUnlock();');
if (m === 'emptyCatchUpApplied') state = swap(state, 'if (entry.revision <= 0) {', 'if (false) {');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the browser wallet authenticator asks to be unlocked before signing a message, typed data or a transaction', () => {
  assert.match(auth, /signMessage: async \(address, message, display\) => \{\n\s+await unlockBrowserVaultForSigning\(\);\n\s+return getBrowserVaultAuthenticator\(\)\.signMessage\(address, message, display\);/);
  assert.match(auth, /signTypedData: async \(address, typedData\) => \{\n\s+await unlockBrowserVaultForSigning\(\);/);
  assert.match(auth, /sendTransaction: async \(tx\) => \{\n\s+await unlockBrowserVaultForSigning\(\);/);
});

await test('the profile page unlocks the browser wallet first (before the overlay and before the server is asked for anything)', () => {
  const unlock = host.indexOf("if (authenticator.id === 'browserVault') await unlockBrowserVaultForSigning();");
  const overlay = host.indexOf('runWithWalletAction(');
  assert.ok(unlock > 0 && overlay > 0 && unlock < overlay, 'the unlock must come before the overlay');
});

await test('the ethers signer and the authenticator share one gate (no copy of the unlock logic)', () => {
  assert.match(vault, /await unlockBrowserVaultForSigning\(params\.interactive\);/);
  assert.match(vault, /export async function unlockBrowserVaultForSigning\(interactive\?: boolean\)/);
});

await test('the catch-up from the server does not apply an empty "nothing saved" snapshot (revision 0), which wiped the active account of a new account', () => {
  assert.match(state, /if \(entry\.revision <= 0\) \{\n\s+appendDebugTrace\(`walletState:\$\{sourceLabel\}:skippedNothingSaved`, \{ key \}\);\n\s+return;/);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
