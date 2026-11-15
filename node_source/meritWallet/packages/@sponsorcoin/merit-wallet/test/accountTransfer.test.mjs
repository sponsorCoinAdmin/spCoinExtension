// File: test/accountTransfer.test.mjs
//
// docs/design/accountAuthDesign.txt V11 (owner request, 2026-10-12): the extension-approved encrypted transfer of one account to a web page. The crypto (src/vault/accountTransfer.ts): a key seals only for the page that asked, a different page, a changed blob or another
// address cannot open it, and every blob is new. The provider method merit_transferAccount (src/vault/providerController.ts): only for an origin that is connected to that account, it WAITS for the person, the approval never carries a key, the wallet password is required
// again, a wrong password or a rejection gives nothing, and what comes out is the sealed blob that opens to exactly the account's key. Run: node test/accountTransfer.test.mjs
// MUTANT=noPermission|passwordIgnored|plainReturn|noAad|staticIv|keyInDetails|looseKeyCheck run against deliberately broken copies and must report failures.
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
  if (name === 'providerController') {
    if (m === 'noPermission') swap("const address = await this.requireAccount(origin, arg?.address);", "const address = String(arg?.address);");
    if (m === 'passwordIgnored') swap("const privateKey = await this.o.accounts.revealPrivateKey(password, address);", "const privateKey = await this.o.accounts.revealPrivateKey('password-1', address);");
    if (m === 'plainReturn') swap("return sealForTransfer(privateKey, address, publicKey);", "return { publicKey: '', iv: '', ciphertext: privateKey };");
    if (m === 'keyInDetails') swap("details: { origin, address } },\n          async (input) => {", "details: { origin, address, hint: 'k' } },\n          async (input) => {\n            this.leak = true;");
  }
  if (name === 'accountTransfer') {
    if (m === 'noAad') swap("additionalData: aad(address) }, key, buffer(fromB64(seal.ciphertext))", "}, key, buffer(fromB64(seal.ciphertext))");
    if (m === 'noAad') swap("{ name: 'AES-GCM', iv, additionalData: aad(address) }", "{ name: 'AES-GCM', iv }");
    if (m === 'staticIv') swap("globalThis.crypto.getRandomValues(new Uint8Array(12))", "new Uint8Array(12)");
    if (m === 'looseKeyCheck') swap("if (!PRIVATE_KEY.test(privateKey)) throw new Error('That is not a private key.');", "");
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} }; cache.set(name, mod);
  new Function('require', 'module', 'exports', js)((s) => (s.startsWith('./') ? load(s.slice(2)) : req(s)), mod, mod.exports);
  return mod.exports;
}
const { VaultSession } = load('vaultSession');
const { WalletAccounts, createWallet, HARDHAT_DEV_MNEMONIC } = load('walletAccounts');
const { ApprovalController } = load('approvals');
const { LocalSigner } = load('localSigner');
const { ProviderController, ProviderRpcError, PROVIDER_ERROR, createMemoryPermissionStore } = load('providerController');
const { createTransferRequest, sealForTransfer, requestAccountFromProvider } = load('accountTransfer');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const tick = () => new Promise((r) => setTimeout(r, 5));
function memStorage() { let v; return { read: async () => (v ? JSON.parse(JSON.stringify(v)) : undefined), write: async (x) => { v = JSON.parse(JSON.stringify(x)); }, clear: async () => { v = undefined; } }; }
const SITE = 'https://dapp.example', OTHER = 'https://other.example';
const KEY = '0x' + 'ab'.repeat(32);
const ADDR = '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25';

async function setup() {
  const s = new VaultSession({ storage: memStorage(), iterations: 1000 });
  const acc = new WalletAccounts(s);
  const r = await createWallet(s, 'password-1', { mnemonic: HARDHAT_DEV_MNEMONIC });
  const approvals = new ApprovalController();
  const signer = new LocalSigner({ session: s, accounts: acc, approvals, rpcUrlFor: () => 'http://rpc.invalid', transportFor: () => { throw new Error('no chain here'); } });
  const pc = new ProviderController({ session: s, accounts: acc, approvals, signer, permissions: createMemoryPermissionStore(), getChainId: () => 31337, setChainId: () => undefined, isKnownChain: () => true, rpc: async () => '0x10' });
  return { s, acc, approvals, pc, address: r.address };
}
const connect = async (t, origin = SITE) => { const p = t.pc.handle(origin, { method: 'eth_requestAccounts' }); await tick(); await t.approvals.approve(t.approvals.list()[0].id); return p; };
const code = async (p) => { try { await p; return 'resolved'; } catch (e) { return e instanceof ProviderRpcError ? e.code : 'other:' + (e.name || '') + ':' + e.message; } };
const ask = (t, address, publicKey, origin = SITE) => t.pc.handle(origin, { method: 'merit_transferAccount', params: [{ address, publicKey }] });

await test('crypto: a key sealed for a page opens for that page, to exactly the same key', async () => {
  const page = await createTransferRequest();
  const seal = await sealForTransfer(KEY, ADDR, page.publicKey);
  assert.equal(await page.open(seal, ADDR), KEY);
  assert.ok(!JSON.stringify(seal).includes(KEY.slice(2, 20)));
});

await test('crypto: every blob is new (the extension makes a one-time key and a fresh iv each time)', async () => {
  const page = await createTransferRequest();
  const a = await sealForTransfer(KEY, ADDR, page.publicKey);
  const b = await sealForTransfer(KEY, ADDR, page.publicKey);
  assert.notEqual(a.ciphertext, b.ciphertext);
  assert.notEqual(a.iv, b.iv);
  assert.notEqual(a.publicKey, b.publicKey);
});

await test('crypto: a different page, a changed blob, or another address cannot open it', async () => {
  const page = await createTransferRequest();
  const other = await createTransferRequest();
  const seal = await sealForTransfer(KEY, ADDR, page.publicKey);
  await assert.rejects(other.open(seal, ADDR));
  const flipped = Buffer.from(seal.ciphertext, 'base64'); flipped[0] ^= 1;
  await assert.rejects(page.open({ ...seal, ciphertext: flipped.toString('base64') }, ADDR));
  await assert.rejects(page.open(seal, '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'));
});

await test('crypto: something that is not a private key, or not a public key, is refused', async () => {
  const page = await createTransferRequest();
  await assert.rejects(sealForTransfer('0x1234', ADDR, page.publicKey));
  await assert.rejects(sealForTransfer(KEY, ADDR, Buffer.from('not a point').toString('base64')));
});

await test('provider: an origin that is not connected to the account gets nothing and nothing is queued', async () => {
  const t = await setup();
  const page = await createTransferRequest();
  assert.equal(await code(ask(t, t.address, page.publicKey)), PROVIDER_ERROR.unauthorized);
  await connect(t);
  assert.equal(await code(ask(t, t.address, page.publicKey, OTHER)), PROVIDER_ERROR.unauthorized);
  assert.equal(t.approvals.list().length, 0);
});

await test('provider: a connected page WAITS for the person; the approval says what is asked and carries no key', async () => {
  const t = await setup();
  await connect(t);
  const page = await createTransferRequest();
  let settled = false;
  const p = ask(t, t.address, page.publicKey).then((x) => { settled = true; return x; });
  await tick();
  assert.equal(settled, false);
  const [info] = t.approvals.list();
  assert.equal(info.kind, 'transfer');
  assert.equal(info.origin, SITE);
  assert.deepEqual(Object.keys(info.details).sort(), ['address', 'origin']);
  const key = await t.acc.revealPrivateKey('password-1', t.address);
  assert.ok(!JSON.stringify(info).toLowerCase().includes(key.slice(2).toLowerCase()));
  t.approvals.reject(info.id);
  await code(p);
});

await test('provider: approved with the password, the page receives a sealed blob that opens to exactly the account\'s key', async () => {
  const t = await setup();
  await connect(t);
  const page = await createTransferRequest();
  const p = ask(t, t.address, page.publicKey);
  await tick();
  await t.approvals.approve(t.approvals.list()[0].id, { password: 'password-1' });
  const seal = await p;
  assert.deepEqual(Object.keys(seal).sort(), ['ciphertext', 'iv', 'publicKey']);
  assert.equal(await page.open(seal, t.address), await t.acc.revealPrivateKey('password-1', t.address));
});

await test('provider: the wallet password is required again: none, or a wrong one, gives the page nothing', async () => {
  const t = await setup();
  await connect(t);
  const page = await createTransferRequest();
  const noPassword = ask(t, t.address, page.publicKey);
  await tick();
  await t.approvals.approve(t.approvals.list()[0].id);
  assert.equal(await code(noPassword), PROVIDER_ERROR.unauthorized);
  const wrong = ask(t, t.address, page.publicKey);
  await tick();
  await t.approvals.approve(t.approvals.list()[0].id, { password: 'not-the-password' });
  assert.match(String(await code(wrong)), /^other:WrongPasswordError|^-32603$/);
});

await test('provider: rejecting gives 4001 and nothing', async () => {
  const t = await setup();
  await connect(t);
  const page = await createTransferRequest();
  const p = ask(t, t.address, page.publicKey);
  await tick();
  t.approvals.reject(t.approvals.list()[0].id);
  assert.equal(await code(p), PROVIDER_ERROR.userRejected);
});

await test('provider: a missing or malformed public key is refused before anything is queued', async () => {
  const t = await setup();
  await connect(t);
  assert.equal(await code(ask(t, t.address, undefined)), PROVIDER_ERROR.invalidParams);
  assert.equal(await code(ask(t, t.address, 'AAAA')), PROVIDER_ERROR.invalidParams);
  assert.equal(t.approvals.list().length, 0);
});

await test('end to end: the page asks through its own function, the person approves with the password in the wallet, the page ends up with exactly the account key and nothing in between carries it', async () => {
  const t = await setup();
  await connect(t);
  const seen = [];
  const provider = { request: async ({ method, params }) => { const r = await t.pc.handle(SITE, { method, params }); seen.push(JSON.stringify(r)); return r; } };
  const key = await t.acc.revealPrivateKey('password-1', t.address);
  const pending = requestAccountFromProvider(provider, t.address);
  await tick();
  assert.equal(t.approvals.list().length, 1);
  assert.ok(!JSON.stringify(t.approvals.list()).toLowerCase().includes(key.slice(2).toLowerCase()));
  await t.approvals.approve(t.approvals.list()[0].id, { password: 'password-1' });
  assert.equal(await pending, key);
  assert.ok(seen.every((x) => !x.toLowerCase().includes(key.slice(2).toLowerCase())), 'the key crossed the provider in the clear');
});

await test('end to end: refused in the wallet, the page gets the wallet\'s refusal (4001) and no key', async () => {
  const t = await setup();
  await connect(t);
  const provider = { request: ({ method, params }) => t.pc.handle(SITE, { method, params }) };
  const pending = requestAccountFromProvider(provider, t.address);
  await tick();
  t.approvals.reject(t.approvals.list()[0].id);
  assert.equal(await code(pending), PROVIDER_ERROR.userRejected);
});

await test('the page refuses an answer that is not a sealed key', async () => {
  const provider = { request: async () => ({ hello: 'world' }) };
  await assert.rejects(requestAccountFromProvider(provider, ADDR), /did not answer with a sealed key/);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
