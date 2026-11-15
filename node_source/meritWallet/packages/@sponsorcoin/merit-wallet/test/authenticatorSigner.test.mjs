// File: test/authenticatorSigner.test.mjs
//
// Tests for the web app's ethers Signer over any Authenticator (lib/spCoin/AuthenticatorSigner.ts, docs/design/accountAuthDesign.txt item V4): the write helpers take an ethers Signer; the browser vault and the Merit extension are
// authenticators; this class is the bridge. Real ethers, a fake authenticator and a fake provider. Run: node test/authenticatorSigner.test.mjs
// MUTANT=wrongFrom|noChainId|signTxAllowed|waitIgnoresProvider|bytesNotHex run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(path.join(WEB, 'package.json'));
const ts = req('typescript');
const ethers = req('ethers');
const m = process.env.MUTANT;

let src = fs.readFileSync(path.join(WEB, 'lib', 'spCoin', 'AuthenticatorSigner.ts'), 'utf8').replace(/\r\n/g, '\n');
// the sender is not the signer's own address
if (m === 'wrongFrom') src = src.replace('from: this.address,\n      to,', "from: '0x0000000000000000000000000000000000000001',\n      to,");
// the chain id of the transaction is dropped
if (m === 'noChainId') src = src.replace('chainId: Number(tx.chainId ?? this.chainId),', 'chainId: 1,');
// signTransaction no longer refuses
if (m === 'signTxAllowed') src = src.replace(/async signTransaction\(\): Promise<string> \{\n\s*throw new Error\([^\n]*\n\s*\}/, "async signTransaction(): Promise<string> { return '0x'; }");
// wait() ignores the provider's receipt
if (m === 'waitIgnoresProvider') src = src.replace('const receipt = await provider.waitForTransaction(hash, confirmations ?? 1);', 'const receipt = { status: 1 } as never;');
// raw bytes are passed as-is instead of hex
if (m === 'bytesNotHex') src = src.replace("typeof message === 'string' ? message : hexlify(message)", 'message as never');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)((id) => (id === 'ethers' ? ethers : {}), mod, mod.exports);
const { AuthenticatorSigner } = mod.exports;

const ADDR = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const TO = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
function fakeAuth(extra = {}) {
  const calls = [];
  return {
    calls,
    label: 'Fake',
    id: 'browserVault',
    async signMessage(address, message) { calls.push(['signMessage', address, message]); return '0xsig'; },
    async signTypedData(address, typed) { calls.push(['signTypedData', address, typed]); return '0xtyped'; },
    async sendTransaction(tx) { calls.push(['sendTransaction', tx]); return { hash: '0xhash' }; },
    ...extra,
  };
}
const provider = (log = []) => ({ waitForTransaction: async (hash, n) => { log.push([hash, n]); return { hash, status: 1, blockNumber: 7 }; } });

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('getAddress is the account; connect keeps the same authenticator and account', async () => {
  const s = new AuthenticatorSigner(fakeAuth(), ADDR, 31337, '', null);
  assert.equal(await s.getAddress(), ADDR);
  const c = s.connect(provider());
  assert.equal(await c.getAddress(), ADDR);
});
await test('signMessage goes to the authenticator for the account; raw bytes go as hex', async () => {
  const auth = fakeAuth(); const s = new AuthenticatorSigner(auth, ADDR, 31337, '', null);
  assert.equal(await s.signMessage('hello'), '0xsig');
  await s.signMessage(new Uint8Array([1, 2, 255]));
  assert.deepEqual(auth.calls[0], ['signMessage', ADDR, 'hello']);
  assert.deepEqual(auth.calls[1], ['signMessage', ADDR, '0x0102ff']);
});
await test('signTypedData finds the primary type and needs the authenticator to support it', async () => {
  const auth = fakeAuth(); const s = new AuthenticatorSigner(auth, ADDR, 31337, '', null);
  await s.signTypedData({ name: 'App' }, { Mail: [{ name: 'from', type: 'Person' }], Person: [{ name: 'name', type: 'string' }] }, { from: { name: 'A' } });
  assert.equal(auth.calls[0][2].primaryType, 'Mail');
  const none = new AuthenticatorSigner(fakeAuth({ signTypedData: undefined }), ADDR, 31337, '', null);
  await assert.rejects(none.signTypedData({}, { T: [] }, {}), /cannot sign typed data/);
});
await test('sendTransaction passes from / to / value / data / chain id and returns the hash', async () => {
  const auth = fakeAuth(); const s = new AuthenticatorSigner(auth, ADDR, 31337, '', provider());
  const response = await s.sendTransaction({ to: TO, value: 5n, data: '0xabcd' });
  assert.equal(response.hash, '0xhash');
  const tx = auth.calls[0][1];
  assert.equal(tx.from, ADDR); assert.equal(tx.to, TO); assert.equal(tx.value, 5n); assert.equal(tx.data, '0xabcd'); assert.equal(tx.chainId, 31337);
});
await test('sendTransaction: the transaction\'s own chain id wins over the signer\'s', async () => {
  const auth = fakeAuth(); const s = new AuthenticatorSigner(auth, ADDR, 31337, '', provider());
  await s.sendTransaction({ to: TO, chainId: 8453 });
  assert.equal(auth.calls[0][1].chainId, 8453);
});
await test('wait() asks the provider for the receipt of that hash (default one confirmation)', async () => {
  const log = []; const s = new AuthenticatorSigner(fakeAuth(), ADDR, 31337, '', provider(log));
  const response = await s.sendTransaction({ to: TO });
  const receipt = await response.wait();
  assert.equal(receipt.blockNumber, 7); assert.deepEqual(log[0], ['0xhash', 1]);
});
await test('wait() with no provider says so instead of pretending', async () => {
  const s = new AuthenticatorSigner(fakeAuth(), ADDR, 31337, '', null);
  const response = await s.sendTransaction({ to: TO });
  await assert.rejects(response.wait(), /No network is configured/);
});
await test('signTransaction is refused: the authenticator signs and broadcasts behind its own approval', async () => {
  const s = new AuthenticatorSigner(fakeAuth(), ADDR, 31337, '', null);
  await assert.rejects(s.signTransaction({}), /does not hand out signed transactions/);
});
await test('an authenticator error (a rejection) reaches the caller unchanged', async () => {
  const boom = Object.assign(new Error('rejected'), { code: 'user_rejected' });
  const s = new AuthenticatorSigner(fakeAuth({ sendTransaction: async () => { throw boom; } }), ADDR, 31337, '', provider());
  await assert.rejects(s.sendTransaction({ to: TO }), (e) => e === boom);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
