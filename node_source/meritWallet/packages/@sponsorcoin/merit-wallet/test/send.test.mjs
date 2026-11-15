// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/send.test.mjs
//
// Tests for the shared send orchestration (src/send/sendTransfer.ts). Run: node test/send.test.mjs
// The ERC20 calldata is checked against viem's own ABI encoder, and the amount conversion against viem's parseUnits.
// MUTANT=badSelector / MUTANT=allowZero run against a deliberately broken copy and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const viem = req('viem');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'send', 'sendTransfer.ts'), 'utf8');
if (process.env.MUTANT === 'badSelector') src = src.replaceAll('a9059cbb', 'a9059cbc');
if (process.env.MUTANT === 'allowZero') src = src.replace('amountWei <= 0n', 'amountWei < 0n');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', js)(req, m, m.exports);
const { parseDecimalToWei, encodeErc20Transfer, prepareTransfer, executeSend } = m.exports;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const R = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', T = '0x5FbDB2315678afecb367f032d93F642f64180aa3', F = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

await test('amount conversion agrees with viem parseUnits for good inputs and refuses bad ones', () => {
  for (const [a, d] of [['1', 18], ['1.5', 18], ['0.000001', 6], ['123456789.123456789', 18], ['.5', 18], ['5.', 18], ['0', 18]]) assert.equal(parseDecimalToWei(a, d), viem.parseUnits(a, d), a);
  for (const [a, d] of [['', 18], ['.', 18], ['1.2.3', 18], ['-1', 18], ['1e5', 18], ['abc', 18], ['0.0000001', 6], [' ', 18]]) assert.equal(parseDecimalToWei(a, d), null, a);
});

await test('ERC20 calldata equals viem encodeFunctionData(transfer)', () => {
  const abi = [{ type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }];
  for (const amt of [1n, 10n ** 18n, 2n ** 255n]) assert.equal(encodeErc20Transfer(R, amt), viem.encodeFunctionData({ abi, functionName: 'transfer', args: [R, amt] }).toLowerCase());
});

await test('native send prepares value with empty calldata; ERC20 prepares calldata to the token with no value', () => {
  const n = prepareTransfer({ recipientAddress: R, amount: '1.5' });
  assert.deepEqual(n, { ok: true, amountWei: 1500000000000000000n, tx: { to: R, data: '0x', value: 1500000000000000000n } });
  const e = prepareTransfer({ recipientAddress: R, tokenAddress: T, decimals: 6, amount: '2' });
  assert.equal(e.ok, true); assert.equal(e.tx.to, T); assert.equal(e.tx.value, undefined); assert.equal(e.tx.data, encodeErc20Transfer(R, 2000000n));
});

await test('validation messages: bad recipient, missing decimals, zero or bad amount, bad token address', () => {
  assert.match(prepareTransfer({ recipientAddress: '0x12', amount: '1' }).message, /valid recipient/);
  assert.match(prepareTransfer({ recipientAddress: undefined, amount: '1' }).message, /valid recipient/);
  assert.match(prepareTransfer({ recipientAddress: R, tokenAddress: T, amount: '1' }).message, /decimals/);
  assert.match(prepareTransfer({ recipientAddress: R, amount: '0' }).message, /greater than zero/);
  assert.match(prepareTransfer({ recipientAddress: R, amount: 'x' }).message, /greater than zero/);
  assert.match(prepareTransfer({ recipientAddress: R, tokenAddress: '0xabc', decimals: 18, amount: '1' }).message, /token address/);
});

await test('executeSend hands the prepared transaction to the transport and returns its hash and receipt', async () => {
  let seen;
  const r = await executeSend({ recipientAddress: R, amount: '1', from: F, chainId: 31337, nativeSymbol: 'ETH' }, async (req) => { seen = req; return { hash: '0xabc', receipt: { block: 7 } }; });
  assert.deepEqual(r, { ok: true, hash: '0xabc', receipt: { block: 7 } });
  assert.equal(seen.from, F); assert.equal(seen.chainId, 31337); assert.equal(seen.title, 'Send 1 ETH'); assert.equal(seen.tx.value, 10n ** 18n);
  const t = await executeSend({ recipientAddress: R, tokenAddress: T, decimals: 6, tokenSymbol: 'USDC', amount: '3', from: F, chainId: 1, nativeSymbol: 'ETH' }, async (req) => { seen = req; return { hash: '0xdef' }; });
  assert.equal(t.ok, true); assert.equal(seen.title, 'Send 3 USDC');
});

await test('a rejected or failing transport comes back as { ok: false, message }, and an invalid form never reaches the transport', async () => {
  let calls = 0;
  const bad = await executeSend({ recipientAddress: R, amount: '1', from: F, chainId: 1, nativeSymbol: 'ETH' }, async () => { calls++; throw new Error('rejected'); });
  assert.deepEqual(bad, { ok: false, message: 'rejected' });
  const invalid = await executeSend({ recipientAddress: 'nope', amount: '1', from: F, chainId: 1, nativeSymbol: 'ETH' }, async () => { calls++; return { hash: 'x' }; });
  assert.equal(invalid.ok, false); assert.equal(calls, 1);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
