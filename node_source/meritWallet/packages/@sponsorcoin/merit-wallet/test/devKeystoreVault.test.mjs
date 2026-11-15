// File: test/devKeystoreVault.test.mjs
//
// Tests for the dev keystore as a VaultCapability (lib/spCoin/devKeystoreVault.ts, docs/design/accountAuthDesign.txt section 15.7, item W1d): the web app's server keystore behind the one wallet interface. A fake bridge stands in
// for walletState.tsx's password handlers and lock state (components/wallet/lib/keystoreBridge.ts); a fake fetch stands in for the reveal route. Checks the lock state, unlock / create / change / delete and the error
// mapping, the key reveal request, honest capability flags (no recovery phrase, no backup, no import here) and the changes announced. Run: node test/devKeystoreVault.test.mjs
// MUTANT=unlockIgnoresFalse|revealWithoutPassword|capabilitiesAllTrue|hasWalletNeverWaits|changeSkipsSameCheck run against deliberately broken copies and must report failures.
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
function loadSrc(rel) {
  const file = path.join(SRC, rel + '.ts');
  if (cache.has(file)) return cache.get(file).exports;
  const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? loadSrc(path.relative(SRC, path.resolve(path.dirname(file), id)).replace(/\\/g, '/')) : req(id)), mod, mod.exports);
  return mod.exports;
}
const { VaultError } = loadSrc('vault/vaultCapability');

let src = fs.readFileSync(path.join(WEB, 'lib', 'spCoin', 'devKeystoreVault.ts'), 'utf8').replace(/\r\n/g, '\n');
if (m === 'unlockIgnoresFalse') src = src.replace("if (!ok) throw new VaultError('wrong_credential', 'Incorrect password.');", '');
if (m === 'revealWithoutPassword') src = src.replace('address, password: secret(credential) }', 'address }');
if (m === 'capabilitiesAllTrue') src = src.replace('importPhrase: false, importKey: false, backup: false,', 'importPhrase: true, importKey: true, backup: true,').replace('revealPhrase: false', 'revealPhrase: true');
if (m === 'hasWalletNeverWaits') src = src.replace('if (deps.state().hasPassword !== null) return deps.state().hasPassword === true;', 'return deps.state().hasPassword === true;');
if (m === 'changeSkipsSameCheck') src = src.replace("if (secret(current) === secret(next)) throw new VaultError('same_credential', 'The new password must differ from the current one.');", '');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: 'devKeystoreVault.ts' }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)((id) => {
  if (id === '@sponsorcoin/merit-wallet') return { VaultError };
  if (id === '@/components/wallet/lib/keystoreBridge') return { getKeystoreBridgeHandlers: () => null, getKeystoreBridgeState: () => ({}), subscribeKeystoreBridge: () => () => undefined };
  if (id === '@/components/wallet/lib/meritConnect/accounts') return { MERIT_WALLET_HARDHAT_CHAIN_ID: 31337 };
  if (id === '@/components/wallet/lib/meritConnect') return { invalidateMeritSignerCache: () => undefined };
  return req(id);
}, mod, mod.exports);
const { createDevKeystoreVault, keystoreError } = mod.exports;

const A1 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const pw = (value) => ({ kind: 'password', value });
const code = async (p) => { try { await p; return 'no error'; } catch (e) { return e instanceof VaultError ? e.code : 'other:' + (e && e.message); } };

function harness(initial = {}) {
  let state = { hasPassword: true, locked: true, accounts: [{ address: A1, name: 'Doggie' }], ...initial };
  let handlers = {
    calls: [],
    setPassword: async (p) => { handlers.calls.push(['setPassword', p]); },
    unlock: async (p) => { handlers.calls.push(['unlock', p]); return p === 'right-password'; },
    lock: () => { handlers.calls.push(['lock']); },
    changePassword: async (o, n) => { handlers.calls.push(['change', o, n]); return o === 'right-password' ? { ok: true } : { ok: false, message: 'Incorrect current password.' }; },
    refreshAccounts: async () => { handlers.calls.push(['refreshAccounts']); },
    deleteWallet: async (p) => { handlers.calls.push(['delete', p]); return p === 'right-password' ? { ok: true } : { ok: false, message: 'Incorrect password.' }; },
  };
  const listeners = new Set();
  const fetched = [];
  let reveal = { ok: true, body: { ok: true, privateKey: '0xkey' } };
  const revealed = [];
  const vault = createDevKeystoreVault({
    state: () => state,
    handlers: () => handlers,
    subscribe: (l) => { listeners.add(l); return () => listeners.delete(l); },
    fetchImpl: async (url, init) => { fetched.push([url, JSON.parse(init.body)]); return { ok: reveal.ok, json: async () => reveal.body }; },
    afterReveal: () => revealed.push(true),
    settleMs: 40,
  });
  return {
    vault, fetched, revealed,
    handlers: () => handlers, noHandlers: () => { handlers = null; },
    publish: (next) => { state = { ...state, ...next }; listeners.forEach((l) => l()); },
    setReveal: (r) => { reveal = r; },
  };
}

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('lock state follows the provider: locked, unlocked, no password yet; hasWallet waits for the first check and gives up if it never comes', async () => {
  const h = harness();
  assert.equal(await h.vault.hasWallet(), true);
  assert.equal(h.vault.isUnlocked(), false);
  h.publish({ locked: false });
  assert.equal(h.vault.isUnlocked(), true);
  h.publish({ hasPassword: false });
  assert.equal(h.vault.isUnlocked(), false);
  const pending = harness({ hasPassword: null });
  const waiting = pending.vault.hasWallet();
  setTimeout(() => pending.publish({ hasPassword: true }), 10);
  assert.equal(await waiting, true);
  const never = harness({ hasPassword: null });
  assert.equal(await never.vault.hasWallet(), false);
});
await test('unlock: a wrong password is wrong_credential, the right one passes it to the provider; a PIN is unsupported', async () => {
  const h = harness();
  assert.equal(await code(h.vault.unlock(pw('nope-nope'))), 'wrong_credential');
  assert.equal(await code(h.vault.unlock(pw('right-password'))), 'no error');
  assert.deepEqual(h.handlers().calls, [['unlock', 'nope-nope'], ['unlock', 'right-password']]);
  assert.equal(await code(h.vault.unlock({ kind: 'pin', value: '123456' })), 'unsupported');
});
await test('create sets the password through the provider and returns no recovery phrase (the keystore has none)', async () => {
  const h = harness({ hasPassword: false });
  const made = await h.vault.create(pw('password-1'));
  assert.deepEqual(h.handlers().calls, [['setPassword', 'password-1']]);
  assert.equal(made.recoveryPhrase, '');
  assert.equal(made.accounts.length, 1);
});
await test('change password: same is same_credential; the provider\'s messages become wrong_credential / weak_credential / locked_out', async () => {
  const h = harness();
  assert.equal(await code(h.vault.changeCredential(pw('right-password'), pw('right-password'))), 'same_credential');
  assert.equal(await code(h.vault.changeCredential(pw('nope-nope'), pw('password-2'))), 'wrong_credential');
  assert.equal(await code(h.vault.changeCredential(pw('right-password'), pw('password-2'))), 'no error');
  assert.equal(keystoreError('New password must be at least 8 characters.').code, 'weak_credential');
  const lockedOut = keystoreError('Too many attempts. Try again in 12 seconds.');
  assert.deepEqual([lockedOut.code, lockedOut.retryAfterMs], ['locked_out', 12000]);
});
await test('delete the wallet: a wrong password is refused, the right one goes to the provider', async () => {
  const h = harness();
  assert.equal(await code(h.vault.deleteWallet(pw('nope-nope'))), 'wrong_credential');
  assert.equal(await code(h.vault.deleteWallet(pw('right-password'))), 'no error');
});
await test('reveal a private key: posts the chain, the address and the password to the reveal route, then refreshes the signer cache; a refusal is wrong_credential', async () => {
  const h = harness();
  assert.equal(await h.vault.revealPrivateKey(pw('right-password'), A1), '0xkey');
  assert.deepEqual(h.fetched[0], ['/api/spCoin/meritConnect/reveal', { chainId: 31337, address: A1, password: 'right-password' }]);
  assert.equal(h.revealed.length, 1);
  h.setReveal({ ok: false, body: { ok: false, message: 'Incorrect password.' } });
  assert.equal(await code(h.vault.revealPrivateKey(pw('nope-nope'), A1)), 'wrong_credential');
  assert.equal(h.revealed.length, 1, 'a refused reveal must not refresh the cache');
});
await test('honest capabilities: password, change, delete and key reveal only; no recovery phrase, no backup file, no import here', async () => {
  const h = harness();
  assert.deepEqual(h.vault.capabilities, { create: true, importPhrase: false, importKey: false, backup: false, changeCredential: true, delete: true, revealKey: true, revealPhrase: false, biometric: false, removeAccount: true });
  for (const call of [() => h.vault.importPhrase('x', pw('password-1')), () => h.vault.importKey('0x1'), () => h.vault.addAccount(), () => h.vault.exportBackup(pw('password-1')), () => h.vault.importBackup('{}', pw('password-1')), () => h.vault.revealRecoveryPhrase(pw('password-1'))]) {
    assert.equal(await code(call()), 'unsupported');
  }
  assert.equal(h.vault.label, 'the dev server');
});
await test('accounts come from the provider; lock calls the provider; before the provider is ready an operation is an error, not a crash; changes are announced', async () => {
  const h = harness();
  assert.deepEqual(h.vault.accounts().map((a) => [a.address, a.name]), [[A1, 'Doggie']]);
  h.vault.lock();
  assert.deepEqual(h.handlers().calls, [['lock']]);
  let n = 0; const off = h.vault.onChange(() => { n += 1; });
  h.publish({ locked: false });
  assert.equal(n, 1);
  off();
  h.publish({ locked: true });
  assert.equal(n, 1);
  h.noHandlers();
  h.vault.lock();
  assert.equal(await code(h.vault.unlock(pw('right-password'))), 'unsupported');
});

await test('removeAccount (2026-11-10): posts the address and password to the remove route, then refreshes the accounts; a wrong password is wrong_credential and refreshes nothing', async () => {
  const h = harness();
  await h.vault.removeAccount({ kind: 'password', value: 'right-password' }, A1);
  assert.deepEqual(h.fetched[0], ['/api/spCoin/meritConnect/removeAccount', { address: A1, password: 'right-password' }]);
  assert.ok(h.handlers().calls.some((c) => c[0] === 'refreshAccounts'));
  const bad = harness();
  bad.setReveal({ ok: false, body: { ok: false, message: 'Incorrect password.' } });
  await assert.rejects(bad.vault.removeAccount({ kind: 'password', value: 'nope' }, A1), (e) => e.code === 'wrong_credential');
  assert.ok(!bad.handlers().calls.some((c) => c[0] === 'refreshAccounts'));
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
