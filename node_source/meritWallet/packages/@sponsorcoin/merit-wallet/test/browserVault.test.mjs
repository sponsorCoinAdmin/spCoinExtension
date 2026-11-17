// File: test/browserVault.test.mjs
//
// Tests for the BROWSER vault (docs/design/accountAuthDesign.txt 14.4, item V4): the IndexedDB storage and the web session store (src/vault/browserStorage.ts), and the authenticator over a local vault (src/vault/vaultAuthenticator.ts)
// with the approval queue and the local signer. IndexedDB and sessionStorage are small in-test fakes; the vault, WebCrypto and viem are real. Run: node test/browserVault.test.mjs
// MUTANT=idbNoKey|clearKeepsData|signNoApproval|rejectNotTranslated|devOnRealChainAllowed|sessionNotCleared run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const viem = req('viem');
const SRC = path.join(HERE, '..', 'src');
const m = process.env.MUTANT;

const cache = new Map();
function load(rel) {
  if (cache.has(rel)) return cache.get(rel).exports;
  let src = fs.readFileSync(path.join(SRC, rel + '.ts'), 'utf8');
  if (rel === 'vault/browserStorage') {
    // the record is written under no key (a second write replaces nothing readable)
    if (m === 'idbNoKey') src = src.replace('put(vault, key)', "put(vault, 'other')");
    // clear leaves the data in place
    if (m === 'clearKeepsData') src = src.replace('(await store(\'readwrite\')).delete(key)', '(await store(\'readwrite\')).get(key)');
    // locking leaves the session key in sessionStorage
    if (m === 'sessionNotCleared') src = src.replace('area()?.removeItem(key);', '');
  }
  // a request runs at once instead of waiting for the user's decision
  if (rel === 'vault/approvals' && m === 'signNoApproval') src = src.replace(/this\.pending\.set\(id, \{[^\n]*\n\s*this\.emit\(\);/, 'void run().then(resolve as never, reject);');
  if (rel === 'vault/vaultAuthenticator' && m === 'rejectNotTranslated') src = src.replace("if (error instanceof ApprovalRejectedError) throw new AuthenticatorError('user_rejected', error.message, id);", '');
  if (rel === 'vault/localSigner' && m === 'devOnRealChainAllowed') src = src.replace('if (devOrigin && request.chainId !== HARDHAT_CHAIN_ID) throw new DevAccountOnRealChainError();', '').replace('if (signing.devOrigin && request.chainId !== HARDHAT_CHAIN_ID) throw new DevAccountOnRealChainError();', '');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(rel, mod);
  const dir = path.posix.dirname(rel);
  new Function('require', 'module', 'exports', js)((spec) => (spec.startsWith('.') ? load(path.posix.normalize(path.posix.join(dir, spec))) : req(spec)), mod, mod.exports);
  return mod.exports;
}
const { createIndexedDbVaultStorage, createWebSessionStore } = load('vault/browserStorage');
const { createLocalVaultParts } = load('vault/vaultCapability');
const { createVaultAuthenticator } = load('vault/vaultAuthenticator');
const { ApprovalController } = load('vault/approvals');
const { HARDHAT_DEV_MNEMONIC } = load('vault/walletAccounts');

// ---- fakes -------------------------------------------------------------------------------------------------------------------------
function fakeIndexedDb() {
  const databases = new Map(); // name -> Map(storeName -> Map(key -> value))
  const later = (fn) => queueMicrotask(fn);
  const requestOf = (compute) => { const r = {}; later(() => { try { r.result = compute(); r.onsuccess?.(); } catch (e) { r.error = e; r.onerror?.(); } }); return r; };
  return {
    open(name) {
      const r = {};
      later(() => {
        const first = !databases.has(name);
        if (first) databases.set(name, new Map());
        const stores = databases.get(name);
        const db = {
          objectStoreNames: { contains: (s) => stores.has(s) },
          createObjectStore: (s) => { stores.set(s, new Map()); },
          transaction: (s) => ({ objectStore: () => { const data = stores.get(s); return { get: (k) => requestOf(() => data.get(k)), put: (v, k) => requestOf(() => { data.set(k, JSON.parse(JSON.stringify(v))); return k; }), delete: (k) => requestOf(() => { data.delete(k); }) }; } }),
        };
        r.result = db;
        if (first) r.onupgradeneeded?.();
        r.onsuccess?.();
      });
      return r;
    },
    _names: () => [...databases.keys()],
  };
}
function fakeSessionStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => { map.set(k, String(v)); }, removeItem: (k) => { map.delete(k); }, _size: () => map.size };
}

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const pw = (value) => ({ kind: 'password', value });
const HH0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const settle = () => new Promise((r) => setTimeout(r, 0));

// ---- IndexedDB storage ----------------------------------------------------------------------------------------------------------------
await test('IndexedDB storage: nothing before a write; a write is read back; clear removes it', async () => {
  const st = createIndexedDbVaultStorage({ factory: fakeIndexedDb() });
  assert.equal(await st.read(), undefined);
  const vault = { version: 1, algorithm: 'pbkdf2-sha256/aes-256-gcm', iterations: 1, salt: 's', iv: 'i', data: 'd' };
  await st.write(vault);
  assert.deepEqual(await st.read(), vault);
  await st.clear();
  assert.equal(await st.read(), undefined);
});
await test('IndexedDB storage: two database names are isolated from each other', async () => {
  const factory = fakeIndexedDb();
  const a = createIndexedDbVaultStorage({ factory, dbName: 'wallet-a' });
  const b = createIndexedDbVaultStorage({ factory, dbName: 'wallet-b' });
  await a.write({ version: 1, algorithm: 'x', iterations: 1, salt: 'a', iv: 'a', data: 'a' });
  assert.equal(await b.read(), undefined);
  assert.deepEqual(factory._names().sort(), ['wallet-a', 'wallet-b']);
});
await test('IndexedDB storage: a browser without IndexedDB gives a readable error, not a crash', async () => {
  const st = createIndexedDbVaultStorage({ factory: undefined });
  const saved = globalThis.indexedDB; delete globalThis.indexedDB;
  await assert.rejects(st.read(), /no IndexedDB/);
  if (saved) globalThis.indexedDB = saved;
});
// ---- session store ----------------------------------------------------------------------------------------------------------------------
await test('web session store: set / get / clear; a corrupt value reads as nothing', async () => {
  const area = fakeSessionStorage();
  const store = createWebSessionStore(area, 'k');
  assert.equal(await store.get(), undefined);
  await store.set({ key: { kty: 'oct' }, salt: 's', iterations: 5, lastActivity: 1 });
  assert.equal((await store.get()).iterations, 5);
  await store.clear();
  assert.equal(await store.get(), undefined);
  area.setItem('k', '{not json');
  assert.equal(await store.get(), undefined);
});
// ---- the browser vault end to end ----------------------------------------------------------------------------------------------------
const browserVault = (factory, area, extra = {}) =>
  createLocalVaultParts({ storage: createIndexedDbVaultStorage({ factory }), sessionStore: createWebSessionStore(area), label: 'this browser', iterations: 1000, ...extra });

await test('browser vault: create, "reload" (new objects over the same IndexedDB and session storage) comes back unlocked without the password; the ciphertext in IndexedDB hides the phrase', async () => {
  const factory = fakeIndexedDb(), area = fakeSessionStorage();
  const first = browserVault(factory, area);
  await first.vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  await settle(); await settle();
  const second = browserVault(factory, area);
  assert.equal(second.vault.isUnlocked(), false);
  assert.equal(await second.vault.hasWallet(), true);
  assert.equal(await second.session.restore(), true);
  assert.equal(second.vault.accounts()[0].address, HH0);
  const stored = JSON.stringify(await createIndexedDbVaultStorage({ factory }).read());
  assert.ok(!stored.includes('test test') && !stored.includes('password-1'));
});
await test('browser vault: lock clears the session key, so a reload stays locked until the password is entered', async () => {
  const factory = fakeIndexedDb(), area = fakeSessionStorage();
  const first = browserVault(factory, area);
  await first.vault.create(pw('password-1'));
  await settle(); await settle();
  assert.ok(area._size() > 0, 'the session key should be kept while unlocked');
  first.vault.lock();
  await settle(); await settle();
  assert.equal(area._size(), 0);
  const second = browserVault(factory, area);
  assert.equal(await second.session.restore(), false);
  assert.equal(second.vault.isUnlocked(), false);
  await second.vault.unlock(pw('password-1'));
  assert.equal(second.vault.isUnlocked(), true);
});
await test('browser vault: the same recovery phrase typed into a SECOND browser vault gives the same accounts (no secret moves between them)', async () => {
  const a = browserVault(fakeIndexedDb(), fakeSessionStorage()), b = browserVault(fakeIndexedDb(), fakeSessionStorage());
  const ra = await a.vault.importPhrase('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', pw('password-1'));
  const rb = await b.vault.importPhrase('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about', pw('different-pass'));
  assert.deepEqual(rb.map((x) => x.address), ra.map((x) => x.address));
});
// ---- the authenticator -----------------------------------------------------------------------------------------------------------------
async function authenticatorOver(parts, mode) {
  const approvals = new ApprovalController();
  // the "confirmation screen": decide every request as it arrives
  approvals.onChange(() => { for (const r of approvals.list()) { if (mode === 'approve') void approvals.approve(r.id); else if (mode === 'reject') approvals.reject(r.id, 'No thanks.'); } });
  const auth = createVaultAuthenticator({ id: 'browserVault', label: 'Browser', parts, approvals, rpcUrlFor: () => undefined });
  return { auth, approvals };
}
await test('authenticator: id, label, vault capability, and status / accounts follow the lock state', async () => {
  const parts = browserVault(fakeIndexedDb(), fakeSessionStorage());
  const { auth } = await authenticatorOver(parts, 'approve');
  assert.equal(auth.id, 'browserVault'); assert.equal(auth.label, 'Browser'); assert.equal(auth.vault, parts.vault);
  assert.deepEqual(await auth.status(), { available: true, unlocked: false });
  assert.deepEqual(await auth.accounts(), []);
  await parts.vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  assert.deepEqual(await auth.status(), { available: true, unlocked: true });
  const accounts = await auth.accounts();
  assert.equal(accounts[0].address, HH0); assert.equal(accounts[0].source, 'hardhatTestAccounts');
});
await test('authenticator: signMessage waits for approval, then returns a signature that recovers to the account', async () => {
  const parts = browserVault(fakeIndexedDb(), fakeSessionStorage());
  await parts.vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  const { auth, approvals } = await authenticatorOver(parts, 'manual');
  let settled = false;
  const pending = auth.signMessage(HH0, 'Sign in to Sponsor Coin').then((s) => { settled = true; return s; });
  await settle();
  assert.equal(settled, false); assert.equal(approvals.list().length, 1);
  await approvals.approve(approvals.list()[0].id);
  const signature = await pending;
  assert.equal(await viem.recoverMessageAddress({ message: 'Sign in to Sponsor Coin', signature }), HH0);
});
await test('authenticator: a rejection in the confirmation screen is user_rejected', async () => {
  const parts = browserVault(fakeIndexedDb(), fakeSessionStorage());
  await parts.vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  const { auth } = await authenticatorOver(parts, 'reject');
  await assert.rejects(auth.signMessage(HH0, 'x'), (e) => e.name === 'AuthenticatorError' && e.code === 'user_rejected' && e.authenticatorId === 'browserVault');
});
await test('authenticator: signing while locked is locked; an address not in the wallet is unauthorized', async () => {
  const parts = browserVault(fakeIndexedDb(), fakeSessionStorage());
  await parts.vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  const { auth } = await authenticatorOver(parts, 'approve');
  await assert.rejects(auth.signMessage('0x8d581506486BC255B42D05754392573e46c34577', 'x'), (e) => e.code === 'unauthorized');
  parts.vault.lock();
  await assert.rejects(auth.signMessage(HH0, 'x'), (e) => e.code === 'locked');
});
await test('authenticator: a published Hardhat dev key refuses a real chain (wrong_chain) before anything is queued', async () => {
  const parts = browserVault(fakeIndexedDb(), fakeSessionStorage());
  await parts.vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  const { auth, approvals } = await authenticatorOver(parts, 'manual');
  await assert.rejects(auth.sendTransaction({ from: HH0, to: '0x0000000000000000000000000000000000000002', value: 1n, chainId: 1 }), (e) => e.code === 'wrong_chain');
  assert.equal(approvals.list().length, 0);
});
await test('authenticator: onChange announces unlock and lock', async () => {
  const parts = browserVault(fakeIndexedDb(), fakeSessionStorage());
  await parts.vault.create(pw('password-1'));
  const { auth } = await authenticatorOver(parts, 'approve');
  const seen = [];
  const off = auth.onChange((c) => seen.push(c));
  parts.vault.lock(); await parts.vault.unlock(pw('password-1'));
  assert.deepEqual(seen, ['lock', 'unlock']);
  off(); parts.vault.lock();
  assert.deepEqual(seen, ['lock', 'unlock']);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
