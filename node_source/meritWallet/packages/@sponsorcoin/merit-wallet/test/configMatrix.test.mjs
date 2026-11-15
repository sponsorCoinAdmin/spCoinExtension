// File: test/configMatrix.test.mjs
//
// Row 17 of docs/design/accountAuthDesign.txt (the configuration matrix, section 6) at the Wallet level: web vault, the Merit extension seen from the web page, MetaMask and the extension's own vault are registered TOGETHER, each holding
// its own account. Every request (sign a message, send a transaction) reaches ONLY the wallet that account chose, whichever other wallets are registered, locked or absent; a refusal in one wallet does not touch another; two wallets
// holding the same address are told apart by the saved choice. Run: node test/configMatrix.test.mjs
// MUTANT=fallsBackToAnother|storeIgnored run against deliberately broken copies and must report failures.
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

const log = [];
function backend(id, { accounts = [], available = true, vault = false, reject = false } = {}) {
  const vaultFlags = { create: true, importPhrase: true, importKey: true, backup: true, changeCredential: true, delete: true, revealKey: true, revealPhrase: true, biometric: false };
  return {
    id, label: id,
    capabilities: { signMessage: true, signTypedData: false, sendTransaction: true, listAccounts: true, createAccount: vault, importKey: vault, lock: vault },
    vault: vault ? { label: 'x', capabilities: vaultFlags, hasWallet: async () => true } : undefined,
    async status() { return { available, unlocked: true }; },
    async accounts() { return accounts.map((address) => ({ address })); },
    async signMessage(address) { log.push(['sign', id, address]); if (reject) throw new AuthenticatorError('user_rejected', 'no', id); return '0x' + id.length; },
    async sendTransaction() { log.push(['send', id]); return { hash: '0x' + id }; },
    onChange() { return () => undefined; },
  };
}
const A1 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const A2 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const A3 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const owner = { [A1]: 'browserVault', [A2]: 'injected:org.sponsorcoin.merit', [A3]: 'injected:io.metamask' };
const make = (over = {}) => {
  const w = createWallet({ appDefault: (a) => owner[a.address] });
  [backend('browserVault', { accounts: [A1], vault: true }), backend('injected:org.sponsorcoin.merit', { accounts: [A2] }), backend('injected:io.metamask', { accounts: [A3] }), ...(over.extra ?? [])].forEach((b) => w.register(b));
  return w;
};
const results = [];
const test = async (name, fn) => { log.length = 0; try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('each account signs in its own wallet and in no other (web vault, Merit extension, MetaMask)', async () => {
  const w = make();
  for (const a of [A1, A2, A3]) await (await w.authenticatorFor({ address: a })).signMessage(a, 'hello');
  assert.deepEqual(log.map((l) => l[1]), ['browserVault', 'injected:org.sponsorcoin.merit', 'injected:io.metamask']);
});

await test('a transaction goes to the wallet of the account that sends it', async () => {
  const w = make();
  await (await w.authenticatorFor({ address: A2 })).sendTransaction(A2, {});
  assert.deepEqual(log, [['send', 'injected:org.sponsorcoin.merit']]);
});

await test('a wallet that is not reachable stops only its own accounts; the others keep signing', async () => {
  const w = new Map();
  const wallet = createWallet({ appDefault: (a) => owner[a.address] });
  [backend('browserVault', { accounts: [A1], vault: true }), backend('injected:org.sponsorcoin.merit', { accounts: [A2], available: false }), backend('injected:io.metamask', { accounts: [A3] })].forEach((b) => wallet.register(b));
  await assert.rejects(wallet.authenticatorFor({ address: A2 }), (e) => e instanceof AuthenticatorError && e.code === 'unreachable' && e.authenticatorId === 'injected:org.sponsorcoin.merit');
  assert.equal((await wallet.authenticatorFor({ address: A1 })).id, 'browserVault');
  assert.equal((await wallet.authenticatorFor({ address: A3 })).id, 'injected:io.metamask');
  assert.deepEqual(log, []);
});

await test('a refusal in one wallet is the error of that wallet and leaves the others untouched', async () => {
  const wallet = createWallet({ appDefault: (a) => owner[a.address] });
  [backend('browserVault', { accounts: [A1], vault: true }), backend('injected:io.metamask', { accounts: [A3], reject: true })].forEach((b) => wallet.register(b));
  await assert.rejects((await wallet.authenticatorFor({ address: A3 })).signMessage(A3, 'x'), (e) => e.code === 'user_rejected');
  await (await wallet.authenticatorFor({ address: A1 })).signMessage(A1, 'x');
  assert.deepEqual(log.map((l) => l[1]), ['injected:io.metamask', 'browserVault']);
});

await test('an address held by two wallets goes where the saved choice says, and moves when the choice moves', async () => {
  const wallet = createWallet({ appDefault: () => 'browserVault' });
  [backend('browserVault', { accounts: [A1], vault: true }), backend('injected:io.metamask', { accounts: [A1] })].forEach((b) => wallet.register(b));
  await (await wallet.authenticatorFor({ address: A1 })).signMessage(A1, 'x');
  wallet.setActiveAuthenticator(A1, 'injected:io.metamask');
  await (await wallet.authenticatorFor({ address: A1 })).signMessage(A1, 'x');
  assert.deepEqual(log.map((l) => l[1]), ['browserVault', 'injected:io.metamask']);
});

await test('with no wallet registered for an account the request fails in words and nothing signs', async () => {
  const wallet = createWallet({ appDefault: () => 'hardware:ledger' });
  wallet.register(backend('browserVault', { accounts: [A1], vault: true }));
  await assert.rejects(wallet.authenticatorFor({ address: A1 }), (e) => e instanceof AuthenticatorError && e.code === 'unreachable');
  assert.deepEqual(log, []);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
