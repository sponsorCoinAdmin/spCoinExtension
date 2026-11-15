// File: test/keystoreStore.test.mjs
//
// Guards docs/design/accountAuthDesign.txt section 15, item H1, on the dev keystore store (components/wallet/lib/meritConnect/keystore.server.ts): writes are atomic (a failed write leaves the old store
// and no temporary file), every change goes through one lock (25 concurrent upserts all survive), and the store is validated on load (an index key that is not its entry's address, a newer version,
// a torn file and a missing `accounts` object are all refused). Real fs in a scratch directory. Run: node test/keystoreStore.test.mjs
// MUTANT=nonAtomic|noLock|noValidation run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(path.join(WEB, 'package.json'));
const ts = req('typescript');
const m = process.env.MUTANT;

let src = fs.readFileSync(path.join(WEB, 'components', 'wallet', 'lib', 'meritConnect', 'keystore.server.ts'), 'utf8').replace(/\r\n/g, '\n');
// writes go straight into the store file (a crash mid-write leaves a truncated file)
if (m === 'nonAtomic') src = src.replace(/async function writeStoreAtomically[\s\S]*?\n}\n/, "async function writeStoreAtomically(keyStorePath: string, file: MeritWalletKeyStoreFile): Promise<void> {\n  await fs.writeFile(keyStorePath, JSON.stringify(file, null, 2), 'utf8');\n}\n");
// no lock: the work runs at once
if (m === 'noLock') src = src.replace('const run = holder.tail.then(work, work);', 'const run = work();');
// the index is not checked against the entries on load
if (m === 'noValidation') src = src.replace('if (entryAddress !== key) {', 'if (false) {');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

const realFs = req('fs');
let failRenameOnce = false;
const fakeFs = { ...realFs, promises: { ...realFs.promises, rename: async (...a) => { if (failRenameOnce) { failRenameOnce = false; throw new Error('disk full'); } return realFs.promises.rename(...a); } } };
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)((id) => {
  if (id === 'fs') return fakeFs;
  if (id === 'path') return Object.assign({ default: path }, path);
  // the web file imports these two helpers straight from the engine (2026-10-21: the one-line web wrapper lib/accounts/accountAddress.ts is gone)
  if (id === '@/lib/accounts/accountAddress' || id === '@sponsorcoin/spcoin-exchange-engine') return { normalizeAccountAddress: (v) => (/^0[xX][0-9a-fA-F]{40}$/.test(String(v ?? '').trim()) ? '0x' + String(v).trim().slice(2).toLowerCase() : undefined), toAccountDiskFolderName: (v) => String(v) };
  return {};
}, mod, mod.exports);
const K = mod.exports;

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'keystore-'));
process.chdir(root);
const walletDir = path.join(root, 'resources', 'data', 'meritWallet');
const storePath = path.join(walletDir, 'keystore.json');
const addr = (n) => '0x' + n.toString(16).padStart(40, '0');
const entry = (n) => ({ address: addr(n), encryptedKey: 'ct' + n });
const leftovers = () => (fs.existsSync(walletDir) ? fs.readdirSync(walletDir).filter((f) => f.endsWith('.tmp')) : []);

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('upsert and remove round-trip, the file is valid JSON and no temporary file is left', async () => {
  await K.upsertMeritWalletKeyStoreEntry(entry(1));
  await K.upsertMeritWalletKeyStoreEntry(entry(2));
  assert.equal((await K.readMeritWalletKeyStoreEntries()).length, 2);
  assert.equal(await K.removeMeritWalletKeyStoreEntry(addr(1)), true);
  assert.equal(await K.removeMeritWalletKeyStoreEntry(addr(1)), false);
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(storePath, 'utf8')).accounts), [addr(2)]);
  assert.deepEqual(leftovers(), []);
});
await test('25 concurrent upserts all survive (one lock around read-modify-write)', async () => {
  await Promise.all(Array.from({ length: 25 }, (_, i) => K.upsertMeritWalletKeyStoreEntry(entry(100 + i))));
  const all = (await K.readMeritWalletKeyStoreEntries()).map((e) => e.address);
  for (let i = 0; i < 25; i++) assert.ok(all.includes(addr(100 + i)), 'lost ' + addr(100 + i));
});
await test('concurrent upserts and removes keep the store consistent', async () => {
  await Promise.all([
    ...Array.from({ length: 10 }, (_, i) => K.upsertMeritWalletKeyStoreEntry(entry(300 + i))),
    ...Array.from({ length: 10 }, (_, i) => K.removeMeritWalletKeyStoreEntry(addr(100 + i))),
  ]);
  const all = (await K.readMeritWalletKeyStoreEntries()).map((e) => e.address);
  for (let i = 0; i < 10; i++) { assert.ok(all.includes(addr(300 + i))); assert.ok(!all.includes(addr(100 + i))); }
  assert.equal((await K.readMeritWalletKeyStoreEntries()).length, new Set(all).size);
});
await test('a failed write leaves the old store readable and no temporary file', async () => {
  const before = fs.readFileSync(storePath, 'utf8');
  failRenameOnce = true;
  await assert.rejects(K.upsertMeritWalletKeyStoreEntry(entry(999)), /disk full/);
  assert.equal(fs.readFileSync(storePath, 'utf8'), before);
  assert.deepEqual(leftovers(), []);
  await K.upsertMeritWalletKeyStoreEntry(entry(999));
  assert.ok((await K.readMeritWalletKeyStoreEntries()).some((e) => e.address === addr(999)));
});
await test('a stray temporary file from a crashed write does not disturb reading', async () => {
  fs.writeFileSync(storePath + '.123.456.abc.tmp', '{ truncated');
  assert.ok((await K.readMeritWalletKeyStoreEntries()).length > 0);
  fs.unlinkSync(storePath + '.123.456.abc.tmp');
});
const writeRaw = (obj) => fs.writeFileSync(storePath, typeof obj === 'string' ? obj : JSON.stringify(obj));
await test('validation on load: a store whose index key is not its entry address is refused', async () => {
  const good = fs.readFileSync(storePath, 'utf8');
  writeRaw({ version: 1, accounts: { [addr(5)]: entry(6) } });
  await assert.rejects(K.readMeritWalletKeyStoreEntries(), /inconsistent/);
  writeRaw(good);
});
await test('validation on load: a newer version, a torn file and a missing accounts object are refused; a missing store throws on entries but reads as null', async () => {
  const good = fs.readFileSync(storePath, 'utf8');
  writeRaw({ version: 99, accounts: {} });
  await assert.rejects(K.readMeritWalletKeyStoreEntries(), /version 99/);
  writeRaw('{ "version": 1, "accounts": { "0x');
  await assert.rejects(K.readMeritWalletKeyStoreEntries());
  writeRaw({ version: 1 });
  await assert.rejects(K.readMeritWalletKeyStoreEntries(), /malformed/);
  writeRaw({ version: 1, accounts: { __unindexable_0__: { name: 'x' } } });
  assert.equal((await K.readMeritWalletKeyStoreEntries()).length, 1);
  fs.unlinkSync(storePath);
  assert.equal(await K.readMeritWalletKeyStoreFile(), null);
  await assert.rejects(K.readMeritWalletKeyStoreEntries(), /No Merit Wallet key store/);
  writeRaw(good);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* scratch */ }
process.exit(failed ? 1 : 0);
