// File: test/standaloneWallet.test.mjs
//
// Tests for the stand-alone wallet core (docs/design/standAloneWalletInstall.txt, src/standalone/createStandaloneWallet.ts): one call from a page gives a working browser wallet. The vault storage and the session store are small
// in-memory fakes; the vault, WebCrypto and viem are real. Run: node test/standaloneWallet.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const SRC = path.join(HERE, '..', 'src');
const cache = new Map();
function load(rel) {
  if (cache.has(rel)) return cache.get(rel).exports;
  const file = path.join(SRC, rel + '.ts');
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(rel, mod);
  const dir = path.posix.dirname(rel);
  new Function('require', 'module', 'exports', js)((spec) => {
    if (!spec.startsWith('.')) return req(spec);
    const target = path.posix.normalize(path.posix.join(dir, spec));
    return fs.existsSync(path.join(SRC, target + '.ts')) ? load(target) : load(target + '/index');
  }, mod, mod.exports);
  return mod.exports;
}
const { createStandaloneWallet } = load('standalone/createStandaloneWallet');
const { HARDHAT_DEV_MNEMONIC } = load('vault/walletAccounts');
const { registerStandaloneDebug, endpointForDump } = load('standalone/registerStandaloneDebug');
const { meritDebug } = load('debug/debugStore');

function memoryStorage() {
  let value;
  return { async read() { return value; }, async write(v) { value = JSON.parse(JSON.stringify(v)); }, async clear() { value = undefined; } };
}
function memorySession() {
  let value;
  return { async get() { return value; }, async set(v) { value = v; }, async clear() { value = undefined; } };
}
const CHAINS = [{ chainId: 31337, rpcUrl: 'http://127.0.0.1:8545' }];
const fresh = () => createStandaloneWallet({ chains: CHAINS, storage: memoryStorage(), sessionStore: memorySession() });
const pw = (value) => ({ kind: 'password', value });
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const HH0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

await test('no chains is refused with a readable message', async () => {
  assert.throws(() => createStandaloneWallet({ chains: [], storage: memoryStorage(), sessionStore: memorySession() }), /at least one chain/);
});
await test('a fresh install has no wallet and no keys', async () => {
  const core = fresh();
  assert.equal(await core.vault.hasWallet(), false);
  assert.equal(core.vault.isUnlocked(), false);
});
await test('create gives a 12-word phrase once, one account, and an unlocked wallet', async () => {
  const core = fresh();
  const { recoveryPhrase } = await core.onboarding.createWallet('correct horse');
  assert.equal(recoveryPhrase.trim().split(/\s+/).length, 12);
  assert.equal(await core.vault.hasWallet(), true);
  assert.equal(core.vault.isUnlocked(), true);
  assert.equal(core.vault.accounts().length, 1);
});
await test('two installs make different keys (each wallet is independent)', async () => {
  const a = fresh();
  const b = fresh();
  await a.onboarding.createWallet('correct horse');
  await b.onboarding.createWallet('correct horse');
  assert.notEqual(a.vault.accounts()[0].address, b.vault.accounts()[0].address);
});
await test('a short password is refused and nothing is created', async () => {
  const core = fresh();
  await assert.rejects(core.onboarding.createWallet('short'), (e) => e.code === 'weak_credential');
  assert.equal(await core.vault.hasWallet(), false);
});
await test('lock, wrong password refused, right password unlocks, accounts survive', async () => {
  const core = fresh();
  await core.onboarding.createWallet('correct horse');
  const address = core.vault.accounts()[0].address;
  core.vault.lock();
  assert.equal(core.vault.isUnlocked(), false);
  await assert.rejects(core.vault.unlock(pw('wrong password')), (e) => e.code === 'wrong_credential');
  await core.vault.unlock(pw('correct horse'));
  assert.equal(core.vault.accounts()[0].address, address);
});
await test('a page reload keeps the wallet (locked); restore brings it back unlocked from the session', async () => {
  const storage = memoryStorage();
  const sessionStore = memorySession();
  const first = createStandaloneWallet({ chains: CHAINS, storage, sessionStore });
  await first.onboarding.createWallet('correct horse');
  const address = first.vault.accounts()[0].address;
  const second = createStandaloneWallet({ chains: CHAINS, storage, sessionStore });
  assert.equal(await second.vault.hasWallet(), true);
  assert.equal(second.vault.isUnlocked(), false);
  assert.equal(await second.restore(), true);
  assert.equal(second.vault.accounts()[0].address, address);
  // a reload with the session gone asks for the password
  const third = createStandaloneWallet({ chains: CHAINS, storage, sessionStore: memorySession() });
  assert.equal(await third.restore(), false);
  assert.equal(third.vault.isUnlocked(), false);
});
await test('importing the Hardhat phrase gives the known first account', async () => {
  const core = fresh();
  await core.onboarding.importWallet(HARDHAT_DEV_MNEMONIC, 'correct horse');
  assert.equal(core.vault.accounts()[0].address.toLowerCase(), HH0.toLowerCase());
});
await test('backup round trip: export, then restore into an empty install', async () => {
  const a = fresh();
  await a.onboarding.createWallet('correct horse');
  const address = a.vault.accounts()[0].address;
  const file = await a.vault.exportBackup(pw('correct horse'));
  const b = fresh();
  await b.onboarding.restoreBackup(file, 'correct horse');
  await b.vault.unlock(pw('correct horse'));
  assert.equal(b.vault.accounts()[0].address, address);
});
await test('the wallet sees the browser vault as its key-keeping backend', async () => {
  const core = fresh();
  assert.equal(core.authenticator.id, 'browserVault');
  assert.equal(core.authenticator.vault, core.vault);
});
await test('a signing request waits for approval instead of running (nothing signs silently)', async () => {
  const core = fresh();
  await core.onboarding.createWallet('correct horse');
  const address = core.vault.accounts()[0].address;
  const pending = core.authenticator.signMessage(address, 'hello');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(core.approvals.list().length, 1);
  core.approvals.reject(core.approvals.list()[0].id);
  await assert.rejects(pending, (e) => e.code === 'user_rejected');
});
await test('adding an account announces accountsChanged, so the wallet redraws its account list', async () => {
  const core = fresh();
  await core.onboarding.createWallet('correct horse');
  const seen = [];
  const off = core.authenticator.onChange((change) => seen.push(change));
  await core.vault.addAccount('Second');
  assert.ok(seen.includes('accountsChanged'));
  seen.length = 0;
  await core.vault.setActive(core.vault.accounts()[1].address);
  assert.ok(seen.includes('accountsChanged'));
  off();
  await core.vault.addAccount('Third');
  assert.equal(seen.length, 1, 'no announcement after unsubscribing');
});
await test('test accounts: load adds the 20 Hardhat accounts as imported accounts, announce the change, and unload removes them', async () => {
  const core = fresh();
  await core.onboarding.createWallet('correct horse');
  assert.deepEqual(await core.testAccounts.status(), { loaded: 0, total: 20 });
  const seen = [];
  const off = core.authenticator.onChange((c) => seen.push(c));
  assert.deepEqual(await core.testAccounts.load(), { added: 20 });
  assert.ok(seen.includes('accountsChanged'));
  assert.equal((await core.testAccounts.status()).loaded, 20);
  const list = core.vault.accounts();
  assert.equal(list.length, 21);
  assert.ok(list.filter((a) => a.devOrigin).length >= 20);
  assert.equal((await core.testAccounts.load()).added, 0, 'a second load adds nothing');
  const removed = await core.testAccounts.unload();
  assert.equal(removed.removed, 20);
  assert.equal(core.vault.accounts().length, 1);
  off();
});
await test('test accounts: a wallet made from the Hardhat phrase keeps its test accounts on unload', async () => {
  const core = fresh();
  await core.onboarding.importWallet(HARDHAT_DEV_MNEMONIC, 'correct horse');
  const result = await core.testAccounts.unload();
  assert.equal(result.removed, 0);
  assert.equal(result.kept, 1);
  assert.equal(core.vault.accounts().length, 1);
});
await test('debug dump: the endpoint is reduced to its host, so a token in the URL path never reaches the dump', async () => {
  const SECRET = 'f5b4d4b4a2614a540189b979d0686';
  assert.equal(endpointForDump('https://rpc.example.org/' + SECRET), 'https://rpc.example.org/...');
  assert.equal(endpointForDump('https://rpc.example.org/?apikey=' + SECRET), 'https://rpc.example.org/...');
  assert.equal(endpointForDump('not a url'), '(not a valid URL)');
  const core = createStandaloneWallet({ chains: [{ chainId: 31337, rpcUrl: 'https://rpc.example.org/' + SECRET }], storage: memoryStorage(), sessionStore: memorySession() });
  await core.onboarding.createWallet('correct horse');
  registerStandaloneDebug(core);
  const dump = await meritDebug.buildDump();
  assert.ok(dump.includes('standalone'), 'the host is named');
  assert.ok(dump.includes('rpc.example.org'), 'the endpoint host is shown');
  assert.ok(!dump.includes(SECRET), 'no part of the token is in the dump');
});

for (const [s, n] of results) console.log(s, n);
const failed = results.filter(([s]) => s === 'FAIL').length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
