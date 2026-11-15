// File: test/multiPhrase.test.mjs
//
// docs/design/accountAuthDesign.txt section 17 item 2 (Import a wallet): the vault keeps SEVERAL Secret Recovery Phrases, the way MetaMask does (src/vault/walletAccounts.ts importWallet). A second phrase adds its first account; every phrase derives its own accounts; the key of an account
// of any phrase can be revealed (password again) and can sign; a wrong or repeated phrase is refused; a vault made before (one phrase) lists exactly as it did; the whole thing survives a backup and restore. Run: node test/multiPhrase.test.mjs
// MUTANT=extraNotListed|extraKeyMissing|extraNotSigning|repeatAllowed|invalidAllowed|revealWrongPhrase|oldVaultChanged run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const SRC = path.join(HERE, '..', 'src', 'vault');
const m = process.env.MUTANT;
const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  let src = fs.readFileSync(path.join(SRC, name + '.ts'), 'utf8').replace(/\r\n/g, '\n');
  const swap = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
  if (name === 'walletAccounts') {
    if (m === 'extraNotListed') swap("return [...(c.hd ? [{ hd: c.hd, wallet: 0 }] : []), ...(c.hdExtra ?? []).map((hd, i) => ({ hd, wallet: i + 1 }))];", "return [...(c.hd ? [{ hd: c.hd, wallet: 0 }] : [])];");
    if (m === 'extraKeyMissing') swap("    for (const { hd } of keyrings(c)) {\n      for (let i = 0; i < hd.count; i++) {\n        if (lower(deriveAddress(hd.mnemonic, i)) === target) {\n          const key", "    for (const { hd } of keyrings(c).slice(0, 1)) {\n      for (let i = 0; i < hd.count; i++) {\n        if (lower(deriveAddress(hd.mnemonic, i)) === target) {\n          const key");
    if (m === 'extraNotSigning') swap("    for (const { hd } of keyrings(c)) {\n      for (let i = 0; i < hd.count; i++) {\n        if (lower(deriveAddress(hd.mnemonic, i)) === target) return", "    for (const { hd } of keyrings(c).slice(0, 1)) {\n      for (let i = 0; i < hd.count; i++) {\n        if (lower(deriveAddress(hd.mnemonic, i)) === target) return");
    if (m === 'repeatAllowed') swap("if (keyrings(c).some((k) => k.hd.mnemonic === phrase)) throw new WalletAccountError('That wallet is already in this app.');", "");
    if (m === 'invalidAllowed') swap("if (!(await isValidMnemonic(phrase))) throw new WalletAccountError('That Secret Recovery Phrase is not valid.');\n    if (keyrings(c).some", "if (keyrings(c).some");
    if (m === 'revealWrongPhrase') swap("const ring = keyrings(this.contents()).find((k) => k.wallet === wallet);", "const ring = keyrings(this.contents())[0];");
    if (m === 'oldVaultChanged') swap("const fallbackName = wallet === 0 ? `Account ${i + 1}` : `Wallet ${wallet + 1} Account ${i + 1}`;", "const fallbackName = `Wallet ${wallet + 1} Account ${i + 1}`;");
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} }; cache.set(name, mod);
  new Function('require', 'module', 'exports', js)((s) => (s.startsWith('./') ? load(s.slice(2)) : req(s)), mod, mod.exports);
  return mod.exports;
}
const { VaultSession } = load('vaultSession');
const { WalletAccounts, createWallet, HARDHAT_DEV_MNEMONIC } = load('walletAccounts');

const SECOND = 'legal winner thank year wave sausage worth useful legal winner thank yellow';
const SECOND_FIRST = '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25';
const HH0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
function memStorage() { let v; return { read: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), write: async (x) => { v = JSON.parse(JSON.stringify(x)); }, clear: async () => { v = undefined; } }; }
async function setup(mnemonic = HARDHAT_DEV_MNEMONIC) {
  const s = new VaultSession({ storage: memStorage(), iterations: 1000 });
  const acc = new WalletAccounts(s);
  await createWallet(s, 'password-1', { mnemonic });
  return { s, acc };
}
const lc = (a) => a.toLowerCase();

await test('a vault made before (one phrase) lists exactly as it did: names, order, no wallet marker', async () => {
  const t = await setup();
  const list = t.acc.list();
  assert.deepEqual(list.map((a) => [a.address, a.name, a.source, a.index, a.wallet]), [[HH0, 'Account 1', 'generated', 0, undefined]]);
});

await test('importWallet adds the second phrase with its first account (the right address, named Wallet 2 Account 1), the first stays as it was', async () => {
  const t = await setup();
  const added = await t.acc.importWallet(SECOND);
  assert.equal(added.address, SECOND_FIRST);
  assert.equal(added.name, 'Wallet 2 Account 1');
  assert.equal(added.wallet, 1);
  assert.deepEqual(t.acc.list().map((a) => a.address), [HH0, SECOND_FIRST]);
});

await test('a name can be given, and the phrase may be typed with capitals and extra spaces', async () => {
  const t = await setup();
  const added = await t.acc.importWallet('  ' + SECOND.toUpperCase().replace(/ /g, '   ') + ' ', 'My other wallet');
  assert.deepEqual([added.address, added.name], [SECOND_FIRST, 'My other wallet']);
});

await test('the key of the second wallet account is revealed with the password and signs (a viem account for that address)', async () => {
  const t = await setup();
  await t.acc.importWallet(SECOND);
  const key = await t.acc.revealPrivateKey('password-1', SECOND_FIRST);
  assert.match(key, /^0x[0-9a-f]{64}$/);
  await assert.rejects(t.acc.revealPrivateKey('wrong-password', SECOND_FIRST));
  const { account } = t.acc.getSigningAccount(SECOND_FIRST);
  assert.equal(lc(account.address), lc(SECOND_FIRST));
});

await test('each phrase is revealed only with the password: wallet 0 the first, wallet 1 the second', async () => {
  const t = await setup();
  await t.acc.importWallet(SECOND);
  assert.equal(await t.acc.revealMnemonic('password-1'), HARDHAT_DEV_MNEMONIC);
  assert.equal(await t.acc.revealMnemonic('password-1', 1), SECOND);
  await assert.rejects(t.acc.revealMnemonic('password-1', 5));
  await assert.rejects(t.acc.revealMnemonic('wrong-password', 1));
});

await test('a phrase that is already there, or not a valid phrase, is refused and nothing changes', async () => {
  const t = await setup();
  await t.acc.importWallet(SECOND);
  await assert.rejects(t.acc.importWallet(SECOND), /already in this app/);
  await assert.rejects(t.acc.importWallet(HARDHAT_DEV_MNEMONIC), /already in this app/);
  await assert.rejects(t.acc.importWallet('one two three four five six seven eight nine ten eleven twelve'), /not valid/);
  assert.equal(t.acc.list().length, 2);
});

await test('"Add account" still derives from the FIRST phrase; a derived account of the second wallet cannot be removed (it comes back from its phrase)', async () => {
  const t = await setup();
  await t.acc.importWallet(SECOND);
  const next = await t.acc.addDerived();
  assert.equal(next.wallet, undefined);
  assert.equal(next.index, 1);
  await assert.rejects(t.acc.remove(SECOND_FIRST), /cannot be removed/);
});

await test('the whole wallet, second phrase included, survives a backup and a restore (the backup holds no phrase in the clear)', async () => {
  const t = await setup();
  await t.acc.importWallet(SECOND);
  const backup = await t.s.exportBackup();
  assert.ok(!JSON.stringify(backup).includes('legal'), 'the backup must not hold the phrase in the clear');
  const s2 = new VaultSession({ storage: memStorage(), iterations: 1000 });
  await s2.importBackup(backup, 'password-1');
  await s2.unlock('password-1');
  const acc2 = new WalletAccounts(s2);
  assert.deepEqual(acc2.list().map((a) => a.address), [HH0, SECOND_FIRST]);
  assert.equal(await acc2.revealMnemonic('password-1', 1), SECOND);
});

await test('accounts of a phrase that have no stored name get the default names: Account N for the first phrase, Wallet W Account N for the others', async () => {
  const t = await setup();
  await t.acc.importWallet(SECOND);
  await t.s.update((c) => ({ ...c, hd: { ...c.hd, count: 3 }, hdExtra: [{ ...c.hdExtra[0], count: 2 }] }));
  assert.deepEqual(t.acc.list().map((x) => x.name), ['Account 1', 'Account 2', 'Account 3', 'Wallet 2 Account 1', 'Wallet 2 Account 2']);
});

await test('locked: importWallet is refused like every other account call', async () => {
  const t = await setup();
  t.s.lock();
  await assert.rejects(t.acc.importWallet(SECOND), (e) => e.name === 'VaultLockedError');
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
