// File: test/workerVault.test.mjs
//
// Conformance of the worker-backed vault (src/vault/workerVault.ts, docs/design/accountAuthDesign.txt section 15.7, item W1c): the VaultCapability over the extension's `merit/vault/*` and `merit/accounts/*` messages.
// A fake worker (a copy of walletBackground.ts's handler over the real VaultSession and WalletAccounts, in memory) answers the messages, and the adapter must behave like every other vault: set up, lock,
// unlock, accounts, change password, reveal, backup, delete, and the one error set. Run: node test/workerVault.test.mjs
// MUTANT=wrongPasswordMapped|broadcastIgnored|lockSilent|exportSkipsVerify|deleteSkipsVerify|pinAccepted run against deliberately broken copies and must report failures.
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
  if (rel === 'vault/workerVault') {
    if (m === 'wrongPasswordMapped') src = src.replace("reply.error === 'wrong-password' ? 'wrong_credential'", "reply.error === 'wrong-password' ? 'locked'");
    if (m === 'broadcastIgnored') src = src.replace("if (message?.type !== 'merit/vault/changed') return;", 'return;');
    if (m === 'lockSilent') src = src.replace('unlocked = false;\n      accountList = [];\n      notify();\n      void transport.send', 'unlocked = false;\n      accountList = [];\n      void transport.send');
    if (m === 'exportSkipsVerify') src = src.replace("await call({ type: 'merit/vault/verifyPassword', password: password(credential) });\n      const reply = await call({ type: 'merit/vault/exportBackup' });", "const reply = await call({ type: 'merit/vault/exportBackup' });");
    if (m === 'deleteSkipsVerify') src = src.replace("await call({ type: 'merit/vault/verifyPassword', password: password(credential) });\n      await call({ type: 'merit/vault/wipe' });", "await call({ type: 'merit/vault/wipe' });");
    if (m === 'pinAccepted') src = src.replace("if (credential.kind !== 'password') throw new VaultError('unsupported', 'This wallet opens with a password.');", '');
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? load(path.relative(SRC, path.resolve(path.dirname(file), id)).replace(/\\/g, '/')) : req(id)), mod, mod.exports);
  return mod.exports;
}
const { createWorkerVault } = load('vault/workerVault');
const { VaultError } = load('vault/vaultCapability');
const { VaultSession, TooManyAttemptsError } = load('vault/vaultSession');
const { WalletAccounts, WalletAccountError, createWallet } = load('vault/walletAccounts');
const { WrongPasswordError } = load('vault/vaultCrypto');

// The fake worker: the same message handling as walletBackground.ts, over the real session and accounts.
function fakeWorker() {
  let stored;
  const storage = { read: async () => (stored ? JSON.parse(JSON.stringify(stored)) : undefined), write: async (x) => { stored = JSON.parse(JSON.stringify(x)); }, clear: async () => { stored = undefined; } };
  const session = new VaultSession({ storage, iterations: 1000, autoLockMs: 0 });
  const accounts = new WalletAccounts(session);
  const broadcasts = new Set();
  const broadcast = () => broadcasts.forEach((h) => h({ type: 'merit/vault/changed', unlocked: session.isUnlocked() }));
  session.onChange(broadcast);
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
        case 'merit/vault/changePassword':
          if (typeof r.newPassword !== 'string' || r.newPassword.length < 8) return { ok: false, error: 'invalid-request', message: 'Password must be at least 8 characters.' };
          await session.changePassword(r.oldPassword, r.newPassword); return snapshot();
        case 'merit/vault/verifyPassword': await session.verifyPassword(r.password); return snapshot();
        case 'merit/vault/wipe': await session.wipe(); return snapshot();
        case 'merit/vault/exportBackup': return snapshot({ backup: await session.exportBackup() });
        case 'merit/vault/importBackup': await session.importBackup(r.vault, r.password); return snapshot();
        case 'merit/accounts/exportPrivateKey': return snapshot({ privateKey: await accounts.revealPrivateKey(r.password, r.address) });
        case 'merit/accounts/list': return snapshot({ accounts: accounts.list(), active: accounts.activeAddress() });
        case 'merit/accounts/addDerived': return snapshot({ account: await accounts.addDerived(r.name) });
        case 'merit/accounts/importPrivateKey': return snapshot({ account: await accounts.importPrivateKey(r.privateKey, r.name) });
        case 'merit/accounts/setActive': await accounts.setActive(r.address); return snapshot({ active: accounts.activeAddress() });
        case 'merit/accounts/revealMnemonic': return snapshot({ mnemonic: await accounts.revealMnemonic(r.password) });
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
  const sent = [];
  return {
    session, sent,
    transport: { send: async (message) => { sent.push(message.type); return handle(message); }, subscribe: (h) => { broadcasts.add(h); return () => broadcasts.delete(h); } },
  };
}
const pw = (value) => ({ kind: 'password', value });
const code = async (promise) => { try { await promise; return 'no error'; } catch (e) { return e instanceof VaultError ? e.code : 'other:' + (e && e.message); } };
const tick = () => new Promise((r) => setTimeout(r, 10));
const HH0_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ABANDON = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('set up: no wallet at first; create returns the phrase once and the accounts; a weak password is weak_credential', async () => {
  const w = fakeWorker();
  const v = createWorkerVault(w.transport);
  await v.ready;
  assert.equal(await v.hasWallet(), false);
  assert.equal(await code(v.create(pw('short'))), 'weak_credential');
  const made = await v.create(pw('password-1'));
  assert.equal(made.recoveryPhrase.split(' ').length, 12);
  assert.ok(made.accounts.length >= 1);
  assert.equal(v.isUnlocked(), true);
  assert.equal(await v.hasWallet(), true);
  assert.equal(v.label, 'this device');
});
await test('lock and unlock: lock is immediate; a wrong password is wrong_credential; the right one unlocks and lists the accounts', async () => {
  const w = fakeWorker();
  const v = createWorkerVault(w.transport);
  await v.importPhrase(ABANDON, pw('password-1'));
  let n = 0; v.onChange(() => { n += 1; });
  v.lock();
  assert.equal(v.isUnlocked(), false);
  assert.equal(v.accounts().length, 0);
  assert.ok(n >= 1, 'lock announces itself');
  assert.equal(await code(v.unlock(pw('wrong-aaaa'))), 'wrong_credential');
  await v.unlock(pw('password-1'));
  assert.equal(v.isUnlocked(), true);
  assert.ok(v.accounts().length >= 1);
});
await test('the worker locking itself (its auto-lock) is picked up from the broadcast', async () => {
  const w = fakeWorker();
  const v = createWorkerVault(w.transport);
  await v.importPhrase(ABANDON, pw('password-1'));
  assert.equal(v.isUnlocked(), true);
  let n = 0; v.onChange(() => { n += 1; });
  w.session.lock();
  await tick();
  assert.equal(v.isUnlocked(), false);
  assert.ok(n >= 1);
});
await test('accounts: addAccount derives the next one; importKey adds an imported one; a bad key is invalid_key; setActive is remembered', async () => {
  const w = fakeWorker();
  const v = createWorkerVault(w.transport);
  const made = await v.importPhrase(ABANDON, pw('password-1'));
  const before = made.length;
  const added = await v.addAccount('Second');
  assert.equal(added.source, 'generated');
  const imported = await v.importKey(HH0_KEY, 'Hardhat zero');
  assert.equal(imported.source, 'imported');
  assert.equal(v.accounts().length, before + 2);
  assert.equal(await code(v.importKey('0x1234')), 'invalid_key');
  await v.setActive(added.address);
  assert.equal(v.activeAddress().toLowerCase(), added.address.toLowerCase());
});
await test('change password: same is same_credential, a wrong current is wrong_credential, the new one works after a lock', async () => {
  const w = fakeWorker();
  const v = createWorkerVault(w.transport);
  await v.importPhrase(ABANDON, pw('password-1'));
  assert.equal(await code(v.changeCredential(pw('password-1'), pw('password-1'))), 'same_credential');
  assert.equal(await code(v.changeCredential(pw('wrong-aaaa'), pw('password-2'))), 'wrong_credential');
  assert.equal(await code(v.changeCredential(pw('password-1'), pw('short'))), 'weak_credential');
  await v.changeCredential(pw('password-1'), pw('password-2'));
  v.lock();
  assert.equal(await code(v.unlock(pw('password-1'))), 'wrong_credential');
  await v.unlock(pw('password-2'));
});
await test('reveal: the right password shows the key and the phrase; a wrong one reveals nothing', async () => {
  const w = fakeWorker();
  const v = createWorkerVault(w.transport);
  const accounts = await v.importPhrase(ABANDON, pw('password-1'));
  assert.equal(await v.revealRecoveryPhrase(pw('password-1')), ABANDON);
  assert.match(await v.revealPrivateKey(pw('password-1'), accounts[0].address), /^0x[0-9a-f]{64}$/i);
  assert.equal(await code(v.revealRecoveryPhrase(pw('wrong-aaaa'))), 'wrong_credential');
  assert.equal(await code(v.revealPrivateKey(pw('wrong-aaaa'), accounts[0].address)), 'wrong_credential');
});
await test('backup: export needs the password; the file hides the phrase; delete needs it too; restoring brings the same accounts back; a damaged file is invalid_backup', async () => {
  const w = fakeWorker();
  const v = createWorkerVault(w.transport);
  const accounts = await v.importPhrase(ABANDON, pw('password-1'));
  w.sent.length = 0;
  assert.equal(await code(v.exportBackup(pw('wrong-aaaa'))), 'wrong_credential');
  assert.ok(!w.sent.includes('merit/vault/exportBackup'), 'a wrong password must not reach the export');
  const file = await v.exportBackup(pw('password-1'));
  assert.ok(!file.includes('abandon'));
  assert.equal(await code(v.deleteWallet(pw('wrong-aaaa'))), 'wrong_credential');
  assert.equal(await v.hasWallet(), true);
  await v.deleteWallet(pw('password-1'));
  assert.equal(await v.hasWallet(), false);
  assert.equal(v.accounts().length, 0);
  assert.equal(await code(v.importBackup('not json', pw('password-1'))), 'invalid_backup');
  const restored = await v.importBackup(file, pw('password-1'));
  assert.deepEqual(restored.map((a) => a.address), accounts.map((a) => a.address));
  assert.equal(await v.hasWallet(), true);
});
await test('too many wrong passwords is locked_out with the wait taken from the worker\'s message', async () => {
  const w = fakeWorker();
  const v = createWorkerVault(w.transport);
  await v.importPhrase(ABANDON, pw('password-1'));
  v.lock();
  let last;
  for (let i = 0; i < 12; i++) last = await code(v.unlock(pw('wrong-aaaa')));
  assert.equal(last, 'locked_out');
  try { await v.unlock(pw('wrong-aaaa')); } catch (e) { assert.ok(e.retryAfterMs > 0, 'retryAfterMs is set'); }
});
await test('only a password exists in the worker: a PIN or biometric credential is unsupported', async () => {
  const v = createWorkerVault(fakeWorker().transport);
  assert.equal(await code(v.create({ kind: 'pin', value: '123456' })), 'unsupported');
  assert.equal(await code(v.unlock({ kind: 'biometric', value: 'x' })), 'unsupported');
  assert.equal(v.capabilities.biometric, false);
});
await test('a worker that cannot be reached is an error, not a crash, and the last state is kept', async () => {
  const v = createWorkerVault({ send: async () => { throw new Error('Could not establish connection'); }, subscribe: () => () => undefined });
  await v.ready;
  assert.equal(await v.hasWallet(), false);
  assert.equal(await code(v.unlock(pw('password-1'))), 'unsupported');
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
