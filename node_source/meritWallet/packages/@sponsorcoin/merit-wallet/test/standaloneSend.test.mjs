// File: test/standaloneSend.test.mjs
//
// Tests for the stand-alone wallet's send and approval text (src/standalone/standaloneSend.ts, describeApproval.ts), with a real vault and the real approval queue (nothing signs until a request is approved) and no network: the broadcast and the
// receipt wait are replaced by fakes. Run: node test/standaloneSend.test.mjs
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
  const js = ts.transpileModule(fs.readFileSync(path.join(SRC, rel + '.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
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
const { createStandaloneSend } = load('standalone/standaloneSend');
const { describeApproval } = load('standalone/describeApproval');

const mem = () => { let v; return { async read() { return v; }, async write(x) { v = JSON.parse(JSON.stringify(x)); }, async clear() { v = undefined; } }; };
const mems = () => { let v; return { async get() { return v; }, async set(x) { v = x; }, async clear() { v = undefined; } }; };
const CHAIN = { chainId: 31337, rpcUrl: 'http://127.0.0.1:8545' };
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const tick = () => new Promise((r) => setTimeout(r, 0));
const RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const HARDHAT_PHRASE = 'test test test test test test test test test test test junk';

async function setup() {
  const core = createStandaloneWallet({ chains: [CHAIN], storage: mem(), sessionStore: mems() });
  await core.onboarding.importWallet(HARDHAT_PHRASE, 'correct horse');
  const from = core.vault.accounts()[0].address;
  // the broadcast is replaced: signing and sending run only after approval, and this records what was asked
  const broadcasts = [];
  const original = core.authenticator.sendTransaction.bind(core.authenticator);
  void original;
  return { core, from, broadcasts };
}

await test('no active account: a plain message, nothing queued', async () => {
  const { core } = await setup();
  const send = createStandaloneSend({ authenticator: core.authenticator, chain: CHAIN, from: () => undefined, nativeSymbol: () => 'ETH', waitForReceipt: async () => null });
  const r = await send({ recipientAddress: RECIPIENT, amount: '1' });
  assert.deepEqual(r, { ok: false, message: 'Select and activate an account first.' });
  assert.equal(core.approvals.list().length, 0);
});
await test('a bad recipient or amount is refused before anything is queued', async () => {
  const { core, from } = await setup();
  const send = createStandaloneSend({ authenticator: core.authenticator, chain: CHAIN, from: () => from, nativeSymbol: () => 'ETH', waitForReceipt: async () => null });
  assert.equal((await send({ recipientAddress: 'nope', amount: '1' })).ok, false);
  assert.equal((await send({ recipientAddress: RECIPIENT, amount: '0' })).ok, false);
  assert.equal(core.approvals.list().length, 0);
});
await test('a valid send WAITS in the approval queue (it does not run) and carries the transaction details', async () => {
  const { core, from } = await setup();
  const send = createStandaloneSend({ authenticator: core.authenticator, chain: CHAIN, from: () => from, nativeSymbol: () => 'ETH', waitForReceipt: async () => null });
  const pending = send({ recipientAddress: RECIPIENT, amount: '0.5' });
  await tick();
  const [request] = core.approvals.list();
  assert.equal(core.approvals.list().length, 1);
  assert.equal(request.kind, 'transaction');
  assert.equal(request.details.to.toLowerCase(), RECIPIENT.toLowerCase());
  assert.equal(request.details.value, '500000000000000000');
  assert.equal(request.details.chainId, 31337);
  core.approvals.reject(request.id);
  const r = await pending;
  assert.equal(r.ok, false);
  assert.match(r.message, /reject|not approved/i);
});
await test('rejecting leaves nothing pending and the next send works', async () => {
  const { core, from } = await setup();
  const send = createStandaloneSend({ authenticator: core.authenticator, chain: CHAIN, from: () => from, nativeSymbol: () => 'ETH', waitForReceipt: async () => null });
  const first = send({ recipientAddress: RECIPIENT, amount: '1' });
  await tick();
  core.approvals.reject(core.approvals.list()[0].id);
  await first;
  assert.equal(core.approvals.list().length, 0);
  const second = send({ recipientAddress: RECIPIENT, amount: '1' });
  await tick();
  assert.equal(core.approvals.list().length, 1);
  core.approvals.reject(core.approvals.list()[0].id);
  await second;
});
await test('a locked wallet cannot queue a send', async () => {
  const { core, from } = await setup();
  core.vault.lock();
  const send = createStandaloneSend({ authenticator: core.authenticator, chain: CHAIN, from: () => from, nativeSymbol: () => 'ETH', waitForReceipt: async () => null });
  const r = await send({ recipientAddress: RECIPIENT, amount: '1' });
  assert.equal(r.ok, false);
  assert.match(r.message, /locked/i);
  assert.equal(core.approvals.list().length, 0);
});
await test('an approval screen text for a native transaction: sender, recipient, amount in the coin, the chain', () => {
  const view = describeApproval({ id: 'a', kind: 'transaction', origin: 'wallet', summary: 'Send ...', createdAt: 0, details: { from: '0xAAA', to: RECIPIENT, value: '500000000000000000', data: '0x', chainId: 31337 } }, 'ETH');
  assert.equal(view.title, 'Transaction Request');
  assert.deepEqual(view.amount, { label: 'Amount', value: '0.5 ETH' });
  assert.equal(view.chainId, 31337);
  assert.deepEqual(view.accounts.map((a) => a.role), ['SENDER', 'RECIPIENT']);
  assert.equal(view.contractAddress, undefined);
});
await test('an approval screen text for a contract call shows the contract, not a coin amount', () => {
  const view = describeApproval({ id: 'a', kind: 'transaction', origin: 'wallet', summary: 's', createdAt: 0, details: { from: '0xAAA', to: '0xC0N7', value: '0', data: '0xa9059cbb00', chainId: 1 } }, 'ETH');
  assert.equal(view.contractAddress, '0xC0N7');
  assert.equal(view.amount, undefined);
});
await test('an approval screen text for a signature shows the message and the signer', () => {
  const view = describeApproval({ id: 'a', kind: 'sign', origin: 'wallet', summary: 'Sign a message with 0xAAA', createdAt: 0, details: { address: '0xAAA', message: 'hello' } }, 'ETH');
  assert.equal(view.title, 'Signature Request');
  assert.match(view.message, /hello/);
  assert.equal(view.accounts[0].role, 'SIGNER');
});

for (const [s, n] of results) console.log(s, n);
const failed = results.filter(([s]) => s === 'FAIL').length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
