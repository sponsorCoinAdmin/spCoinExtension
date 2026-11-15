// File: test/claimCore.test.mjs
//
// docs/meritMigration.txt row 23: the reward claim is ONE implementation, executeClaimTransactionCore in @sponsorcoin/spcoin-onchain, run with each host's TradeExecutor (the extension's vault signer, a future host's own).
// This test RUNS the built module: the calldata of every claim method, the executor call (target, data, chain, confirmation copy), the refusals and the confirm hook.
// Run: node test/claimCore.test.mjs   (needs the on-chain package built: npm run build in spCoinOnChain)
// MUTANT=wrongSelector|noAccountCheck|noConfirmHook run against a deliberately broken copy of the module's source text and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ONCHAIN = path.join(HERE, '..', '..', '..', '..', '..', 'spCoinOnChain', 'packages', '@sponsorcoin', 'spcoin-onchain');
const m = process.env.MUTANT;
let file = path.join(ONCHAIN, 'dist', 'trade', 'executeClaimTransactionCore.js');
if (m) {
  let text = fs.readFileSync(file, 'utf8');
  const swap = (from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); text = text.replace(from, to); };
  if (m === 'wrongSelector') swap("functionName: method", "functionName: 'claimOnChainSponsorRewards'");
  if (m === 'noAccountCheck') swap("if (!accountKey)", "if (false)");
  if (m === 'noConfirmHook') swap("await onConfirmed?.();", "");
  file = path.join(ONCHAIN, 'dist', 'trade', '_mutant_claim.js');
  fs.writeFileSync(file, text);
}
const core = await import(pathToFileURL(file).href);
if (m) fs.unlinkSync(file);
const { toFunctionSelector } = await import('viem');

const SIGS = {
  claimOnChainTotalRewards: 'claimOnChainTotalRewards(address)',
  claimOnChainSponsorRewards: 'claimOnChainSponsorRewards(address)',
  claimOnChainAgentRewards: 'claimOnChainAgentRewards(address)',
  claimOnChainRecipientRewards: 'claimOnChainRecipientRewards(address)',
};
const ACCOUNT = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('every claim method encodes to its own selector with the account as the one argument', () => {
  assert.deepEqual([...core.CLAIM_METHODS], Object.keys(SIGS));
  for (const [method, sig] of Object.entries(SIGS)) {
    const data = core.encodeClaimCalldata(method, ACCOUNT);
    assert.equal(data.slice(0, 10), toFunctionSelector(sig), method);
    assert.equal(data.length, 10 + 64, method + ' carries exactly one address word');
    assert.ok(data.toLowerCase().endsWith(ACCOUNT.slice(2).toLowerCase()), method);
  }
});
await test('the executor gets the contract, the calldata, the chain, the RPC and the confirmation copy; the result carries the method', async () => {
  let call;
  const context = { executor: { execute: async (c) => { call = c; return { transactionHash: '0xabc', receipt: null }; } } };
  let confirmed = 0;
  const out = await core.executeClaimTransactionCore({ accountKey: ACCOUNT, method: 'claimOnChainTotalRewards', contractAddress: '0x8b0EdFa21C0AAA8daA633f6c1685E1d4fC79a8FC', chainId: 31337, rpcUrl: 'http://rpc', fromAddress: ACCOUNT, context, onConfirmed: () => { confirmed++; } });
  assert.equal(call.to, '0x8b0EdFa21C0AAA8daA633f6c1685E1d4fC79a8FC');
  assert.equal(call.data, core.encodeClaimCalldata('claimOnChainTotalRewards', ACCOUNT));
  assert.equal(call.chainId, 31337);
  assert.equal(call.rpcUrl, 'http://rpc');
  assert.equal(call.display.title, 'Claim Rewards');
  assert.equal(call.display.label, 'claimOnChainTotalRewards');
  assert.equal(out.transactionHash, '0xabc');
  assert.equal(out.methodName, 'claimOnChainTotalRewards');
  assert.equal(confirmed, 1, 'the confirm hook runs once after the transaction');
});
await test('no account to claim for, or no signer, is refused before the executor is called', async () => {
  let called = false;
  const context = { executor: { execute: async () => { called = true; return { transactionHash: '0x1', receipt: null }; } } };
  await assert.rejects(core.executeClaimTransactionCore({ accountKey: '', method: 'claimOnChainTotalRewards', contractAddress: '0x1', chainId: 1, rpcUrl: 'x', fromAddress: ACCOUNT, context }), /No active account/);
  await assert.rejects(core.executeClaimTransactionCore({ accountKey: ACCOUNT, method: 'claimOnChainTotalRewards', contractAddress: '0x1', chainId: 1, rpcUrl: 'x', fromAddress: '', context }), /Select and activate/);
  assert.equal(called, false);
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
