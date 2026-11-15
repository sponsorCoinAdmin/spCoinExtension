// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/sponsor.test.mjs
//
// Tests for the sponsor reads (src/sponsor/sponsorReads.ts) and the Un-Stake walk (src/sponsor/unstakeWalk.ts) against an in-memory model of the spCoin staking tree.
// Run: node test/sponsor.test.mjs.  MUTANT=skipDirect removes the "direct remainder first" leg of a partial unstake and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');

function load(file, shims = {}) {
  let src = fs.readFileSync(path.join(HERE, '..', 'src', 'sponsor', file), 'utf8');
  if (process.env.MUTANT === 'noCap' && file === 'sponsorReads.ts') src = src.replace('if (active < concurrency) {', 'if (true) {');
  if (process.env.MUTANT === 'skipDirect' && file === 'unstakeWalk.ts') src = src.replace('if (directRemainder > 0n && !budgetExhausted(state)) {', 'if (false) {');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  new Function('require', 'module', 'exports', js)((name) => shims[name] ?? req(name), m, m.exports);
  return m.exports;
}
const reads = load('sponsorReads.ts');
const walk = load('unstakeWalk.ts', { './sponsorReads': reads });

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

const S = '0xSponsor', R1 = '0xRecipient1', R2 = '0xRecipient2', AG = '0xAgent';

/** A model chain: sponsor -> recipient -> rateKey -> { direct, agents: { agent -> { aKey -> staked } } }. The bucket total is direct + all agent leaves. */
function chain() {
  const tree = {
    [R1]: { 50: { direct: 100n, agents: { [AG]: { 10: 30n, 20: 20n } } } },
    [R2]: { 40: { direct: 7n, agents: {} } },
  };
  const bucketTotal = (b) => b.direct + Object.values(b.agents).reduce((s, leaves) => s + Object.values(leaves).reduce((a, v) => a + v, 0n), 0n);
  const arg = (a, i) => a[i].value;
  const read = async (method, args) => {
    if (method === 'getRecipientKeys') return Object.keys(tree).filter((r) => Object.keys(tree[r]).length);
    if (method === 'getSponsorRecipientRates') return Object.keys(tree[arg(args, 1)] ?? {});
    if (method === 'getRecipientTransaction') return { stakedSPCoins: String(bucketTotal(tree[arg(args, 1)][arg(args, 2)])) };
    if (method === 'getRecipientRateAgentList') return Object.keys(tree[arg(args, 1)][arg(args, 2)].agents);
    if (method === 'getAgentRateList') return Object.keys(tree[arg(args, 1)][arg(args, 2)].agents[arg(args, 3)] ?? {});
    if (method === 'getAgentTransaction') return { stakedSPCoins: String(tree[arg(args, 1)][arg(args, 2)].agents[arg(args, 3)][arg(args, 4)]) };
    throw new Error('unexpected read ' + method);
  };
  const sent = [];
  const send = async (method, args) => {
    sent.push([method, ...args.map(String)]);
    const [, rec, rKey] = args.map(String);
    if (method === 'unSponsorRecipient') delete tree[args[1]];
    if (method === 'deleteRecipientRate') { const b = tree[rec][rKey]; const q = args[3]; if (q === 0n) delete tree[rec][rKey]; else b.direct -= q; }
    if (method === 'unSponsorAgent') delete tree[rec][rKey].agents[String(args[3])];
    if (method === 'deleteAgentRate') { const leaves = tree[rec][rKey].agents[String(args[3])]; const key = String(args[4]); const q = args[5]; if (q === 0n || q >= leaves[key]) delete leaves[key]; else leaves[key] -= q; }
    return { hash: '0x' + String(sent.length).padStart(64, '0'), gasUsed: 100n, gasPrice: 2n };
  };
  return { tree, read, send, sent, bucketTotal };
}

await test('the staking tree lists recipients, rate buckets, agents and agent rates with their staked amounts', async () => {
  const c = chain();
  const tree = await reads.loadSponsorTree(S, c.read);
  assert.equal(tree.length, 2);
  const r1 = tree.find((r) => r.recipientKey === R1);
  assert.equal(r1.rates[0].recipientRateKey, '50');
  assert.equal(r1.rates[0].stakedSPCoins, '150');
  assert.deepEqual(r1.rates[0].agents[0].rates, [{ agentRateKey: '10', stakedSPCoins: '30' }, { agentRateKey: '20', stakedSPCoins: '20' }]);
});

await test('what a sponsor has staked with one recipient is the sum over that pair\'s rate buckets', async () => {
  const c = chain();
  assert.equal(await reads.getStakedRawForPair(S, R1, c.read), 150n);
  assert.equal(await reads.getStakedRawForPair(S, R2, c.read), 7n);
  assert.equal(await reads.getStakedRawForPair(S, '0xNobody', c.read), 0n);
});

await test('unstaking a whole recipient with no quantity is the single cheap unSponsorRecipient call', async () => {
  const c = chain();
  const r = await walk.unstakeSpCoin({ read: c.read, send: c.send }, S, R1);
  assert.deepEqual(c.sent, [['unSponsorRecipient', S, R1]]);
  assert.equal(r.status, 'complete'); assert.equal(r.legCount, 1);
  assert.equal(r.legs[0].gasCostRaw, 200n);
});

await test('unstaking one rate bucket with no quantity deletes the bucket in one call', async () => {
  const c = chain();
  await walk.unstakeSpCoin({ read: c.read, send: c.send }, S, R1, '50');
  assert.deepEqual(c.sent, [['deleteRecipientRate', S, R1, '50', '0']]);
});

await test('a partial quantity drains the direct remainder first, then the agent leaves in order, and stops when the quantity is spent', async () => {
  const c = chain();
  const r = await walk.unstakeSpCoin({ read: c.read, send: c.send }, S, R1, '50', undefined, undefined, 120n);
  // direct 100, then 20 of the first agent leaf (30)
  assert.deepEqual(c.sent, [['deleteRecipientRate', S, R1, '50', '100'], ['deleteAgentRate', S, R1, '50', AG, '10', '20']]);
  assert.equal(r.totalUnstakedRaw, 120n); assert.equal(r.status, 'complete');
  assert.equal(c.bucketTotal(c.tree[R1][50]), 30n);
});

await test('a failing leg stops the walk; earlier legs stay and the status says partial (or failed when it was the first)', async () => {
  const c = chain(); let n = 0;
  const flaky = async (m, a) => { if (++n === 2) throw new Error('user rejected'); return c.send(m, a); };
  const r = await walk.unstakeSpCoin({ read: c.read, send: flaky }, S, R1, '50', undefined, undefined, 120n);
  assert.equal(r.status, 'partial'); assert.equal(r.legs[1].status, 'failed'); assert.match(r.legs[1].error, /rejected/);
  assert.equal(r.totalUnstakedRaw, 100n);
  const c2 = chain();
  const r2 = await walk.unstakeSpCoin({ read: c2.read, send: async () => { throw new Error('locked'); } }, S, R2);
  assert.equal(r2.status, 'failed');
});

await test('no recipient given walks every recipient; a negative quantity or a missing sponsor is refused', async () => {
  const c = chain();
  await walk.unstakeSpCoin({ read: c.read, send: c.send }, S);
  assert.deepEqual(c.sent.map((s) => s[0]), ['unSponsorRecipient', 'unSponsorRecipient']);
  await assert.rejects(walk.unstakeSpCoin({ read: c.read, send: c.send }, S, R1, undefined, undefined, undefined, -1n), /negative/);
  await assert.rejects(walk.unstakeSpCoin({ read: c.read, send: c.send }, ''), /sponsor/);
});

await test('throttled reads cap the reads in flight and retry a failed read; a read that keeps failing still fails', async () => {
  let inFlight = 0, peak = 0, calls = 0, failFirst = new Set();
  const slow = async (method, args) => { inFlight++; peak = Math.max(peak, inFlight); calls++; await new Promise((r) => setTimeout(r, 5)); inFlight--; const key = method + args[0].value; if (!failFirst.has(key) && /^flaky/.test(args[0].value)) { failFirst.add(key); throw new Error('503'); } return args[0].value; };
  const read = reads.throttleRead(slow, { concurrency: 3, pauseMs: 1 });
  const out = await Promise.all(Array.from({ length: 12 }, (_, i) => read('m', [{ key: 'k', value: (i % 4 === 0 ? 'flaky' : 'ok') + i }])));
  assert.equal(out.length, 12); assert.ok(peak <= 3, 'peak ' + peak);
  assert.ok(calls > 12, 'retried');
  assert.strictEqual(reads.throttleRead(read), read);
  await assert.rejects(reads.throttleRead(async () => { throw new Error('down'); }, { retries: 1, pauseMs: 1 })('m', []), /down/);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
