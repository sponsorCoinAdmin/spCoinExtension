// File: test/walletProps.test.mjs
//
// Tests for what the component derives from the `wallet` a host passes (docs/design/accountAuthDesign.txt section 15.7, item W1b): src/wallet/walletLock.ts (the lock screen's state from the primary vault),
// walletSecurity.ts (the reveal screens from the active account's backend) and walletProps.tsx (deriveWalletProps, and mergeWalletProps: the host's own props win; screens the account's backend cannot do are removed).
// Fake backends; the real VaultError. Run: node test/walletProps.test.mjs
// MUTANT=derivesIgnored|hostDoesNotWin|noGating|lockIgnoresVaultChange|wrongErrorText|phraseAlwaysOffered|noneStillLocks|submitIgnoresBusy run against deliberately broken copies and must report failures.
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
  const ext = fs.existsSync(path.join(SRC, rel + '.tsx')) ? '.tsx' : '.ts';
  const file = path.join(SRC, rel + ext);
  if (cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (rel === 'wallet/walletProps') {
    if (m === 'hostDoesNotWin') src = src.replace('if (value !== undefined) merged[key] = value;', 'if (value !== undefined && !(key in merged)) merged[key] = value;');
    if (m === 'noGating') src = src.replace("if (out.onConfigDeleteWallet && !wallet.can('deleteWallet', activeAddress)) out.onConfigDeleteWallet = undefined;", '').replace("if (out.onConfigResetPassword && !wallet.can('changeCredential', activeAddress)) out.onConfigResetPassword = undefined;", '');
    if (m === 'derivesIgnored') src = src.replace("const derives = new Set<WalletDerivation>(input.derives ?? ALL_WALLET_DERIVATIONS);", 'const derives = new Set<WalletDerivation>(ALL_WALLET_DERIVATIONS);');
    if (m === 'noneStillLocks') src = src.replace("if (lock.phase === 'locked' || lock.phase === 'unlocked') {", "if (true) {");
  }
  if (rel === 'wallet/walletLock') {
    if (m === 'lockIgnoresVaultChange') src = src.replace('vaultOff = primary.vault.onChange(() => { void refresh(); });', 'vaultOff = () => undefined;');
    if (m === 'wrongErrorText') src = src.replace("if (error.code === 'wrong_credential') return 'Incorrect password.';", "if (error.code === 'wrong_credential') return 'Error';");
    if (m === 'submitIgnoresBusy') src = src.replace('if (state.submitting) return false;', '');
  }
  if (rel === 'wallet/walletSecurity' && m === 'phraseAlwaysOffered') src = src.replace('if (canPhrase) {', 'if (true) {');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true }, fileName: file }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  new Function('require', 'module', 'exports', js)((id) => {
    if (id === '../WalletSecuritySection') return { __esModule: true, default: function WalletSecuritySection() { return null; } };
    if (id === './AccountSigningSection') return { __esModule: true, default: function AccountSigningSection() { return null; } };
    if (id === './WalletBackupSection') return { __esModule: true, default: function WalletBackupSection() { return null; } };
    if (id.startsWith('.')) return load(path.relative(SRC, path.resolve(path.dirname(file), id)).replace(/\\/g, '/'));
    return req(id);
  }, mod, mod.exports);
  return mod.exports;
}
const { createWallet } = load('wallet/wallet');
const { createWalletLockStore, unlockErrorText } = load('wallet/walletLock');
const { createWalletSecurityApi } = load('wallet/walletSecurity');
const { deriveWalletProps, mergeWalletProps, authenticationTypeOf } = load('wallet/walletProps');
const { VaultError } = load('vault/vaultCapability');

const A1 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A2 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const flags = (over = {}) => ({ create: true, importPhrase: true, importKey: true, backup: true, changeCredential: true, delete: true, revealKey: true, revealPhrase: true, biometric: false, ...over });

function fakeVault({ where = 'this device', hasWallet = true, unlocked = false, password = 'right-password', vflags = flags() } = {}) {
  const listeners = new Set();
  const v = {
    label: where, capabilities: vflags,
    unlocked, attempts: 0,
    hasWallet: async () => hasWallet,
    isUnlocked: () => v.unlocked,
    async unlock(c) {
      v.attempts += 1;
      if (v.attempts > 3) throw new VaultError('locked_out', 'wait', 2500);
      if (c.value !== password) throw new VaultError('wrong_credential', 'Incorrect password.');
      v.unlocked = true; listeners.forEach((l) => l());
    },
    lock() { v.unlocked = false; listeners.forEach((l) => l()); },
    async revealPrivateKey(c, address) { if (c.value !== password) throw new VaultError('wrong_credential', 'x'); return '0xkey-of-' + address; },
    async revealRecoveryPhrase(c) { if (c.value !== password) throw new VaultError('wrong_credential', 'x'); return 'test test test'; },
    onChange(l) { listeners.add(l); return () => listeners.delete(l); },
    emit() { listeners.forEach((l) => l()); },
  };
  return v;
}
function backend(id, { accounts = [], vault, signing = {} } = {}) {
  return {
    id, label: id,
    capabilities: { signMessage: true, signTypedData: false, sendTransaction: true, listAccounts: true, createAccount: !!vault, importKey: !!vault, lock: !!vault, ...signing },
    vault,
    async status() { return { available: true, unlocked: true }; },
    async accounts() { return accounts.map((address) => ({ address })); },
    async signMessage() { return '0xsig'; }, async sendTransaction() { return { hash: '0xh' }; },
    onChange() { return () => undefined; },
  };
}
const make = (backends, appDefault) => {
  const w = createWallet({ appDefault: appDefault ?? (() => backends[0]?.id) });
  backends.forEach((b) => w.register(b));
  return w;
};
const tick = () => new Promise((r) => setTimeout(r, 5));

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('lock store: a wallet with no key-keeping backend has no lock screen; one that can create a wallet is in setup', async () => {
  const none = createWalletLockStore(make([backend('injected:io.metamask')]));
  await tick();
  assert.equal(none.getState().phase, 'none');
  const setup = createWalletLockStore(make([backend('browserVault', { vault: fakeVault({ hasWallet: false }) })]));
  await tick();
  assert.equal(setup.getState().phase, 'setup');
});
await test('lock store: a locked vault, a wrong password, the right one, then lock again', async () => {
  const vault = fakeVault({ where: 'this browser' });
  const store = createWalletLockStore(make([backend('browserVault', { vault })]));
  await tick();
  assert.deepEqual([store.getState().phase, store.getState().where, store.getState().backendId], ['locked', 'this browser', 'browserVault']);
  assert.equal(await store.submit('nope-nope'), false);
  assert.equal(store.getState().error, 'Incorrect password.');
  assert.equal(store.getState().phase, 'locked');
  assert.equal(await store.submit('right-password'), true);
  assert.deepEqual([store.getState().phase, store.getState().error], ['unlocked', undefined]);
  await store.lock();
  assert.equal(store.getState().phase, 'locked');
});
await test('lock store: a vault locking by itself (its own auto-lock) is picked up', async () => {
  const vault = fakeVault({ unlocked: true });
  const store = createWalletLockStore(make([backend('localVault', { vault })]));
  await tick();
  assert.equal(store.getState().phase, 'unlocked');
  vault.lock();
  await tick();
  assert.equal(store.getState().phase, 'locked');
});
await test('lock store: too many attempts says how long to wait; the words are the same in every host', async () => {
  const vault = fakeVault();
  const store = createWalletLockStore(make([backend('localVault', { vault })]));
  await tick();
  for (let i = 0; i < 3; i++) await store.submit('wrong-wrong');
  await store.submit('wrong-wrong');
  assert.match(store.getState().error, /Wait 3 seconds/);
  assert.equal(unlockErrorText(new VaultError('wrong_credential', 'x')), 'Incorrect password.');
  assert.equal(unlockErrorText(new Error('boom')), 'boom');
});
await test('lock store: a second submit while one is running is ignored', async () => {
  const vault = fakeVault();
  let release;
  vault.unlock = () => new Promise((r) => { release = r; });
  const store = createWalletLockStore(make([backend('localVault', { vault })]));
  await tick();
  const first = store.submit('right-password');
  await tick();
  const second = await Promise.race([store.submit('right-password'), new Promise((r) => setTimeout(() => r('hung'), 50))]);
  assert.equal(second, false);
  release();
  await first;
});
await test('lock store: dispose stops it listening', async () => {
  const vault = fakeVault({ unlocked: true });
  const store = createWalletLockStore(make([backend('localVault', { vault })]));
  await tick();
  store.dispose();
  vault.lock();
  await tick();
  assert.equal(store.getState().phase, 'unlocked');
});
await test('security: nothing for a signing-only backend; for a vault, the key reveal and (only when its flags say so) the phrase', async () => {
  const vault = fakeVault({ vflags: flags({ revealPhrase: false }) });
  const w = make([backend('browserVault', { accounts: [A1], vault }), backend('injected:io.metamask', { accounts: [A2] })], (a) => (a.address === A1 ? 'browserVault' : 'injected:io.metamask'));
  assert.equal(createWalletSecurityApi(w, A2), undefined);
  assert.ok(createWalletSecurityApi(w, undefined), 'with no active account the section is still offered (it shows its own hint)');
  assert.equal(createWalletSecurityApi(make([backend('injected:io.metamask', { accounts: [A2] })]), undefined), undefined);
  const api = createWalletSecurityApi(w, A1);
  assert.equal(await api.revealPrivateKey('right-password', A1), '0xkey-of-' + A1);
  assert.equal(api.revealPhrase, undefined);
  await assert.rejects(api.revealPrivateKey('wrong-wrong', A1), /Incorrect password\./);
  await assert.rejects(api.revealPrivateKey('right-password', A2), /cannot show its private key/);
  const withPhrase = createWalletSecurityApi(make([backend('localVault', { accounts: [A1], vault: fakeVault() })], () => 'localVault'), A1);
  assert.equal(await withPhrase.revealPhrase('right-password'), 'test test test');
  await assert.rejects(withPhrase.revealPhrase('wrong-wrong'), /Incorrect password\./);
});
await test('derive: the lock screen props follow the phase; no lock props when there is no lock screen; the authentication type follows the backend', async () => {
  const vault = fakeVault();
  const w = make([backend('serverKeystore', { vault })]);
  const lock = { phase: 'locked', submitting: false, error: 'Incorrect password.', backendId: 'serverKeystore' };
  const calls = [];
  const lockStore = { submit: async (p) => calls.push(['submit', p]), lock: async () => calls.push(['lock']) };
  const locked = deriveWalletProps({ wallet: w, lock, lockStore, activeAddress: A1 });
  assert.deepEqual([locked.walletLocked, locked.passwordMode, locked.passwordErrorText, locked.passwordSubmitting, locked.authenticationType], [true, 'unlock', 'Incorrect password.', false, 'KEYSTORE']);
  locked.onPasswordSubmit('pw'); locked.onConfigLogoff();
  assert.deepEqual(calls, [['submit', 'pw'], ['lock']]);
  const unlocked = deriveWalletProps({ wallet: w, lock: { ...lock, phase: 'unlocked', error: undefined }, lockStore, activeAddress: A1 });
  assert.equal(unlocked.walletLocked, false);
  const noScreen = deriveWalletProps({ wallet: make([backend('injected:io.metamask', { accounts: [A1] })]), lock: { phase: 'none', submitting: false }, lockStore, activeAddress: A1 });
  assert.equal(noScreen.walletLocked, undefined);
  assert.equal(noScreen.onPasswordSubmit, undefined);
  assert.equal(noScreen.configSecurityPanelContent, undefined);
  assert.equal(authenticationTypeOf('localVault'), 'VAULT');
  assert.equal(authenticationTypeOf('browserVault'), 'VAULT');
  assert.equal(authenticationTypeOf(undefined), undefined);
  assert.ok(locked.configSecurityPanelContent, 'a vault account gets the security section');
});
await test('derives: a host that has its own lock gate leaves lock and logoff out and still gets the security section', async () => {
  const w = make([backend('serverKeystore', { accounts: [A1], vault: fakeVault() })]);
  const lock = { phase: 'locked', submitting: false, backendId: 'serverKeystore' };
  const lockStore = { submit: async () => undefined, lock: async () => undefined };
  const only = deriveWalletProps({ wallet: w, lock, lockStore, activeAddress: A1, derives: ['security'] });
  assert.equal(only.walletLocked, undefined);
  assert.equal(only.onPasswordSubmit, undefined);
  assert.equal(only.onConfigLogoff, undefined);
  assert.equal(only.authenticationType, undefined);
  assert.ok(only.configSecurityPanelContent);
  const none = deriveWalletProps({ wallet: w, lock, lockStore, activeAddress: A1, derives: [] });
  assert.equal(none.configSecurityPanelContent, undefined);
  const all = deriveWalletProps({ wallet: w, lock, lockStore, activeAddress: A1 });
  assert.equal(all.walletLocked, true);
  assert.ok(all.onConfigLogoff);
});
await test('merge: the host\'s own props win; an undefined host prop does not erase a derived one', async () => {
  const w = make([backend('localVault', { accounts: [A1], vault: fakeVault() })]);
  const derived = { walletLocked: true, passwordMode: 'unlock', passwordErrorText: 'derived' };
  const merged = mergeWalletProps({ walletLocked: false, passwordErrorText: undefined, docked: true }, derived, w, A1);
  assert.equal(merged.walletLocked, false);
  assert.equal(merged.passwordErrorText, 'derived');
  assert.equal(merged.passwordMode, 'unlock');
  assert.equal(merged.docked, true);
});
await test('merge: delete-wallet and change-password buttons are removed for a backend that cannot do them, kept for one that can', async () => {
  const vault = backend('browserVault', { accounts: [A1], vault: fakeVault() });
  const mm = backend('injected:io.metamask', { accounts: [A2] });
  const w = make([vault, mm], (a) => (a.address === A1 ? 'browserVault' : 'injected:io.metamask'));
  const host = { onConfigDeleteWallet: () => undefined, onConfigResetPassword: () => undefined, onConfigDeleteAccount: () => undefined };
  const forVault = mergeWalletProps(host, {}, w, A1);
  assert.ok(forVault.onConfigDeleteWallet && forVault.onConfigResetPassword);
  const forMm = mergeWalletProps(host, {}, w, A2);
  assert.equal(forMm.onConfigDeleteWallet, undefined);
  assert.equal(forMm.onConfigResetPassword, undefined);
  assert.ok(forMm.onConfigDeleteAccount, 'removing an account from the list stays');
  assert.ok(mergeWalletProps(host, {}, undefined, A2).onConfigDeleteWallet, 'with no wallet nothing is removed');
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
