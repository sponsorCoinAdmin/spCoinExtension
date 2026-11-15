// File: test/phoneVault.test.mjs
//
// Conformance of the PHONE backend (src/vault/phoneVault.ts, docs/design/accountAuthDesign.txt 14.10.1, items V12 and W1e): a fake native key manager (PhoneKeyManager) stands in for the iOS Keychain / Android Keystore, and the
// two adapters must make it behave like every other backend through the SAME wallet code: the vault capability (biometric unlock, honest flags: no reveal, no backup, no password change), the authenticator (every
// signature behind the manager, a locked wallet is an error, raw signed transactions are broadcast by the app), and the Wallet / lock store (the screens follow the flags; unlock with no password uses the biometric).
// Run: node test/phoneVault.test.mjs
// MUTANT=revealAllowed|signWhileLocked|unknownAccountSigns|biometricIgnored|cancelAsWrong|broadcastSkipped run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(path.join(WEB, 'package.json'));
const ts = req('typescript');
const m = process.env.MUTANT;

const cache = new Map();
function load(rel) {
  const file = path.join(SRC, rel + '.ts');
  if (cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (rel === 'vault/phoneVault') {
    if (m === 'revealAllowed') src = src.replace("async revealPrivateKey() { throw new VaultError('unsupported', 'A phone wallet cannot show a private key: it never leaves the secure element.'); },", "async revealPrivateKey() { return '0xleaked'; },").replace('revealKey: false', 'revealKey: true');
    if (m === 'signWhileLocked') src = src.replace("if (!manager.isUnlocked()) throw new AuthenticatorError('locked', 'The wallet is locked. Unlock it with Face ID, a fingerprint or the device passcode.', 'deviceVault');", '');
    if (m === 'unknownAccountSigns') src = src.replace("if (!manager.accounts().some((a) => a.address.toLowerCase() === key)) throw new AuthenticatorError('unauthorized', `${address} is not an account of this phone's wallet.`, 'deviceVault');", '');
    if (m === 'biometricIgnored') src = src.replace("if (credential.kind !== 'biometric') throw new VaultError('unsupported', 'A phone wallet opens with Face ID, a fingerprint or the device passcode.');", '');
    if (m === 'cancelAsWrong') src = src.replace("throw new VaultError('locked', error.message || 'Unlock was cancelled.');", "throw new VaultError('wrong_credential', error.message || 'Unlock was cancelled.');");
    if (m === 'broadcastSkipped') src = src.replace('return { hash: await options.broadcast(raw, tx.chainId) };', "void raw; return { hash: '0xnotsent' };");
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? load(path.relative(SRC, path.resolve(path.dirname(file), id)).replace(/\\/g, '/')) : req(id)), mod, mod.exports);
  return mod.exports;
}
const { createPhoneVault, createPhoneAuthenticator, PhoneAuthError } = load('vault/phoneVault');
const { VaultError } = load('vault/vaultCapability');
const { AuthenticatorError } = load('auth/authenticator');
const { createWallet } = load('wallet/wallet');
const { createWalletLockStore } = load('wallet/walletLock');
const { createWalletSecurityApi } = load('wallet/walletSecurity');

const A1 = '0x1111111111111111111111111111111111111111';
const A2 = '0x2222222222222222222222222222222222222222';

function fakeManager({ setUp = true, biometric = 'pass' } = {}) {
  let isSetUp = setUp; let unlocked = false; let list = setUp ? [{ address: A1, name: 'Phone 1' }] : [];
  const listeners = new Set(); const notify = () => listeners.forEach((l) => l());
  const calls = [];
  const mgr = {
    platform: 'ios', calls,
    isAvailable: async () => true,
    isSetUp: async () => isSetUp,
    async setUp() { isSetUp = true; list = [{ address: A1, name: 'Phone 1' }]; notify(); return { recoveryPhrase: 'twelve words here', accounts: list }; },
    async authenticate(reason) {
      calls.push(['authenticate', reason]);
      if (biometric === 'cancel') throw new PhoneAuthError('cancelled', 'Cancelled');
      if (biometric === 'fail') throw new PhoneAuthError('failed', 'Face not recognised');
      if (biometric === 'lockout') throw new PhoneAuthError('locked_out', 'Too many tries', 30000);
      unlocked = true; notify();
    },
    isUnlocked: () => unlocked,
    lock() { unlocked = false; notify(); },
    accounts: () => list,
    async addAccount(name) { const a = { address: A2, name }; list = [...list, a]; notify(); return a; },
    async signMessage(address, message) { calls.push(['signMessage', address, message]); return '0xsig'; },
    async signTransaction(tx) { calls.push(['signTransaction', tx.from]); return '0xraw'; },
    async deleteWallet() { calls.push(['delete']); isSetUp = false; unlocked = false; list = []; notify(); },
    onChange(l) { listeners.add(l); return () => listeners.delete(l); },
    setBiometric(next) { biometric = next; },
  };
  return mgr;
}
const bio = { kind: 'biometric', value: '' };
const code = async (p) => { try { await p; return 'no error'; } catch (e) { return e instanceof VaultError || e instanceof AuthenticatorError ? e.code : 'other:' + (e && e.message); } };
const tick = () => new Promise((r) => setTimeout(r, 5));

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('vault: honest flags (biometric yes; reveal, backup, password change, import no) and the words for where the keys live', async () => {
  const v = createPhoneVault(fakeManager());
  assert.deepEqual(v.capabilities, { create: true, importPhrase: false, importKey: false, backup: false, changeCredential: false, delete: true, revealKey: false, revealPhrase: false, biometric: true });
  assert.equal(v.label, 'this phone');
  for (const call of [() => v.revealPrivateKey(bio, A1), () => v.revealRecoveryPhrase(bio), () => v.exportBackup(bio), () => v.importBackup('{}', bio), () => v.changeCredential(bio, bio), () => v.importKey('0x1'), () => v.importPhrase('x', bio)]) {
    assert.equal(await code(call()), 'unsupported');
  }
});
await test('vault: unlock needs the biometric credential and shows the prompt; failed, cancelled, locked out and unavailable map onto the one error set', async () => {
  const mgr = fakeManager();
  const v = createPhoneVault(mgr);
  assert.equal(await code(v.unlock({ kind: 'password', value: 'password-1' })), 'unsupported');
  assert.equal(mgr.calls.length, 0, 'a password must not open the biometric prompt');
  await v.unlock(bio);
  assert.equal(v.isUnlocked(), true);
  assert.deepEqual(mgr.calls[0], ['authenticate', 'Unlock your wallet']);
  v.lock();
  assert.equal(v.isUnlocked(), false);
  mgr.setBiometric('fail'); assert.equal(await code(v.unlock(bio)), 'wrong_credential');
  mgr.setBiometric('cancel'); assert.equal(await code(v.unlock(bio)), 'locked');
  mgr.setBiometric('lockout');
  try { await v.unlock(bio); assert.fail('should throw'); } catch (e) { assert.equal(e.code, 'locked_out'); assert.equal(e.retryAfterMs, 30000); }
});
await test('vault: set up once (the recovery phrase is returned once), not twice; no wallet yet is not_set_up on unlock; accounts only while unlocked', async () => {
  const mgr = fakeManager({ setUp: false });
  const v = createPhoneVault(mgr);
  assert.equal(await v.hasWallet(), false);
  assert.equal(await code(v.unlock(bio)), 'not_set_up');
  const made = await v.create(bio);
  assert.equal(made.recoveryPhrase, 'twelve words here');
  assert.equal(await v.hasWallet(), true);
  assert.equal(await code(v.create(bio)), 'already_set_up');
  v.lock();
  assert.equal(v.accounts().length, 0, 'locked: no account list');
  await v.unlock(bio);
  assert.equal(v.accounts().length, 1);
  assert.equal((await v.addAccount('Second')).address, A2);
});
await test('vault: delete asks the biometric first and removes the wallet; a refusal deletes nothing', async () => {
  const mgr = fakeManager();
  const v = createPhoneVault(mgr);
  mgr.setBiometric('cancel');
  assert.equal(await code(v.deleteWallet(bio)), 'locked');
  assert.equal(await v.hasWallet(), true);
  mgr.setBiometric('pass');
  await v.deleteWallet(bio);
  assert.equal(await v.hasWallet(), false);
});
await test('authenticator: signing is behind the manager; locked is an error; an address that is not the phone\'s is unauthorized; a declined prompt is user_rejected', async () => {
  const mgr = fakeManager();
  const a = createPhoneAuthenticator(mgr, { broadcast: async () => '0xhash' });
  assert.equal(a.id, 'deviceVault');
  assert.ok(a.vault);
  assert.equal(await code(a.signMessage(A1, 'hi')), 'locked');
  await a.vault.unlock(bio);
  assert.equal(await a.signMessage(A1, 'hi'), '0xsig');
  assert.equal(await code(a.signMessage(A2, 'hi')), 'unauthorized');
  mgr.signMessage = async () => { throw new PhoneAuthError('cancelled', 'No'); };
  assert.equal(await code(a.signMessage(A1, 'hi')), 'user_rejected');
  assert.deepEqual(await a.status(), { available: true, unlocked: true });
  assert.deepEqual((await a.accounts()).map((x) => x.address), [A1]);
});
await test('authenticator: a transaction is signed inside the manager and the RAW transaction is broadcast by the app, which supplies the hash', async () => {
  const mgr = fakeManager();
  const sent = [];
  const a = createPhoneAuthenticator(mgr, { broadcast: async (raw, chainId) => { sent.push([raw, chainId]); return '0xhash'; } });
  await a.vault.unlock(bio);
  const result = await a.sendTransaction({ from: A1, to: A2, value: 5n, chainId: 8453 });
  assert.deepEqual(sent, [['0xraw', 8453]]);
  assert.equal(result.hash, '0xhash');
});
await test('the wallet treats the phone like any backend: flags drive the screens, the lock store unlocks with the biometric, and there is no security section to show', async () => {
  const mgr = fakeManager();
  const wallet = createWallet({ appDefault: () => 'deviceVault' });
  wallet.register(createPhoneAuthenticator(mgr, { broadcast: async () => '0xhash' }));
  assert.equal(wallet.can('revealKey', A1), false);
  assert.equal(wallet.can('revealPhrase', A1), false);
  assert.equal(wallet.can('backup', A1), false);
  assert.equal(wallet.can('changeCredential', A1), false);
  assert.equal(wallet.can('biometric', A1), true);
  assert.equal(wallet.can('deleteWallet', A1), true);
  assert.equal(createWalletSecurityApi(wallet, A1), undefined);
  const info = wallet.backends()[0];
  assert.deepEqual([info.badge, info.where, info.keepsKeys], ['Device', 'this phone', true]);
  const lock = createWalletLockStore(wallet);
  await tick();
  assert.equal(lock.getState().phase, 'locked');
  assert.equal(await lock.submit(), true, 'no password given: the biometric is used');
  assert.equal(lock.getState().phase, 'unlocked');
  assert.deepEqual(mgr.calls[0], ['authenticate', 'Unlock your wallet']);
  assert.equal((await wallet.accounts())[0].badge, 'Device');
  await lock.lock();
  assert.equal(lock.getState().phase, 'locked');
  lock.dispose();
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
