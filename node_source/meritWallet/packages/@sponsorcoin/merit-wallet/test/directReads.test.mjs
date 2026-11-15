// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/directReads.test.mjs
//
// Tests for the direct RPC reads (src/chain/directReads.ts) against an in-memory node. Run: node test/directReads.test.mjs
// MUTANT=wrongArgs runs against a deliberately broken copy and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const viem = req('viem');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'chain', 'directReads.ts'), 'utf8');
if (process.env.MUTANT === 'noNames') src = src.replace('return Object.fromEntries(', 'return Array.from(').replace('outputs.map((o, i) => [o.name as string, (value as unknown[])[i]]));', 'value as unknown[]);');
if (process.env.MUTANT === 'wrongArgs') src = src.replace('args: args.map((a) => a.value),', 'args: [],');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', js)(req, m, m.exports);
const { readContractDirect, toRunScriptShape, createDirectReadStep, namedOutputsShape } = m.exports;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

const abi = viem.parseAbi(['function getRecipientRateIncrement() view returns (uint256)', 'function balanceOf(address) view returns (uint256)', 'function boom() view returns (uint256)']);
const A = '0x5FbDB2315678afecb367f032d93F642f64180aa3', W = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
function node() {
  const calls = [];
  const transport = viem.custom({ request: async ({ method, params }) => {
    if (method !== 'eth_call') throw new Error('unexpected ' + method);
    calls.push(params[0]);
    const data = params[0].data;
    if (data.startsWith(viem.toFunctionSelector('getRecipientRateIncrement()'))) return viem.encodeAbiParameters([{ type: 'uint256' }], [5n]);
    if (data.startsWith(viem.toFunctionSelector('balanceOf(address)'))) return viem.encodeAbiParameters([{ type: 'uint256' }], [BigInt('0x' + data.slice(-40)) % 1000n]);
    throw new Error('execution reverted: boom');
  } });
  return { calls, transport };
}

await test('a zero-argument view returns the decoded value', async () => {
  const n = node();
  assert.equal(await readContractDirect({ rpcUrl: 'x', address: A, abi, functionName: 'getRecipientRateIncrement', transport: n.transport }), 5n);
  assert.equal(n.calls[0].to.toLowerCase(), A.toLowerCase());
});

await test('arguments are passed through (key/value params become positional args)', async () => {
  const n = node(); const step = createDirectReadStep(abi, () => n.transport);
  const direct = await readContractDirect({ rpcUrl: 'x', address: A, abi, functionName: 'balanceOf', args: [W], transport: n.transport });
  const viaStep = await step.read({ contractAddress: A, rpcUrl: 'x' }, 'balanceOf', [{ key: 'Account', value: W }]);
  assert.equal(String(direct), viaStep);
});

await test('results use the run-script shape: bigint becomes a decimal string, so Number(result) works as before', async () => {
  const n = node(); const step = createDirectReadStep(abi, () => n.transport);
  const r = await step.read({ contractAddress: A, rpcUrl: 'x' }, 'getRecipientRateIncrement');
  assert.equal(r, '5'); assert.equal(Number(r), 5);
  assert.deepEqual(toRunScriptShape([1n, [2n]]), ['1', ['2']]);
});

await test('handles() says which methods the ABI covers, so a host can fall back for the rest', () => {
  const step = createDirectReadStep(abi);
  assert.equal(step.handles('getRecipientRateIncrement'), true); assert.equal(step.handles('getAccountRecord'), false);
});

await test('a reverting call throws with the node message', async () => {
  const n = node();
  await assert.rejects(readContractDirect({ rpcUrl: 'x', address: A, abi, functionName: 'boom', transport: n.transport }), /boom/);
});

await test('a view with several named outputs comes back as an object keyed by those names (the run-script shape), others unchanged', async () => {
  const abi2 = viem.parseAbi(['function getRecipientTransaction(address s, address r, uint256 k) view returns (address sponsorKey, address recipientKey, uint256 recipientRateKey, uint256 creationTime, uint256 lastUpdateTime, uint256 stakedSPCoins, bool inserted)', 'function getRecipientRateIncrement() view returns (uint256)']);
  const value = [A, W, 50n, 1n, 2n, 3000000000000000000n, true];
  assert.deepEqual(toRunScriptShape(namedOutputsShape(abi2, 'getRecipientTransaction', value)), { sponsorKey: A, recipientKey: W, recipientRateKey: '50', creationTime: '1', lastUpdateTime: '2', stakedSPCoins: '3000000000000000000', inserted: true });
  assert.equal(namedOutputsShape(abi2, 'getRecipientRateIncrement', 5n), 5n);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
