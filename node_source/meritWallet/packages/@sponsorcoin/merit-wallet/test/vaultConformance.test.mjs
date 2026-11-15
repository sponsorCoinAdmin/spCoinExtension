// File: test/vaultConformance.test.mjs
//
// Item V13 of docs/design/accountAuthDesign.txt (and rows 11 / 17): ONE set of scenarios run through EVERY key-keeping backend of the wallet, each through its real adapter over a fake of what it sits on:
//   browser vault        createLocalVault over an in-memory VaultStorage (the browser vault and a test double of every package vault)
//   extension vault      createWorkerVault over a fake background worker (real VaultSession and WalletAccounts behind the messages)
//   dev keystore         createDevKeystoreVault over a fake keystore bridge (the password rules of walletState.tsx)
//   phone                createPhoneVault over a fake native key manager (biometric unlock)
// The scenarios are the contract: set up, lock and unlock, a wrong credential, delete, announcements, the one error set, and HONEST FLAGS (a feature whose flag is false must say 'unsupported', never fail some other way;
// a feature whose flag is true must not). Which scenarios apply is decided by each backend's own capability flags, so a new backend gets the same checks for free. Run: node test/vaultConformance.test.mjs
// MUTANT=lieAboutBackup|unlockAcceptsAnything|lockSilent|deleteWithoutCheck|foreignError run against deliberately broken adapters and must report failures.
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
const compile = (src, file, requireFn) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(requireFn, mod, mod.exports);
  return mod.exports;
};
const cache = new Map();
function load(rel, tweak) {
  const file = path.join(SRC, rel + '.ts');
  if (!tweak && cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (tweak) src = tweak(src);
  const mod = { exports: {} };
  if (!tweak) cache.set(file, mod);
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file }).outputText;
  new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? load(path.relative(SRC, path.resolve(path.dirname(file), id)).replace(/\\/g, '/')) : req(id)), mod, mod.exports);
  return mod.exports;
}
const { VaultError, createLocalVault } = load('vault/vaultCapability');
const { createWorkerVault } = load('vault/workerVault', m === 'lieAboutBackup' ? (s) => s.replace('backup: true,', 'backup: false,') : m === 'foreignError' ? (s) => s.replace("throw new VaultError('unsupported', error instanceof Error ? error.message : 'The wallet could not be reached.');", 'throw error;') : undefined);
const { createPhoneVault, PhoneAuthError } = load('vault/phoneVault');
const { VaultSession, TooManyAttemptsError } = load('vault/vaultSession');
const { WalletAccounts, WalletAccountError, createWallet } = load('vault/walletAccounts');
const { WrongPasswordError } = load('vault/vaultCrypto');

// the dev keystore adapter comes from the web app's own file, with its bridge faked
const devSrc = fs.readFileSync(path.join(WEB, 'lib', 'spCoin', 'devKeystoreVault.ts'), 'utf8').replace(/\r\n/g, '\n');
const devMod = compile(m === 'lieAboutBackup' ? devSrc.replace('backup: false,', 'backup: true,') : devSrc, 'devKeystoreVault.ts', (id) => {
  if (id === '@sponsorcoin/merit-wallet') return { VaultError };
  if (id === '@/components/wallet/lib/keystoreBridge') return { getKeystoreBridgeHandlers: () => null, getKeystoreBridgeState: () => ({}), subscribeKeystoreBridge: () => () => undefined };
  if (id === '@/components/wallet/lib/meritConnect/accounts') return { MERIT_WALLET_HARDHAT_CHAIN_ID: 31337 };
  if (id === '@/components/wallet/lib/meritConnect') return { invalidateMeritSignerCache: () => undefined };
  return req(id);
});
const { createDevKeystoreVault } = devMod;

const A1 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const GOOD = 'right-password';
const memStorage = () => { let v; return { read: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), write: async (x) => { v = JSON.parse(JSON.stringify(x)); }, clear: async () => { v = undefined; } }; };
const tick = () => new Promise((r) => setTimeout(r, 10));

// ---- the four backends -------------------------------------------------------------------------------------------------
function browserVault() {
  const vault = createLocalVault({ storage: memStorage(), iterations: 1000 });
  return { name: 'browser vault', vault, good: { kind: 'password', value: GOOD }, bad: () => ({ kind: 'password', value: 'wrong-aaaa' }), setUpFresh: true };
}
function extensionVault() {
  const storage = memStorage();
  const session = new VaultSession({ storage, iterations: 1000, autoLockMs: 0 });
  const accounts = new WalletAccounts(session);
  const broadcasts = new Set();
  session.onChange(() => broadcasts.forEach((h) => h({ type: 'merit/vault/changed', unlocked: session.isUnlocked() })));
  const snapshot = async (extra = {}) => ({ ok: true, initialized: await session.isInitialized(), unlocked: session.isUnlocked(), ...extra });
  async function handle(r) {
    try {
      switch (r.type) {
        case 'merit/vault/status': return snapshot();
        case 'merit/vault/create':
          if (typeof r.password !== 'string' || r.password.length < 8) return { ok: false, error: 'invalid-request', message: 'Password must be at least 8 characters.' };
          { const c = await createWallet(session, r.password, r.mnemonic === undefined ? {} : { mnemonic: r.mnemonic }); return snapshot({ mnemonic: c.mnemonic, active: c.address }); }
        case 'merit/vault/unlock': await session.unlock(r.password); return snapshot();
        case 'merit/vault/lock': session.lock(); return snapshot();
        case 'merit/vault/changePassword': await session.changePassword(r.oldPassword, r.newPassword); return snapshot();
        case 'merit/vault/verifyPassword': await session.verifyPassword(r.password); return snapshot();
        case 'merit/vault/wipe': await session.wipe(); return snapshot();
        case 'merit/vault/exportBackup': return snapshot({ backup: await session.exportBackup() });
        case 'merit/accounts/list': return snapshot({ accounts: accounts.list(), active: accounts.activeAddress() });
        case 'merit/accounts/exportPrivateKey': return snapshot({ privateKey: await accounts.revealPrivateKey(r.password, r.address) });
        case 'merit/accounts/revealMnemonic': return snapshot({ mnemonic: await accounts.revealMnemonic(r.password) });
        case 'merit/accounts/importPrivateKey': return snapshot({ account: await accounts.importPrivateKey(r.privateKey, r.name) });
        case 'merit/accounts/remove': await accounts.removeAccount(r.address); return snapshot({ accounts: accounts.list() });
        case 'merit/accounts/addDerived': return snapshot({ account: await accounts.addDerived(r.name) });
        case 'merit/accounts/setActive': await accounts.setActive(r.address); return snapshot({ active: accounts.activeAddress() });
        case 'merit/vault/importBackup': await session.importBackup(r.vault, r.password); return snapshot();
        default: return { ok: false, error: 'invalid-request' };
      }
    } catch (error) {
      if (error instanceof WrongPasswordError) return { ok: false, error: 'wrong-password' };
      if (error instanceof TooManyAttemptsError) return { ok: false, error: 'too-many-attempts', message: error.message };
      if (error instanceof WalletAccountError) return { ok: false, error: 'invalid-request', message: error.message };
      if (error && error.name === 'VaultLockedError') return { ok: false, error: 'locked' };
      return { ok: false, error: 'failed', message: error instanceof Error ? error.message : String(error) };
    }
  }
  const vault = createWorkerVault({ send: (message) => handle(message), subscribe: (h) => { broadcasts.add(h); return () => broadcasts.delete(h); } });
  return { name: 'extension vault (worker)', vault, good: { kind: 'password', value: GOOD }, bad: () => ({ kind: 'password', value: 'wrong-aaaa' }), setUpFresh: true, ready: vault.ready };
}
function devKeystore() {
  let state = { hasPassword: false, locked: true, accounts: [] };
  let verifier = null;
  const listeners = new Set(); const notify = () => listeners.forEach((l) => l());
  const set = (next) => { state = { ...state, ...next }; notify(); };
  const handlers = {
    setPassword: async (p) => { if (p.length < 8) throw new Error('Password must be at least 8 characters.'); verifier = p; set({ hasPassword: true, locked: false, accounts: [{ address: A1, name: 'Doggie' }] }); },
    unlock: async (p) => { if (p !== verifier) return false; set({ locked: false }); return true; },
    lock: () => set({ locked: true }),
    changePassword: async (o, n) => { if (o !== verifier) return { ok: false, message: 'Incorrect current password.' }; verifier = n; return { ok: true }; },
    deleteWallet: async (p) => { if (p !== verifier) return { ok: false, message: 'Incorrect password.' }; verifier = null; set({ hasPassword: false, locked: true, accounts: [] }); return { ok: true }; },
  };
  const vault = createDevKeystoreVault({
    state: () => state, handlers: () => handlers, subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    fetchImpl: async (url, init) => { const body = JSON.parse(init.body); return body.password === verifier ? { ok: true, json: async () => ({ ok: true, privateKey: '0xkey' }) } : { ok: false, json: async () => ({ ok: false, message: 'Incorrect password.' }) }; },
    afterReveal: () => undefined, settleMs: 40,
  });
  return { name: 'dev keystore', vault, good: { kind: 'password', value: GOOD }, bad: () => ({ kind: 'password', value: 'wrong-aaaa' }), setUpFresh: true };
}
function phone() {
  let isSetUp = false; let unlocked = false; let list = []; let mode = 'pass';
  const listeners = new Set(); const notify = () => listeners.forEach((l) => l());
  const manager = {
    platform: 'ios', isAvailable: async () => true, isSetUp: async () => isSetUp,
    async setUp() { isSetUp = true; list = [{ address: A1, name: 'Phone' }]; notify(); return { recoveryPhrase: 'twelve words', accounts: list }; },
    async authenticate() { if (mode === 'fail') throw new PhoneAuthError('failed', 'Not recognised'); unlocked = true; notify(); },
    isUnlocked: () => unlocked, lock() { unlocked = false; notify(); }, accounts: () => list,
    async addAccount(name) { const a = { address: '0x2222222222222222222222222222222222222222', name }; list = [...list, a]; notify(); return a; },
    async signMessage() { return '0xsig'; }, async signTransaction() { return '0xraw'; },
    async deleteWallet() { isSetUp = false; unlocked = false; list = []; notify(); },
    onChange(l) { listeners.add(l); return () => listeners.delete(l); },
  };
  return { name: 'phone', vault: createPhoneVault(manager), good: { kind: 'biometric', value: '' }, bad: () => { mode = 'fail'; return { kind: 'biometric', value: '' }; }, restore: () => { mode = 'pass'; }, setUpFresh: true };
}
let backends = [browserVault, extensionVault, devKeystore, phone];
if (m === 'unlockAcceptsAnything') {
  const original = devKeystore;
  backends = [browserVault, extensionVault, () => { const b = original(); const real = b.vault.unlock; b.vault.unlock = async (c) => { try { await real(c); } catch { /* accepts anything */ } }; return b; }, phone];
}
if (m === 'lockSilent') backends = backends.map((make) => () => { const b = make(); b.vault.onChange = () => () => undefined; return b; });
if (m === 'deleteWithoutCheck') backends = backends.map((make) => () => { const b = make(); const realBad = b.bad; b.bad = () => { const c = realBad(); return c; }; const real = b.vault.deleteWallet; b.vault.deleteWallet = async () => real(b.good); return b; });

const FEATURE_CALLS = {
  importPhrase: (v, c) => v.importPhrase('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', c),
  importKey: (v) => v.importKey('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
  backup: (v, c) => v.exportBackup(c),
  changeCredential: (v, c) => v.changeCredential(c, { kind: c.kind, value: 'another-password' }),
  revealKey: (v, c) => v.revealPrivateKey(c, A1),
  revealPhrase: (v, c) => v.revealRecoveryPhrase(c),
  removeAccount: (v, c) => (v.removeAccount ? v.removeAccount(c, A1) : Promise.reject(new VaultError('unsupported', 'no removeAccount'))),
};
const errorCode = async (p) => { try { await p; return 'no error'; } catch (e) { return e instanceof VaultError ? e.code : 'FOREIGN:' + (e && e.constructor && e.constructor.name) + ':' + (e && e.message); } };

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

for (const make of backends) {
  const probe = make();
  const label = probe.name;
  await test(`${label}: set up from nothing, then it exists and is unlocked (the phrase, if any, comes back once)`, async () => {
    const b = make(); await b.ready; const v = b.vault;
    assert.equal(await v.hasWallet(), false);
    assert.equal(v.isUnlocked(), false);
    assert.ok(v.capabilities.create, 'a backend under test must be able to create');
    const made = await v.create(b.good);
    assert.equal(typeof made.recoveryPhrase, 'string');
    assert.equal(await v.hasWallet(), true);
    assert.equal(v.isUnlocked(), true);
    assert.ok(Array.isArray(made.accounts));
  });
  await test(`${label}: lock locks at once and announces it; a wrong credential is wrong_credential and stays locked; the right one unlocks and announces it`, async () => {
    const b = make(); await b.ready; const v = b.vault;
    await v.create(b.good);
    let events = 0; const off = v.onChange(() => { events += 1; });
    v.lock();
    await tick();
    assert.equal(v.isUnlocked(), false, 'still unlocked after lock');
    assert.ok(events >= 1, 'lock was not announced');
    assert.equal(await errorCode(v.unlock(b.bad())), 'wrong_credential');
    assert.equal(v.isUnlocked(), false, 'a wrong credential unlocked the wallet');
    b.restore?.();
    const before = events;
    await v.unlock(b.good);
    await tick();
    assert.equal(v.isUnlocked(), true);
    assert.ok(events > before, 'unlock was not announced');
    off();
  });
  await test(`${label}: delete needs the credential (a wrong one deletes nothing), then the wallet is gone`, async () => {
    const b = make(); await b.ready; const v = b.vault;
    await v.create(b.good);
    assert.equal(await errorCode(v.deleteWallet(b.bad())), 'wrong_credential');
    assert.equal(await v.hasWallet(), true, 'a wrong credential deleted the wallet');
    b.restore?.();
    await v.deleteWallet(b.good);
    assert.equal(await v.hasWallet(), false);
  });
  if (probe.vault.capabilities.removeAccount && probe.vault.capabilities.importKey) {
    await test(`${label}: removeAccount (2026-11-10): needs the credential (a wrong one removes nothing), then the imported account is gone from the list and the others stay`, async () => {
      const b = make(); await b.ready; const v = b.vault;
      await v.create(b.good);
      const imported = await v.importKey('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', 'Imp');
      const others = v.accounts().filter((a) => a.address.toLowerCase() !== imported.address.toLowerCase()).length;
      assert.equal(await errorCode(v.removeAccount(b.bad(), imported.address)), 'wrong_credential');
      assert.ok(v.accounts().some((a) => a.address.toLowerCase() === imported.address.toLowerCase()), 'a wrong credential removed the account');
      b.restore?.();
      await v.removeAccount(b.good, imported.address);
      assert.ok(!v.accounts().some((a) => a.address.toLowerCase() === imported.address.toLowerCase()), 'the account is still listed');
      assert.equal(v.accounts().length, others, 'the other accounts changed');
    });
  }
  await test(`${label}: honest flags: a feature whose flag is false says 'unsupported' and nothing else; a feature whose flag is true is not 'unsupported'`, async () => {
    const b = make(); await b.ready; const v = b.vault;
    await v.create(b.good);
    for (const [feature, call] of Object.entries(FEATURE_CALLS)) {
      const code = await errorCode(call(v, b.good));
      if (v.capabilities[feature]) assert.notEqual(code, 'unsupported', `${feature}: the flag says supported but the call says unsupported`);
      else assert.equal(code, 'unsupported', `${feature}: the flag says unsupported but the call answered "${code}"`);
    }
  });
  await test(`${label}: every failure is a VaultError (no foreign error escapes), including a call on a locked wallet`, async () => {
    const b = make(); await b.ready; const v = b.vault;
    await v.create(b.good);
    v.lock(); await tick();
    for (const [name, call] of [['unlock wrong', () => v.unlock(b.bad())], ['reveal while locked', () => v.revealPrivateKey(b.good, A1)], ['add while locked', () => v.addAccount('x')]]) {
      const code = await errorCode(call());
      assert.ok(!String(code).startsWith('FOREIGN'), `${name}: ${code}`);
    }
  });
}

// A backend that sits behind a transport must report an unreachable transport in the one error set too.
await test('extension vault (worker): an unreachable worker is a VaultError on every call, never a raw transport error', async () => {
  const down = createWorkerVault({ send: async () => { throw new TypeError('Could not establish connection. Receiving end does not exist.'); }, subscribe: () => () => undefined });
  await down.ready;
  for (const [name, call] of [['unlock', () => down.unlock({ kind: 'password', value: GOOD })], ['create', () => down.create({ kind: 'password', value: GOOD })], ['reveal', () => down.revealPrivateKey({ kind: 'password', value: GOOD }, A1)]]) {
    const code = await errorCode(call());
    assert.ok(!String(code).startsWith('FOREIGN') && code !== 'no error', name + ': ' + code);
  }
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
