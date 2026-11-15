// File: test/localDelete.test.mjs
//
// 2026-11-10 (docs/design/removeAccountPlan.txt rows 7, 8 and 10; rules X2, X5, X6, P2): deleting ONE local account from the vault. The password is checked first; an imported key is erased; a phrase-derived account is hidden (listed no more,
// not shown, not signed with, the phrase still derives it); the ACTIVE account is refused. Real vault, WebCrypto and viem; the storage is a map. Run: node test/localDelete.test.mjs
// MUTANT=noPasswordCheck|derivedErased|activeAllowed|hiddenStillListed|hiddenStillSigns run against deliberately broken copies and must report failures.
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
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

const tweaks = {
  'vault/vaultCapability': m === 'noPasswordCheck' ? (s) => swap(s, "        await session.verifyPassword(secretOf(credential, false));\n        await wallet.removeAccount(address);", '        await wallet.removeAccount(address);') : undefined,
  'vault/walletAccounts': (s) => {
    if (m === 'derivedErased') s = swap(s, "return { ...cur, names, hidden: [...(cur.hidden ?? []), lower(address)] };", 'return { ...cur, names };');
    if (m === 'activeAllowed') s = swap(s, "if (this.activeAddress() && lower(this.activeAddress()!) === lower(address)) throw new WalletAccountError('Make another account active first.');", '');
    if (m === 'hiddenStillListed') s = swap(s, 'if (c.hidden?.includes(lower(address))) continue;', '');
    if (m === 'hiddenStillSigns') {
      s = s.replace("    if (c.hidden?.includes(target)) throw new WalletAccountError('That account is not in this wallet.');\n    for (const { hd } of keyrings(c)) {\n      for (let i = 0; i < hd.count; i++) {\n        if (lower(deriveAddress(hd.mnemonic, i)) === target) return { account", "    for (const { hd } of keyrings(c)) {\n      for (let i = 0; i < hd.count; i++) {\n        if (lower(deriveAddress(hd.mnemonic, i)) === target) return { account");
    }
    return s;
  },
};
const cache = new Map();
function load(rel) {
  const file = path.join(SRC, rel + '.ts');
  if (cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  if (tweaks[rel]) src = tweaks[rel](src);
  const mod = { exports: {} };
  cache.set(file, mod);
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: file }).outputText;
  new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? load(path.relative(SRC, path.resolve(path.dirname(file), id)).replace(/\\/g, '/')) : req(id)), mod, mod.exports);
  return mod.exports;
}
const { createLocalVaultParts } = load('vault/vaultCapability');
const { HARDHAT_DEV_MNEMONIC } = load('vault/walletAccounts');

const memStorage = () => { let v; return { read: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), write: async (x) => { v = JSON.parse(JSON.stringify(x)); }, clear: async () => { v = undefined; } }; };
const pw = (value) => ({ kind: 'password', value });
const KEY = '0x' + '11'.repeat(32);

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

async function fresh() {
  const parts = createLocalVaultParts({ storage: memStorage(), iterations: 1000 });
  await parts.vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  return parts;
}

await test('the local vault says it can delete an account', async () => {
  const { vault } = await fresh();
  assert.equal(vault.capabilities.removeAccount, true);
  assert.equal(typeof vault.removeAccount, 'function');
});
await test('a wrong password deletes nothing (X5)', async () => {
  const { vault } = await fresh();
  const imported = await vault.importKey(KEY, 'Imp');
  await assert.rejects(vault.removeAccount(pw('wrong-password'), imported.address), (e) => e.code === 'wrong_credential');
  assert.ok(vault.accounts().some((a) => a.address === imported.address));
});
await test('an imported key is erased: not listed, not revealable', async () => {
  const { vault } = await fresh();
  const imported = await vault.importKey(KEY, 'Imp');
  await vault.removeAccount(pw('password-1'), imported.address);
  assert.ok(!vault.accounts().some((a) => a.address === imported.address));
  await assert.rejects(vault.revealPrivateKey(pw('password-1'), imported.address), (e) => e.code === 'unknown_account');
});
await test('a phrase-derived account is hidden (P2): not listed, not revealed, not signed with, and the other accounts stay', async () => {
  const { vault, accounts } = await fresh();
  const second = await vault.addAccount('Second');
  const before = vault.accounts().length;
  assert.ok(vault.activeAddress() !== second.address, 'the first account is the active one');
  await vault.removeAccount(pw('password-1'), second.address);
  assert.equal(vault.accounts().length, before - 1);
  assert.ok(!vault.accounts().some((a) => a.address.toLowerCase() === second.address.toLowerCase()));
  await assert.rejects(vault.revealPrivateKey(pw('password-1'), second.address), (e) => e.code === 'unknown_account');
  assert.throws(() => accounts.getSigningAccount(second.address), /not in this wallet/);
});
await test('the ACTIVE account is refused (X2)', async () => {
  const { vault } = await fresh();
  const active = vault.activeAddress();
  await assert.rejects(vault.removeAccount(pw('password-1'), active), /another account active/);
  assert.ok(vault.accounts().some((a) => a.address === active));
});
await test('an address the wallet does not hold is refused', async () => {
  const { vault } = await fresh();
  await assert.rejects(vault.removeAccount(pw('password-1'), '0x' + '22'.repeat(20)), (e) => e.code === 'unknown_account');
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
