// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/security.test.mjs
//
// Tests for the security pass (table row 19): password-guess limit, encrypted backup / restore, private-key export behind the password, and a
// scan that no secret-handling source logs. Run: node test/security.test.mjs
// MUTANT=noThrottle / MUTANT=exportNoPassword run against a deliberately broken copy and must report failures.
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
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  let src = fs.readFileSync(path.join(SRC, 'vault', name + '.ts'), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
  if (name === 'vaultSession' && process.env.MUTANT === 'noThrottle') src = src.replace('if (wait > 0) throw new TooManyAttemptsError(wait);', '');
  if (name === 'walletAccounts' && process.env.MUTANT === 'exportNoPassword') src = src.replace('await this.session.verifyPassword(password);\n    const c = this.contents();\n    const target', 'const c = this.contents();\n    const target');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} }; cache.set(name, m);
  new Function('require', 'module', 'exports', js)((s) => (s.startsWith('./') ? load(s.slice(2)) : req(s)), m, m.exports);
  return m.exports;
}
const { VaultSession, TooManyAttemptsError } = load('vaultSession');
const { WrongPasswordError } = load('vaultCrypto');
const { WalletAccounts, createWallet, HARDHAT_DEV_MNEMONIC } = load('walletAccounts');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
function memStorage() { let v; return { read: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), write: async (x) => { v = JSON.parse(JSON.stringify(x)); }, clear: async () => { v = undefined; }, raw: () => v }; }
const HH0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const HH0_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

async function made(opts = {}) {
  let t = 1_000_000;
  const st = memStorage();
  const s = new VaultSession({ storage: st, iterations: 1000, now: () => t, ...opts });
  const acc = new WalletAccounts(s);
  const r = await createWallet(s, 'right-password', { mnemonic: HARDHAT_DEV_MNEMONIC });
  s.lock();
  return { s, acc, st, r, advance: (ms) => { t += ms; } };
}
const wrong = async (s) => { try { await s.unlock('wrong-password'); return 'ok'; } catch (e) { return e instanceof WrongPasswordError ? 'wrong' : e instanceof TooManyAttemptsError ? 'blocked' : 'other:' + e.message; } };

await test('five wrong passwords in a row block further tries (even the right password) until the wait passes, and the wait doubles', async () => {
  const { s, advance } = await made();
  for (let i = 0; i < 5; i++) assert.equal(await wrong(s), 'wrong');
  assert.equal(await wrong(s), 'blocked');
  await assert.rejects(s.unlock('right-password'), TooManyAttemptsError);
  advance(29_000); await assert.rejects(s.unlock('right-password'), TooManyAttemptsError);
  advance(2_000); assert.equal(await wrong(s), 'wrong'); // 6th guess allowed, now the wait is 60 s
  advance(31_000); await assert.rejects(s.unlock('right-password'), TooManyAttemptsError);
  advance(30_000); await s.unlock('right-password'); assert.equal(s.isUnlocked(), true);
});

await test('a correct password resets the count; verifyPassword and changePassword are limited the same way', async () => {
  const { s } = await made();
  for (let i = 0; i < 4; i++) assert.equal(await wrong(s), 'wrong');
  await s.unlock('right-password'); s.lock();
  for (let i = 0; i < 4; i++) assert.equal(await wrong(s), 'wrong');
  assert.equal(await wrong(s), 'wrong');
  await assert.rejects(s.verifyPassword('right-password'), TooManyAttemptsError);
  await assert.rejects(s.changePassword('right-password', 'new-password-1'), TooManyAttemptsError);
});

await test('backup is the stored ciphertext; restoring it on a wiped wallet with the right password brings the accounts back', async () => {
  const { s, acc, st } = await made();
  await s.unlock('right-password'); await acc.addDerived('Second');
  const before = acc.list();
  const backup = await s.exportBackup();
  const text = JSON.stringify(backup);
  assert.ok(!text.includes('test test') && !text.includes(HH0.slice(2)) && !text.includes(HH0_KEY.slice(2)));
  await s.wipe();
  await assert.rejects(s.exportBackup(), /no vault/);
  await assert.rejects(s.importBackup(backup, 'bad-password-x'), WrongPasswordError);
  assert.equal(st.raw(), undefined);
  await s.importBackup(backup, 'right-password');
  assert.deepEqual(acc.list(), before); assert.equal(s.isUnlocked(), true);
  await assert.rejects(s.importBackup(backup, 'right-password'), /already exists/);
});

await test('private key export needs the password again; the key matches the account for derived and imported accounts', async () => {
  const { s, acc } = await made();
  await s.unlock('right-password');
  const other = viem.generatePrivateKey ? null : null;
  const imp = await acc.importPrivateKey(req('viem/accounts').generatePrivateKey(), 'Imp');
  await assert.rejects(acc.revealPrivateKey('nope-nope', HH0), WrongPasswordError);
  const k0 = await acc.revealPrivateKey('right-password', HH0);
  assert.equal(k0, HH0_KEY);
  assert.equal(req('viem/accounts').privateKeyToAccount(await acc.revealPrivateKey('right-password', imp.address)).address, imp.address);
  await assert.rejects(acc.revealPrivateKey('right-password', '0x8d581506486BC255B42D05754392573e46c34577'), /not in this wallet/);
  assert.equal(s.isUnlocked(), true); void other;
});

await test('no source that handles secrets writes to the console', () => {
  const offenders = [];
  for (const dir of ['vault', 'send', 'session', 'provider']) {
    for (const f of fs.readdirSync(path.join(SRC, dir))) {
      if (/console\s*\./.test(fs.readFileSync(path.join(SRC, dir, f), 'utf8'))) offenders.push(dir + '/' + f);
    }
  }
  assert.deepEqual(offenders, []);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
