// File: test/wallet.test.mjs
//
// Conformance tests for the Wallet object (src/wallet/wallet.ts, docs/design/accountAuthDesign.txt section 15.7, item W1a): ONE object for every key backend. Fake backends stand in for the dev keystore, the extension /
// browser / phone vault (key-keeping: they carry the vault capability) and MetaMask (signing only). Checks: the saved choice wins over the source over the app default; an unavailable backend is an error and NO other
// backend is asked; accounts of several backends are one list, an address held twice is one row naming both; the screens a backend supports come from its own flags (a signing-only backend offers none of the
// key-management ones); the primary vault is the first key-keeping backend that already has a wallet; changes are announced. Run: node test/wallet.test.mjs
// MUTANT=fallsBackToAnother|storeIgnored|duplicateRows|featuresAllTrue|primaryIgnoresHasWallet|noForward run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');
const req = createRequire(import.meta.url);
const ts = req('typescript');
const m = process.env.MUTANT;

const cache = new Map();
function load(rel) {
  const file = path.join(SRC, rel + '.ts');
  if (cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (rel === 'auth/resolve' && m === 'fallsBackToAnother') src = src.replace("if (!authenticator) throw new AuthenticatorError('unreachable', `The ${id} authenticator for ${account.address} is not available in this app.`, id);", 'if (!authenticator) return registry.list()[0];');
  if (rel === 'wallet/wallet') {
    if (m === 'storeIgnored') src = src.replace('activeAuthenticator: store.get(account.address),', 'activeAuthenticator: undefined,');
    if (m === 'duplicateRows') src = src.replace('if (existing) {', 'if (false) {');
    if (m === 'featuresAllTrue') src = src.replace('createWallet: !!v?.create,', 'createWallet: true,').replace('deleteWallet: !!v?.delete,', 'deleteWallet: true,');
    if (m === 'primaryIgnoresHasWallet') src = src.replace('if (await vault.hasWallet()) return { authenticator, vault };', 'return { authenticator, vault };');
    if (m === 'noForward') src = src.replace('forwards.set(authenticator.id, authenticator.onChange(() => notify()));', 'forwards.set(authenticator.id, () => undefined);');
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? load(path.relative(SRC, path.resolve(path.dirname(file), id)).replace(/\\/g, '/')) : req(id)), mod, mod.exports);
  return mod.exports;
}
const { createWallet, createMemoryActiveAuthenticatorStore, featuresOf, WALLET_FEATURES } = load('wallet/wallet');
const { AuthenticatorError } = load('auth/authenticator');

const A1 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A2 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const A3 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';

const vaultFlags = (over = {}) => ({ create: true, importPhrase: true, importKey: true, backup: true, changeCredential: true, delete: true, revealKey: true, revealPhrase: true, biometric: false, ...over });
function backend(id, { label = id, accounts = [], vault, signing = {}, available = true, hasWallet = true } = {}) {
  const listeners = new Set();
  const a = {
    id, label,
    capabilities: { signMessage: true, signTypedData: false, sendTransaction: true, listAccounts: true, createAccount: !!vault, importKey: !!vault, lock: !!vault, ...signing },
    vault: vault ? { label: vault.where ?? 'this device', capabilities: vault.flags ?? vaultFlags(), hasWallet: async () => hasWallet } : undefined,
    async status() { return { available, unlocked: true }; },
    async accounts() { return accounts.map((address) => ({ address })); },
    async signMessage() { return '0xsig'; },
    async sendTransaction() { return { hash: '0xhash' }; },
    onChange(l) { listeners.add(l); return () => listeners.delete(l); },
    emit(change = 'lock') { listeners.forEach((l) => l(change)); },
  };
  return a;
}
const make = (backends, over = {}) => {
  const wallet = createWallet({ appDefault: () => 'localVault', ...over });
  backends.forEach((b) => wallet.register(b));
  return wallet;
};

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the backend for an account: the saved choice wins over the source over the app default', async () => {
  const vault = backend('localVault', { accounts: [A1], vault: {} });
  const mm = backend('injected:io.metamask', { accounts: [A1] });
  const w = make([vault, mm]);
  assert.equal((await w.authenticatorFor({ address: A1 })).id, 'localVault');
  assert.equal((await w.authenticatorFor({ address: A1, sourceAuthenticator: 'injected:io.metamask' })).id, 'injected:io.metamask');
  w.setActiveAuthenticator(A1, 'localVault');
  assert.equal((await w.authenticatorFor({ address: A1, sourceAuthenticator: 'injected:io.metamask' })).id, 'localVault');
  w.setActiveAuthenticator(A1, undefined);
  assert.equal(w.getActiveAuthenticator(A1), undefined);
});
await test('backendIdFor: the saved choice, else the app default; no chain involved', async () => {
  const w = make([backend('localVault', { vault: {} }), backend('injected:io.metamask', {})], { appDefault: (a) => (a.address === A2 ? 'injected:io.metamask' : 'localVault') });
  assert.equal(w.backendIdFor(A1), 'localVault');
  assert.equal(w.backendIdFor(A2), 'injected:io.metamask');
  w.setActiveAuthenticator(A1, 'injected:io.metamask');
  assert.equal(w.backendIdFor(A1), 'injected:io.metamask');
  assert.equal(make([], { appDefault: () => undefined }).backendIdFor(A3), undefined);
});
await test('a backend that is not registered or not reachable is a specific error and NO other backend is asked', async () => {
  const w = make([backend('localVault', { vault: {} }), backend('injected:io.metamask', { available: false })]);
  w.setActiveAuthenticator(A2, 'injected:io.metamask');
  await assert.rejects(w.authenticatorFor({ address: A2 }), (e) => e instanceof AuthenticatorError && e.code === 'unreachable' && e.authenticatorId === 'injected:io.metamask');
  w.setActiveAuthenticator(A3, 'hardware:ledger');
  await assert.rejects(w.authenticatorFor({ address: A3 }), (e) => e instanceof AuthenticatorError && e.code === 'unreachable');
});
await test('accounts of several backends are ONE list; an address held twice is one row that names both backends', async () => {
  const w = make([backend('localVault', { accounts: [A1, A2], vault: {} }), backend('injected:io.metamask', { accounts: [A2, A3] })]);
  const rows = await w.accounts();
  assert.deepEqual(rows.map((r) => r.address.toLowerCase()).sort(), [A1, A2, A3].map((a) => a.toLowerCase()).sort());
  const two = rows.find((r) => r.address === A2);
  assert.deepEqual([...two.backends].sort(), ['injected:io.metamask', 'localVault']);
  assert.equal(rows.find((r) => r.address === A3).authenticatorId, 'injected:io.metamask');
  assert.equal(rows.find((r) => r.address === A1).badge, 'Extension');
  w.setActiveAuthenticator(A2, 'injected:io.metamask');
  assert.equal((await w.accounts()).find((r) => r.address === A2).authenticatorId, 'injected:io.metamask');
});
await test('a backend that fails to list its accounts is skipped, not fatal', async () => {
  const broken = backend('injected:io.metamask', {});
  broken.accounts = async () => { throw new Error('locked'); };
  const rows = await make([backend('localVault', { accounts: [A1], vault: {} }), broken]).accounts();
  assert.equal(rows.length, 1);
});
await test('screens come from the backend flags: a signing-only backend offers no key-management screen', async () => {
  const vault = backend('browserVault', { accounts: [A1], vault: { where: 'this browser', flags: vaultFlags({ revealPhrase: false }) } });
  const mm = backend('injected:io.metamask', { accounts: [A2], signing: { lock: false, createAccount: false, importKey: false } });
  const w = make([vault, mm], { appDefault: (acc) => (acc.address === A1 ? 'browserVault' : 'injected:io.metamask') });
  const onlySigning = featuresOf(mm);
  for (const f of ['createWallet', 'importPhrase', 'importKey', 'addAccount', 'backup', 'changeCredential', 'deleteWallet', 'revealKey', 'revealPhrase', 'biometric', 'lock']) assert.equal(onlySigning[f], false, f);
  assert.equal(w.can('deleteWallet', A1), true);
  assert.equal(w.can('revealPhrase', A1), false);
  assert.equal(w.can('deleteWallet', A2), false);
  assert.equal(w.can('createWallet'), true);
  assert.equal(make([mm]).can('createWallet'), false);
  assert.equal(w.can('deleteWallet', '0x1111111111111111111111111111111111111111'), false); // an unknown address takes the app default here, which is MetaMask
  assert.ok(WALLET_FEATURES.length >= 12);
});
await test('backends() describes each backend (badge, where its keys live, whether it keeps keys)', async () => {
  const w = make([backend('browserVault', { vault: { where: 'this browser' } }), backend('injected:io.metamask', {})]);
  const [v, mm] = w.backends();
  assert.deepEqual([v.badge, v.where, v.keepsKeys], ['Browser', 'this browser', true]);
  assert.deepEqual([mm.badge, mm.where, mm.keepsKeys], ['MetaMask', '', false]);
  assert.equal(w.backend('nope'), undefined);
});
await test('the vault for an account, and the primary vault (first key-keeping backend that already has a wallet)', async () => {
  const empty = backend('browserVault', { vault: {}, hasWallet: false });
  const full = backend('localVault', { vault: {}, hasWallet: true });
  const mm = backend('injected:io.metamask', {});
  const w = make([mm, empty, full]);
  assert.equal((await w.primaryVault()).authenticator.id, 'localVault');
  assert.equal(w.vaultFor(A1) === full.vault, true);
  assert.equal(await make([mm]).primaryVault(), undefined);
});
await test('changes are announced: the saved choice, a backend lock, a registration, an unregistration', async () => {
  const vault = backend('localVault', { vault: {} });
  const w = make([vault]);
  let n = 0;
  const off = w.onChange(() => { n += 1; });
  w.setActiveAuthenticator(A1, 'localVault');
  assert.equal(n, 1);
  vault.emit('lock');
  assert.equal(n, 2);
  const mm = backend('injected:io.metamask', {});
  const unregister = w.register(mm);
  assert.equal(n, 3);
  mm.emit('accountsChanged');
  assert.equal(n, 4);
  unregister();
  assert.equal(n, 5);
  mm.emit('accountsChanged');
  assert.equal(n, 5, 'an unregistered backend must not be forwarded');
  off();
  w.setActiveAuthenticator(A1, undefined);
  assert.equal(n, 5);
});
await test('the memory store is case-insensitive on the address', () => {
  const s = createMemoryActiveAuthenticatorStore({ [A1.toUpperCase()]: 'localVault' });
  assert.equal(s.get(A1.toLowerCase()), 'localVault');
  s.set(A1, undefined);
  assert.equal(s.get(A1), undefined);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
