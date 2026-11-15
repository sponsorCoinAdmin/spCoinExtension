// File: test/vaultCapability.test.mjs
//
// Conformance tests for the vault capability (src/vault/vaultCapability.ts, docs/design/accountAuthDesign.txt 14.3, items V1 / V2 / V3) over an in-memory VaultStorage: the same suite is what any other store
// (the extension's chrome.storage, a browser IndexedDB, a phone Keychain) must pass. Uses the published Hardhat test vectors and real WebCrypto (Node's globalThis.crypto).
// Run: node test/vaultCapability.test.mjs
// MUTANT=deleteNoCheck|backupNoCheck|sameAllowed|biometricAccepted|weakAllowed|phraseNotValidated|iterationsUncapped|backupShapeUnchecked run against deliberately broken copies and must report failures.
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
  let src = fs.readFileSync(path.join(SRC, name + '.ts'), 'utf8');
  if (name === 'vaultCapability') {
    // delete without re-checking the credential
    if (m === 'deleteNoCheck') src = src.replace("await session.verifyPassword(secretOf(credential, false));\n        await session.wipe();", 'await session.wipe();');
    // a backup file without re-checking the credential
    if (m === 'backupNoCheck') src = src.replace("await session.verifyPassword(secretOf(credential, false));\n        return JSON.stringify({ format", 'return JSON.stringify({ format');
    // a backup file may ask for any number of key-derivation rounds
    if (m === 'iterationsUncapped') src = src.replace('v.iterations > MAX_BACKUP_ITERATIONS', 'false');
    // a backup file's fields are not type-checked before use
    if (m === 'backupShapeUnchecked') src = src.replace('if (!text(v.salt) || !text(v.iv) || !text(v.data)) throw', 'if (false) throw');
    // the new credential may equal the current one
    if (m === 'sameAllowed') src = src.replace("if (from === to) throw", 'if (false) throw');
    // a biometric credential is taken as a password
    if (m === 'biometricAccepted') src = src.replace("if (credential.kind === 'biometric') throw new VaultError('unsupported', 'This vault opens with a password or a PIN.');", '');
    // no minimum length for a new credential
    if (m === 'weakAllowed') src = src.replace('if (value.length < min) throw', 'if (false) throw');
  }
  if (name === 'walletAccounts' && m === 'phraseNotValidated') src = src.replace("if (!(await isValidMnemonic(mnemonic))) throw new WalletAccountError('That Secret Recovery Phrase is not valid.');", '');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(name, mod);
  new Function('require', 'module', 'exports', js)((spec) => (spec.startsWith('./') ? load(spec.slice(2)) : req(spec)), mod, mod.exports);
  return mod.exports;
}
const { createLocalVault, VaultError } = load('vaultCapability');
const { HARDHAT_DEV_MNEMONIC } = load('walletAccounts');

function memStorage() {
  let v;
  return { read: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), write: async (x) => { v = JSON.parse(JSON.stringify(x)); }, clear: async () => { v = undefined; }, raw: () => v };
}
const make = (extra = {}) => { const storage = memStorage(); return { storage, vault: createLocalVault({ storage, iterations: 1000, ...extra }) }; };
const pw = (value) => ({ kind: 'password', value });
const code = async (promise) => { try { await promise; return 'no error'; } catch (e) { return e instanceof VaultError ? e.code : 'other:' + (e && e.message); } };

const HH0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const HH0_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const ABANDON = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('create: no wallet before, one after; unlocked; a 12-word recovery phrase is returned once with one account', async () => {
  const { vault } = make();
  assert.equal(await vault.hasWallet(), false);
  const r = await vault.create(pw('password-1'));
  assert.equal(await vault.hasWallet(), true);
  assert.equal(vault.isUnlocked(), true);
  assert.equal(r.recoveryPhrase.split(' ').length, 12);
  assert.equal(r.accounts.length, 1);
  assert.equal(r.accounts[0].source, 'generated');
});
await test('create twice is refused (already_set_up) and the first wallet is untouched', async () => {
  const { vault } = make();
  const first = await vault.create(pw('password-1'));
  assert.equal(await code(vault.create(pw('password-2'))), 'already_set_up');
  vault.lock(); await vault.unlock(pw('password-1'));
  assert.equal(vault.accounts()[0].address, first.accounts[0].address);
});
await test('a new password shorter than 8 and a new PIN shorter than 4 are refused (weak_credential); a 4-character PIN works', async () => {
  assert.equal(await code(make().vault.create(pw('short'))), 'weak_credential');
  assert.equal(await code(make().vault.create({ kind: 'pin', value: '123' })), 'weak_credential');
  const { vault } = make();
  await vault.create({ kind: 'pin', value: '1234' });
  vault.lock(); await vault.unlock({ kind: 'pin', value: '1234' });
  assert.equal(vault.isUnlocked(), true);
});
await test('a biometric credential is refused by a local vault (unsupported)', async () => {
  assert.equal(await code(make().vault.create({ kind: 'biometric', value: 'whatever-it-is' })), 'unsupported');
});
await test('importPhrase: the Hardhat phrase gives the published first address flagged devOrigin; the same phrase gives the same accounts in a second, independent vault', async () => {
  const a = make(), b = make();
  const ra = await a.vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  const rb = await b.vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('another-password'));
  assert.equal(ra[0].address, HH0);
  assert.equal(ra[0].devOrigin, true);
  assert.deepEqual(rb.map((x) => x.address), ra.map((x) => x.address));
});
await test('derivation: the standard BIP-39 / BIP-44 Ethereum path gives the widely published first address for the abandon ... about phrase', async () => {
  const { vault } = make();
  const r = await vault.importPhrase(ABANDON, pw('password-1'));
  assert.equal(r[0].address, '0x9858EfFD232B4033E47d90003D41EC34EcaEda94');
  assert.equal(r[0].devOrigin, false);
});
await test('importPhrase: an invalid phrase is refused (invalid_phrase) and nothing is created', async () => {
  const { vault } = make();
  assert.equal(await code(vault.importPhrase('this is not a valid recovery phrase at all really no', pw('password-1'))), 'invalid_phrase');
  assert.equal(await vault.hasWallet(), false);
});
await test('lock / unlock: locked accounts() answers locked; a wrong credential is wrong_credential and stays locked; the right one opens', async () => {
  const { vault } = make();
  await vault.create(pw('password-1'));
  vault.lock();
  assert.equal(vault.isUnlocked(), false);
  assert.throws(() => vault.accounts(), (e) => e instanceof VaultError && e.code === 'locked');
  assert.equal(await code(vault.unlock(pw('not-the-password'))), 'wrong_credential');
  assert.equal(vault.isUnlocked(), false);
  await vault.unlock(pw('password-1'));
  assert.equal(vault.isUnlocked(), true);
});
await test('unlocking an empty store is not_set_up', async () => {
  assert.equal(await code(make().vault.unlock(pw('password-1'))), 'not_set_up');
});
await test('too many wrong credentials in a row: locked_out with a wait time, even for the right one', async () => {
  const { vault } = make({ maxAttempts: 2, lockoutMs: 60000 });
  await vault.create(pw('password-1')); vault.lock();
  await code(vault.unlock(pw('wrong-aaaa'))); await code(vault.unlock(pw('wrong-bbbb')));
  let error; try { await vault.unlock(pw('password-1')); } catch (e) { error = e; }
  assert.ok(error instanceof VaultError && error.code === 'locked_out' && error.retryAfterMs > 0);
});
await test('changeCredential: wrong current is refused; the same new one is refused; success makes the old one stop working and the new one work', async () => {
  const { vault } = make();
  await vault.create(pw('password-1'));
  assert.equal(await code(vault.changeCredential(pw('wrong-aaaa'), pw('password-2'))), 'wrong_credential');
  assert.equal(await code(vault.changeCredential(pw('password-1'), pw('password-1'))), 'same_credential');
  assert.equal(await code(vault.changeCredential(pw('password-1'), pw('tiny'))), 'weak_credential');
  await vault.changeCredential(pw('password-1'), pw('password-2'));
  vault.lock();
  assert.equal(await code(vault.unlock(pw('password-1'))), 'wrong_credential');
  await vault.unlock(pw('password-2'));
  assert.equal(vault.isUnlocked(), true);
});
await test('deleteWallet: a wrong credential deletes nothing; the right one removes the wallet', async () => {
  const { vault } = make();
  await vault.create(pw('password-1'));
  assert.equal(await code(vault.deleteWallet(pw('wrong-aaaa'))), 'wrong_credential');
  assert.equal(await vault.hasWallet(), true);
  await vault.deleteWallet(pw('password-1'));
  assert.equal(await vault.hasWallet(), false);
  assert.equal(vault.isUnlocked(), false);
});
await test('backup: export needs the credential; the file hides the phrase; import into an empty store with the right credential restores the same accounts', async () => {
  const a = make();
  const created = await a.vault.importPhrase(ABANDON, pw('password-1'));
  assert.equal(await code(a.vault.exportBackup(pw('wrong-aaaa'))), 'wrong_credential');
  const file = await a.vault.exportBackup(pw('password-1'));
  assert.ok(!file.includes('abandon'));
  const b = make();
  assert.equal(await code(b.vault.importBackup(file, pw('wrong-aaaa'))), 'wrong_credential');
  assert.equal(await b.vault.hasWallet(), false);
  const restored = await b.vault.importBackup(file, pw('password-1'));
  assert.deepEqual(restored.map((x) => x.address), created.map((x) => x.address));
  assert.equal(b.vault.isUnlocked(), true);
});
await test('backup: a file that is not a backup is invalid_backup; importing into a store that already has a wallet is refused', async () => {
  const a = make();
  await a.vault.importPhrase(ABANDON, pw('password-1'));
  const file = await a.vault.exportBackup(pw('password-1'));
  assert.equal(await code(make().vault.importBackup('not json', pw('password-1'))), 'invalid_backup');
  assert.equal(await code(make().vault.importBackup(JSON.stringify({ format: 'something-else', version: 1, vault: {} }), pw('password-1'))), 'invalid_backup');
  const b = make();
  await b.vault.create(pw('password-9'));
  assert.equal(await code(b.vault.importBackup(file, pw('password-1'))), 'already_set_up');
});
await test('backup (V8): a tampered ciphertext restores nothing; a damaged or hostile file is refused before any key work', async () => {
  const a = make();
  await a.vault.importPhrase(ABANDON, pw('password-1'));
  const file = JSON.parse(await a.vault.exportBackup(pw('password-1')));
  // one character of the ciphertext changed: the authentication tag fails, so the wallet is not created (indistinguishable from a wrong password by design)
  const flipped = { ...file, vault: { ...file.vault, data: (file.vault.data[0] === 'A' ? 'B' : 'A') + file.vault.data.slice(1) } };
  const t = make();
  assert.equal(await code(t.vault.importBackup(JSON.stringify(flipped), pw('password-1'))), 'wrong_credential');
  assert.equal(await t.vault.hasWallet(), false);
  // fields missing, wrong types, an absurd number of rounds
  const bad = (patch) => JSON.stringify({ ...file, vault: { ...file.vault, ...patch } });
  for (const patch of [{ salt: undefined }, { iv: 5 }, { data: '' }, { data: 'not base64!' }, { iterations: 'many' }, { iterations: 1.5 }, { iterations: 0 }, { iterations: 4e12 }]) {
    assert.equal(await code(make().vault.importBackup(bad(patch), pw('password-1'))), 'invalid_backup', JSON.stringify(patch));
  }
  assert.equal(await code(make().vault.importBackup(JSON.stringify({ ...file, vault: [] }), pw('password-1'))), 'invalid_backup');
  assert.equal(await code(make().vault.importBackup('null', pw('password-1'))), 'invalid_backup');
});
await test('backup (V8): a file from a newer backup version says so; an unknown vault algorithm is refused', async () => {
  const a = make();
  await a.vault.importPhrase(ABANDON, pw('password-1'));
  const file = JSON.parse(await a.vault.exportBackup(pw('password-1')));
  const newer = make();
  await assert.rejects(newer.vault.importBackup(JSON.stringify({ ...file, version: 2 }), pw('password-1')), (e) => e.code === 'invalid_backup' && /newer version/.test(e.message));
  assert.equal(file.format, 'merit-vault-backup');
  assert.equal(file.version, 1);
  const other = make();
  assert.notEqual(await code(other.vault.importBackup(JSON.stringify({ ...file, vault: { ...file.vault, algorithm: 'rot13' } }), pw('password-1'))), undefined);
  assert.equal(await other.vault.hasWallet(), false);
});
await test('importKey: a valid key is added as imported; the same key again and a malformed key are invalid_key', async () => {
  const { vault } = make();
  await vault.create(pw('password-1'));
  const added = await vault.importKey(HH0_KEY, 'Hardhat zero');
  assert.equal(added.source, 'imported'); assert.equal(added.address, HH0); assert.equal(added.devOrigin, true);
  assert.equal(await code(vault.importKey(HH0_KEY)), 'invalid_key');
  assert.equal(await code(vault.importKey('0x1234')), 'invalid_key');
});
await test('addAccount derives the next account; setActive / activeAddress follow; an unknown address is unknown_account; locked is locked', async () => {
  const { vault } = make();
  await vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  const second = await vault.addAccount('Second');
  assert.equal(second.address, '0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  assert.equal(vault.accounts().length, 2);
  await vault.setActive(second.address);
  assert.equal(vault.activeAddress().toLowerCase(), second.address.toLowerCase());
  assert.equal(await code(vault.setActive('0x0000000000000000000000000000000000000001')), 'unknown_account');
  vault.lock();
  assert.equal(vault.activeAddress(), undefined);
  assert.equal(await code(vault.addAccount()), 'locked');
});
await test('reveal: a wrong credential reveals nothing; the right one returns the key and the phrase; an unknown account is unknown_account', async () => {
  const { vault } = make();
  await vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  assert.equal(await code(vault.revealPrivateKey(pw('wrong-aaaa'), HH0)), 'wrong_credential');
  assert.equal(await code(vault.revealRecoveryPhrase(pw('wrong-aaaa'))), 'wrong_credential');
  assert.equal((await vault.revealPrivateKey(pw('password-1'), HH0)).toLowerCase(), HH0_KEY);
  assert.equal(await vault.revealRecoveryPhrase(pw('password-1')), HARDHAT_DEV_MNEMONIC);
  assert.equal(await code(vault.revealPrivateKey(pw('password-1'), '0x0000000000000000000000000000000000000001')), 'unknown_account');
});
await test('onChange: unlock and lock are announced; an unsubscribed listener hears nothing', async () => {
  const { vault } = make();
  await vault.create(pw('password-1'));
  let calls = 0;
  const off = vault.onChange(() => { calls += 1; });
  vault.lock(); await vault.unlock(pw('password-1'));
  assert.equal(calls, 2);
  off(); vault.lock();
  assert.equal(calls, 2);
});
await test('the stored ciphertext never contains the phrase, the key or the credential', async () => {
  const { vault, storage } = make();
  await vault.importPhrase(HARDHAT_DEV_MNEMONIC, pw('password-1'));
  const raw = JSON.stringify(storage.raw());
  assert.ok(!raw.includes('test test') && !raw.includes('password-1') && !raw.toLowerCase().includes('ac0974bec39a'));
});
await test('label: defaults to "this device"; a host supplies its own ("this browser")', async () => {
  assert.equal(make().vault.label, 'this device');
  assert.equal(make({ label: 'this browser' }).vault.label, 'this browser');
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
