// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/accounts.test.mjs
//
// Tests for the wallet accounts (src/vault/walletAccounts.ts) over a real VaultSession. Run: node test/accounts.test.mjs
// Uses the published Hardhat test vectors (mnemonic "test ... junk": 0xf39F..2266, 0x7099..79C8, 0x3C44..93BC) and BIP39's own valid phrases.
// MUTANT=allowRemoveDerived / MUTANT=noValidation run against a deliberately broken copy and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url); // typescript, viem: from the host app's node_modules (an ancestor folder)
const ts = req('typescript');
const viem = req('viem');
const SRC = path.join(HERE, '..', 'src', 'vault');

const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  let src = fs.readFileSync(path.join(SRC, name + '.ts'), 'utf8');
  if (name === 'walletAccounts' && process.env.MUTANT === 'allowRemoveDerived') src = src.replace("record.source !== 'imported'", 'false');
  if (name === 'walletAccounts' && process.env.MUTANT === 'noDevFlag') src = src.replace('fresh.push({ privateKey, address: account.address, devOrigin: true });', 'fresh.push({ privateKey, address: account.address });');
  if (name === 'walletAccounts' && process.env.MUTANT === 'unloadEverything') src = src.replace("all.filter((a) => isTest(a) && a.source === 'imported')", 'all');
  if (name === 'walletAccounts' && process.env.MUTANT === 'noValidation') src = src.replace('export async function isValidMnemonic(mnemonic: string): Promise<boolean> {', 'export async function isValidMnemonic(mnemonic: string): Promise<boolean> {\n  return true;');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  cache.set(name, m);
  const localReq = (spec) => (spec.startsWith('./') ? load(spec.slice(2)) : req(spec));
  new Function('require', 'module', 'exports', js)(localReq, m, m.exports);
  return m.exports;
}
const { VaultSession, VaultLockedError } = load('vaultSession');
const { WrongPasswordError } = load('vaultCrypto');
const A = load('walletAccounts');
const { WalletAccounts, WalletAccountError, createWallet, isValidMnemonic, HARDHAT_DEV_MNEMONIC } = A;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
function memStorage() { let v; return { read: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), write: async (x) => { v = JSON.parse(JSON.stringify(x)); }, clear: async () => { v = undefined; }, raw: () => v }; }
const fresh = () => { const st = memStorage(); const s = new VaultSession({ storage: st, iterations: 1000 }); return { st, s, acc: new WalletAccounts(s) }; };

const HH0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', HH1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', HH2 = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC';
const HH0_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ABANDON = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

await test('importing the Hardhat phrase gives the published addresses and flags every account devOrigin', async () => {
  const { s, acc } = fresh();
  const r = await createWallet(s, 'password-1', { mnemonic: HARDHAT_DEV_MNEMONIC });
  assert.equal(r.address, HH0);
  await acc.addDerived(); await acc.addDerived('Third');
  const list = acc.list();
  assert.deepEqual(list.map((a) => a.address), [HH0, HH1, HH2]);
  assert.deepEqual(list.map((a) => a.name), ['Account 1', 'Account 2', 'Third']);
  assert.ok(list.every((a) => a.devOrigin && a.source === 'generated'));
});

await test('a generated wallet has a valid 12-word phrase, derives its first account from it, and two wallets differ', async () => {
  const a = fresh(), b = fresh();
  const ra = await createWallet(a.s, 'password-1'), rb = await createWallet(b.s, 'password-1');
  assert.equal(ra.mnemonic.split(' ').length, 12);
  assert.equal(await isValidMnemonic(ra.mnemonic), true);
  assert.equal(ra.address, req('viem/accounts').mnemonicToAccount(ra.mnemonic, { addressIndex: 0 }).address);
  assert.notEqual(ra.mnemonic, rb.mnemonic);
  assert.ok(a.acc.list().every((x) => !x.devOrigin));
});

await test('mnemonic validation: BIP39 test phrases pass; bad checksum, unknown word and wrong length are refused', async () => {
  assert.equal(await isValidMnemonic(ABANDON), true);
  assert.equal(await isValidMnemonic('zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'), true);
  assert.equal(await isValidMnemonic(HARDHAT_DEV_MNEMONIC), true);
  assert.equal(await isValidMnemonic(ABANDON.replace('about', 'abandon')), false, 'bad checksum');
  assert.equal(await isValidMnemonic(ABANDON.replace('about', 'notaword')), false, 'unknown word');
  assert.equal(await isValidMnemonic('abandon abandon abandon'), false, 'length');
  const { s } = fresh();
  await assert.rejects(createWallet(s, 'password-1', { mnemonic: ABANDON.replace('about', 'abandon') }), WalletAccountError);
});

await test('import by private key: accepted with or without 0x, flagged devOrigin when it is a Hardhat key, duplicates and bad keys refused', async () => {
  const { s, acc } = fresh();
  await createWallet(s, 'password-1'); // a random wallet
  const rec = await acc.importPrivateKey(HH0_KEY.slice(2), 'Hardhat 0');
  assert.equal(rec.address, HH0); assert.equal(rec.source, 'imported'); assert.equal(rec.devOrigin, true); assert.equal(rec.name, 'Hardhat 0');
  await assert.rejects(acc.importPrivateKey(HH0_KEY), /already in this wallet/);
  await assert.rejects(acc.importPrivateKey('0x1234'), /64 hexadecimal/);
  const other = await acc.importPrivateKey(req('viem/accounts').generatePrivateKey());
  assert.equal(other.devOrigin, false);
  // a key that is already DERIVED in the wallet is a duplicate too
  const w = fresh(); await createWallet(w.s, 'password-1', { mnemonic: HARDHAT_DEV_MNEMONIC });
  await assert.rejects(w.acc.importPrivateKey(HH0_KEY), /already in this wallet/);
});

await test('remove: an imported account can go (and the active choice resets); a derived one cannot', async () => {
  const { s, acc } = fresh();
  await createWallet(s, 'password-1');
  const imp = await acc.importPrivateKey(HH0_KEY); await acc.setActive(imp.address);
  assert.equal(acc.activeAddress(), HH0);
  await acc.remove(imp.address);
  assert.ok(!acc.list().some((a) => a.address === HH0));
  assert.notEqual(acc.activeAddress(), HH0);
  const derived = acc.list()[0];
  await assert.rejects(acc.remove(derived.address), /cannot be removed/);
  assert.equal(acc.list().length, 1);
});

await test('rename, set active, and the first account is active by default', async () => {
  const { s, acc } = fresh();
  const r = await createWallet(s, 'password-1');
  assert.equal(acc.activeAddress(), r.address);
  const second = await acc.addDerived();
  await acc.setActive(second.address); assert.equal(acc.activeAddress(), second.address);
  await acc.rename(second.address, '  Savings  ');
  assert.equal(acc.list().find((a) => a.address === second.address).name, 'Savings');
  await assert.rejects(acc.rename(second.address, '   '), /name is required/);
  await assert.rejects(acc.setActive('0x0000000000000000000000000000000000000001'), /not in this wallet/);
});

await test('revealMnemonic needs the password again: wrong fails, right returns the phrase, the session is untouched', async () => {
  const { s, acc } = fresh();
  const r = await createWallet(s, 'the-password');
  await assert.rejects(acc.revealMnemonic('not-it'), WrongPasswordError);
  assert.equal(await acc.revealMnemonic('the-password'), r.mnemonic);
  assert.equal(s.isUnlocked(), true);
});

await test('everything persists: a new session over the same storage sees the same accounts; the stored blob holds no phrase or key in the clear', async () => {
  const { st, s, acc } = fresh();
  const r = await createWallet(s, 'password-1');
  await acc.addDerived('Second'); await acc.importPrivateKey(HH0_KEY, 'Imported'); await acc.setActive(HH0);
  const before = acc.list();
  const raw = JSON.stringify(st.raw());
  assert.ok(!raw.includes(HH0_KEY.slice(2)) && !raw.split(' ').some((w) => r.mnemonic.includes(w) && w.length > 4 && raw.includes(r.mnemonic)));
  const s2 = new VaultSession({ storage: st, iterations: 1000 }); await s2.unlock('password-1');
  const acc2 = new WalletAccounts(s2);
  assert.deepEqual(acc2.list(), before); assert.equal(acc2.activeAddress(), HH0);
});

await test('list() carries no secrets; locked wallet refuses every operation', async () => {
  const { s, acc } = fresh();
  const r = await createWallet(s, 'password-1'); await acc.importPrivateKey(HH0_KEY);
  const listJson = JSON.stringify(acc.list());
  assert.ok(!listJson.includes('privateKey') && !listJson.includes('mnemonic') && !listJson.includes(HH0_KEY.slice(2)) && !listJson.includes(r.mnemonic));
  s.lock();
  assert.throws(() => acc.list(), VaultLockedError);
  await assert.rejects(acc.addDerived(), VaultLockedError);
  await assert.rejects(acc.importPrivateKey(HH0_KEY), VaultLockedError);
  assert.throws(() => acc.getSigningAccount(HH0), VaultLockedError);
});

await test('getSigningAccount signs for derived and imported accounts (signature recovers to the address); unknown address refused', async () => {
  const { s, acc } = fresh();
  await createWallet(s, 'password-1', { mnemonic: ABANDON });
  const imp = await acc.importPrivateKey(HH0_KEY);
  const first = acc.list()[0];
  for (const rec of [first, imp]) {
    const { account, devOrigin } = acc.getSigningAccount(rec.address);
    const sig = await account.signMessage({ message: 'hello merit' });
    assert.equal(await viem.recoverMessageAddress({ message: 'hello merit', signature: sig }), rec.address);
    assert.equal(devOrigin, rec.address === HH0);
  }
  assert.throws(() => acc.getSigningAccount('0x0000000000000000000000000000000000000001'), /not in this wallet/);
});

await test('Load adds the 20 Hardhat test accounts as imported, devOrigin accounts without touching the wallet or its active account; a second Load adds nothing', async () => {
  const { s, acc } = fresh();
  const r = await createWallet(s, 'password-1'); // a real wallet with its own random phrase
  assert.deepEqual(acc.hardhatTestAccountStatus(), { loaded: 0, total: 20 });
  assert.deepEqual(await acc.loadHardhatTestAccounts(), { added: 20, alreadyPresent: 0, total: 20 });
  const list = acc.list();
  assert.equal(list.length, 21);
  const tests = list.filter((a) => a.source === 'imported');
  assert.equal(tests.length, 20); assert.ok(tests.every((a) => a.devOrigin === true));
  assert.equal(tests[0].address, HH0); assert.equal(tests[0].name, 'Hardhat 0'); assert.equal(tests[19].name, 'Hardhat 19');
  assert.equal(acc.activeAddress(), r.address); assert.equal(list[0].address, r.address);
  assert.deepEqual(acc.hardhatTestAccountStatus(), { loaded: 20, total: 20 });
  assert.deepEqual(await acc.loadHardhatTestAccounts(), { added: 0, alreadyPresent: 20, total: 20 });
  assert.equal(acc.list().length, 21);
  const { account, devOrigin } = acc.getSigningAccount(HH1);
  assert.equal(devOrigin, true);
  assert.equal(await viem.recoverMessageAddress({ message: 'hi', signature: await account.signMessage({ message: 'hi' }) }), HH1);
});

await test('Unload removes only the test accounts (the wallet and its accounts stay) and resets the active account if it was one of them', async () => {
  const { s, acc } = fresh();
  const r = await createWallet(s, 'password-1');
  await acc.addDerived('Mine'); await acc.loadHardhatTestAccounts();
  await acc.setActive(HH2);
  assert.deepEqual(await acc.unloadHardhatTestAccounts(), { removed: 20, kept: 0 });
  const list = acc.list();
  assert.deepEqual(list.map((a) => a.name), ['Account 1', 'Mine']);
  assert.equal(acc.activeAddress(), r.address);
  assert.deepEqual(acc.hardhatTestAccountStatus(), { loaded: 0, total: 20 });
  assert.deepEqual(await acc.unloadHardhatTestAccounts(), { removed: 0, kept: 0 });
});

await test('A wallet made from the Hardhat phrase: Load adds the other 19 as imported, Unload removes those 19 and keeps the derived one', async () => {
  const { s, acc } = fresh();
  await createWallet(s, 'password-1', { mnemonic: HARDHAT_DEV_MNEMONIC });
  assert.deepEqual(acc.hardhatTestAccountStatus(), { loaded: 1, total: 20 });
  assert.deepEqual(await acc.loadHardhatTestAccounts(), { added: 19, alreadyPresent: 1, total: 20 });
  assert.equal(acc.list().length, 20);
  assert.deepEqual(await acc.unloadHardhatTestAccounts(), { removed: 19, kept: 1 });
  assert.equal(acc.list().length, 1); assert.equal(acc.list()[0].address, HH0);
});

await test('test accounts persist across a new session and the stored blob has no key in the clear', async () => {
  const { st, s, acc } = fresh();
  await createWallet(s, 'password-1'); await acc.loadHardhatTestAccounts();
  assert.ok(!JSON.stringify(st.raw()).includes(HH0_KEY.slice(2)));
  const s2 = new VaultSession({ storage: st, iterations: 1000 }); await s2.unlock('password-1');
  assert.equal(new WalletAccounts(s2).hardhatTestAccountStatus().loaded, 20);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
