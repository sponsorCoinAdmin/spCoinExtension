// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/vault.test.mjs
//
// Tests for the wallet vault (src/vault). Run: node test/vault.test.mjs   (needs `typescript` from an ancestor node_modules; uses Node's WebCrypto).
// MUTANT=nowrite / MUTANT=noserialize run the suite against a deliberately broken copy: they must report failures (proof the tests can fail).
// Tests for the wallet vault core (merit-wallet dist/vault). Real WebCrypto (Node's globalThis.crypto); low iteration counts for speed except one
// timing test at the real default (600,000).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url); // finds typescript in the host app's node_modules (an ancestor folder)
const ts = req('typescript');
const SRC = path.join(HERE, '..', 'src', 'vault') + path.sep;
const OUT = path.join(os.tmpdir(), 'merit_wallet_vault_test_cjs');
fs.mkdirSync(OUT, { recursive: true });
for (const f of ['vaultCrypto', 'vaultSession']) {
  const out = ts.transpileModule(fs.readFileSync(SRC + f + '.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  fs.writeFileSync(path.join(OUT, f + '.cjs'), out.replace(/require\("\.\/vaultCrypto"\)/g, 'require("./vaultCrypto.cjs")'));
}
if (process.env.MUTANT === 'nowrite') { const p = path.join(OUT, 'vaultSession.cjs'); let c = fs.readFileSync(p, 'utf8'); c = c.replace(/await this\.storage\.write\(vault\);\s*this\.data = next;/, 'this.data = next;'); fs.writeFileSync(p, c); }
if (process.env.MUTANT === 'noserialize') { const p = path.join(OUT, 'vaultSession.cjs'); let c = fs.readFileSync(p, 'utf8'); c = c.replace('const run = this.queue.then(op, op);', 'const run = op();'); fs.writeFileSync(p, c); }
const rq = createRequire(path.join(OUT, 'x.cjs'));
const C = rq('./vaultCrypto.cjs');
const S = rq('./vaultSession.cjs');
const { VaultSession, VaultLockedError } = S;
const { WrongPasswordError, DEFAULT_PBKDF2_ITERATIONS } = C;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

function memStorage() {
  let v; const writes = [];
  return { read: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), write: async (x) => { v = JSON.parse(JSON.stringify(x)); writes.push(v); }, clear: async () => { v = undefined; }, raw: () => v, writes };
}
const ITER = 1000;
const mk = (storage, extra = {}) => new VaultSession({ storage, iterations: ITER, ...extra });

await test('create stores an encrypted vault, leaves the session unlocked, and the ciphertext hides the data', async () => {
  const st = memStorage(); const s = mk(st);
  assert.equal(await s.isInitialized(), false);
  await s.create('pw-1', { secret: 'TOPSECRET-MNEMONIC-WORDS' });
  assert.equal(s.isUnlocked(), true);
  const v = st.raw();
  assert.equal(v.version, 1); assert.equal(v.algorithm, 'pbkdf2-sha256/aes-256-gcm'); assert.equal(v.iterations, ITER);
  assert.ok(v.salt && v.iv && v.data);
  assert.ok(!JSON.stringify(v).includes('TOPSECRET'));
  assert.deepEqual(s.getData(), { secret: 'TOPSECRET-MNEMONIC-WORDS' });
});

await test('lock drops the data; getData and update then throw VaultLockedError', async () => {
  const st = memStorage(); const s = mk(st); await s.create('pw', { n: 1 });
  s.lock(); assert.equal(s.isUnlocked(), false);
  assert.throws(() => s.getData(), VaultLockedError);
  await assert.rejects(s.update((d) => d), VaultLockedError);
});

await test('unlock with the right password restores the data; a wrong password throws WrongPasswordError and stays locked', async () => {
  const st = memStorage(); const a = mk(st); await a.create('right', { n: 7 }); a.lock();
  await assert.rejects(a.unlock('wrong'), WrongPasswordError); assert.equal(a.isUnlocked(), false);
  await a.unlock('right'); assert.deepEqual(a.getData(), { n: 7 });
});

await test('a tampered ciphertext fails authentication (reported as wrong password)', async () => {
  const st = memStorage(); const a = mk(st); await a.create('pw', { n: 1 }); a.lock();
  const v = st.raw(); const bytes = Buffer.from(v.data, 'base64'); bytes[0] ^= 0xff; v.data = bytes.toString('base64');
  const st2 = memStorage(); await st2.write(v);
  await assert.rejects(mk(st2).unlock('pw'), WrongPasswordError);
});

await test('update re-encrypts with the session key and stores it; a fresh session over the same storage sees the change; every write uses a fresh iv', async () => {
  const st = memStorage(); const s = mk(st); await s.create('pw', { n: 0 });
  await s.update((d) => ({ n: d.n + 1 })); await s.update((d) => ({ n: d.n + 1 }));
  const ivs = st.writes.map((w) => w.iv); assert.equal(new Set(ivs).size, ivs.length, 'iv reused');
  const fresh = mk(st); await fresh.unlock('pw'); assert.deepEqual(fresh.getData(), { n: 2 });
});

await test('concurrent updates are serialized (no lost writes)', async () => {
  const st = memStorage(); const s = mk(st); await s.create('pw', { n: 0 });
  await Promise.all(Array.from({ length: 12 }, () => s.update((d) => ({ n: d.n + 1 }))));
  assert.equal(s.getData().n, 12);
  const fresh = mk(st); await fresh.unlock('pw'); assert.equal(fresh.getData().n, 12);
});

await test('changePassword: old password stops working, new works, a wrong old password is rejected and changes nothing', async () => {
  const st = memStorage(); const s = mk(st); await s.create('old', { n: 5 });
  await assert.rejects(s.changePassword('nope', 'new'), WrongPasswordError);
  const f1 = mk(st); await f1.unlock('old');
  await s.changePassword('old', 'new');
  await assert.rejects(mk(st).unlock('old'), WrongPasswordError);
  const f2 = mk(st); await f2.unlock('new'); assert.deepEqual(f2.getData(), { n: 5 });
  assert.equal(s.isUnlocked(), true);
});

await test('auto-lock fires after the idle time and is restarted by activity', async () => {
  const st = memStorage(); const timers = []; let cleared = 0;
  const s = mk(st, { autoLockMs: 5000, setTimer: (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; }, clearTimer: () => { cleared++; } });
  await s.create('pw', { n: 1 });
  assert.equal(timers.at(-1).ms, 5000);
  s.getData(); assert.ok(cleared >= 1, 'activity should restart the timer');
  const last = timers.at(-1); last.fn();
  assert.equal(s.isUnlocked(), false);
});

await test('wipe deletes the vault and locks', async () => {
  const st = memStorage(); const s = mk(st); await s.create('pw', { n: 1 });
  await s.wipe(); assert.equal(await s.isInitialized(), false); assert.equal(s.isUnlocked(), false);
  await assert.rejects(s.unlock('pw'));
});

await test('create refuses to overwrite an existing vault', async () => {
  const st = memStorage(); const s = mk(st); await s.create('pw', { n: 1 });
  await assert.rejects(mk(st).create('other', { n: 2 }));
});

await test('a vault from a newer format version is refused, not misread', async () => {
  const st = memStorage(); const s = mk(st); await s.create('pw', { n: 1 }); s.lock();
  const v = st.raw(); v.version = 2; const st2 = memStorage(); await st2.write(v);
  await assert.rejects(mk(st2).unlock('pw'), /Unsupported vault version 2/);
});

await test('onChange fires on unlock and on lock only (not on update)', async () => {
  const st = memStorage(); const s = mk(st); let n = 0; const off = s.onChange(() => n++);
  await s.create('pw', { n: 0 }); await s.update((d) => d); s.lock(); s.lock(); await s.unlock('pw'); off(); s.lock();
  assert.equal(n, 3); // create(unlock), lock, unlock
});

function memSessionStore() {
  let v; return { get: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), set: async (x) => { v = JSON.parse(JSON.stringify(x)); }, clear: async () => { v = undefined; }, raw: () => v };
}
const tick = () => new Promise((r) => setTimeout(r, 20));

await test('session persistence: a restarted host (new VaultSession) comes back unlocked with no password; the store holds only the key', async () => {
  const st = memStorage(); const ss = memSessionStore(); let clock = 1000;
  const a = mk(st, { sessionStore: ss, now: () => clock, autoLockMs: 60000 });
  await a.create('my-password', { secret: 'S3CRET' }); await tick();
  assert.ok(ss.raw() && ss.raw().key && ss.raw().key.k, 'session key saved');
  assert.ok(!JSON.stringify(ss.raw()).includes('my-password') && !JSON.stringify(ss.raw()).includes('S3CRET'));
  const b = mk(st, { sessionStore: ss, now: () => clock, autoLockMs: 60000 });
  assert.equal(b.isUnlocked(), false);
  assert.equal(await b.restore(), true);
  assert.deepEqual(b.getData(), { secret: 'S3CRET' });
});

await test('session persistence: lock clears the saved key, so a restart stays locked', async () => {
  const st = memStorage(); const ss = memSessionStore();
  const a = mk(st, { sessionStore: ss }); await a.create('pw', { n: 1 }); await tick();
  a.lock(); await tick();
  assert.equal(ss.raw(), undefined);
  assert.equal(await mk(st, { sessionStore: ss }).restore(), false);
});

await test('session persistence: a restore after the auto-lock time stays locked and clears the key; activity moves lastActivity forward', async () => {
  const st = memStorage(); const ss = memSessionStore(); let clock = 1000;
  const a = mk(st, { sessionStore: ss, now: () => clock, autoLockMs: 5000, setTimer: () => ({}), clearTimer: () => undefined });
  await a.create('pw', { n: 1 }); await tick();
  assert.equal(ss.raw().lastActivity, 1000);
  clock = 3000; a.getData(); await tick(); assert.equal(ss.raw().lastActivity, 3000);
  clock = 3000 + 5001;
  const b = mk(st, { sessionStore: ss, now: () => clock, autoLockMs: 5000 });
  assert.equal(await b.restore(), false); assert.equal(b.isUnlocked(), false); assert.equal(ss.raw(), undefined);
});

await test('session persistence: a saved key that does not fit the stored vault (changed elsewhere, or garbage) is rejected and cleared', async () => {
  const st1 = memStorage(); const ss = memSessionStore();
  const a = mk(st1, { sessionStore: ss }); await a.create('pw', { n: 1 }); await tick();
  const st2 = memStorage(); const other = mk(st2); await other.create('pw', { n: 2 });
  const b = mk(st2, { sessionStore: ss });
  assert.equal(await b.restore(), false); assert.equal(b.isUnlocked(), false); assert.equal(ss.raw(), undefined);
});

await test('session persistence: without a session store the key is not extractable and nothing is saved', async () => {
  const st = memStorage(); const a = mk(st); await a.create('pw', { n: 1 });
  assert.equal(await mk(st).restore(), false);
});

// timing at the real default iteration count
const t0 = performance.now();
const st = memStorage(); const real = new VaultSession({ storage: st }); await real.create('pw', { n: 1 });
const tCreate = performance.now() - t0;
real.lock(); const t1 = performance.now(); await real.unlock('pw'); const tUnlock = performance.now() - t1;
results.push(['INFO', `real settings (${DEFAULT_PBKDF2_ITERATIONS} iterations): create ${tCreate.toFixed(0)} ms, unlock ${tUnlock.toFixed(0)} ms in Node`]);

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.filter((r) => r[0] === 'PASS').length} passed`);
process.exit(failed ? 1 : 0);
