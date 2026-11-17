// File: test/estimateRewards.test.mjs
//
// Tests for the client-side pending-reward estimate (src/rewards/estimateRewards.ts), against an in-memory contract that answers the same views. Run: node test/estimateRewards.test.mjs
// MUTANT=swapSplit|noFallback|futureTime|agentSplit run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'rewards', 'estimateRewards.ts'), 'utf8');
if (process.env.MUTANT === 'swapSplit') src = src.replace('sponsorReward: base - recipientAgentPool', 'sponsorReward: recipientAgentPool');
if (process.env.MUTANT === 'noFallback') src = src.replace('let annualInflation = 10n;', 'let annualInflation = 0n;');
if (process.env.MUTANT === 'futureTime') src = src.replace('const diff = last > now ? 0n : now - last;', 'const diff = now - last;');
if (process.env.MUTANT === 'agentSplit') src = src.replace('(pool * big(agentRate)) / 1000n', '(pool * big(agentRate)) / 100n');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', js)(req, m, m.exports);
const { estimatePendingRewards, estimateRewardsByMethod, addPendingToTree, accrue, splitRewardPool, splitAgentPool } = m.exports;

const S = '0xaaaa000000000000000000000000000000000001';
const R = '0xbbbb000000000000000000000000000000000002';
const A = '0xcccc000000000000000000000000000000000003';
const E18 = 10n ** 18n;
const T0 = 1_000_000n;
const YEAR = 31556925n;

// S sponsors R at recipientRate 30: a direct bucket of 1000 spCoins, and an agent A at agentRate 100 with a bucket of 2000. Settled at T0.
function chain({ inflation = 10n, lastUpdate = T0 } = {}) {
  const sets = new Map([
    ['setR', { inserted: true, totalStaked: 1000n * E18, last: lastUpdate }],
    ['setA', { inserted: true, totalStaked: 2000n * E18, last: lastUpdate }],
  ]);
  const calls = [];
  const read = async (method, args) => {
    calls.push(method);
    const v = args.map((a) => a.value.toLowerCase());
    switch (method) {
      case 'getInflationRate': if (inflation === null) throw new Error('boom'); return inflation;
      case 'getRecipientKeys': return v[0] === S ? [R] : [];
      case 'getSponsorKeys': return v[0] === R ? [S] : [];
      case 'getParentRecipientKeys': return v[0] === A ? [R] : [];
      case 'getSponsorRecipientRates': return v[0] === S && v[1] === R ? [30n] : [];
      case 'getRecipientRateAgentList': return v[0] === S && v[1] === R ? [A] : [];
      case 'getAgentRateList': return v[3] === A ? [100n] : [];
      case 'getRecipientRateTransactionSetKey': return 'setR';
      case 'getAgentRateTransactionSetKey': return 'setA';
      case 'getRateTransactionSet': {
        const s = sets.get(v[0] === 'setr' ? 'setR' : 'setA');
        return { setKey: v[0], rate: 30n, creationTimeStamp: T0, rewardsSettledThroughTimeStamp: s.last, totalStaked: s.totalStaked, transactionCount: 1n, inserted: s.inserted };
      }
      default: throw new Error('unexpected read ' + method);
    }
  };
  return { read, calls };
}

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('formulas: accrual, pool split, agent split', () => {
  assert.equal(accrue(1000n * E18, T0, T0 + YEAR, 10n), 100n * E18);
  assert.equal(accrue(1000n * E18, T0 + 5n, T0, 10n), 0n);
  assert.deepEqual(splitRewardPool(100n * E18, 50), { recipientAgentPool: 50n * E18, sponsorReward: 50n * E18 });
  assert.deepEqual(splitAgentPool(100n * E18, 100), { agentReward: 10n * E18, recipientReward: 90n * E18 });
});
await test('one year later: sponsor, recipient and agent each get their share of both buckets', async () => {
  const { read } = chain();
  const now = T0 + YEAR;
  const s = await estimatePendingRewards({ read, accountKey: S, now });
  // rate 30: direct bucket base 100 -> pool 30, sponsor 70 ; agent bucket base 200 -> pool 60 (agent 6, recipient 54), sponsor 140
  assert.equal(s.pendingSponsorRewards, (210n * E18).toString());
  assert.equal(s.pendingRecipientRewards, '0');
  assert.equal(s.pendingAgentRewards, '0');
  const r = await estimatePendingRewards({ read, accountKey: R, now });
  assert.equal(r.pendingRecipientRewards, (84n * E18).toString());
  assert.equal(r.pendingSponsorRewards, '0');
  const a = await estimatePendingRewards({ read, accountKey: A, now });
  assert.equal(a.pendingAgentRewards, (6n * E18).toString());
  assert.equal(a.pendingRecipientRewards, '0');
  assert.equal(a.pendingTotalRewards, (6n * E18).toString());
  assert.equal(s.pendingRewards, s.pendingTotalRewards);
});
await test('nothing is created or lost: the roles of all three accounts add up to the whole accrual', async () => {
  const { read } = chain(); const now = T0 + YEAR;
  const parts = await Promise.all([S, R, A].map((k) => estimatePendingRewards({ read, accountKey: k, now })));
  const sum = parts.reduce((n, p) => n + BigInt(p.pendingRewards), 0n);
  assert.equal(sum, 300n * E18); // base 100 + base 200
});
await test('an unreadable inflation rate falls back to 10 percent', async () => {
  const { read } = chain({ inflation: null });
  const s = await estimatePendingRewards({ read, accountKey: S, now: T0 + YEAR });
  assert.equal(s.annualInflation, '10'); assert.equal(s.pendingSponsorRewards, (210n * E18).toString());
});
await test('a bucket settled in the future accrues nothing', async () => {
  const { read } = chain({ lastUpdate: T0 + 10n * YEAR });
  assert.equal((await estimatePendingRewards({ read, accountKey: S, now: T0 + YEAR })).pendingRewards, '0');
});
await test('an account with no relationships has zero pending and makes few reads', async () => {
  const { read, calls } = chain();
  const p = await estimatePendingRewards({ read, accountKey: '0xdddd000000000000000000000000000000000004', now: T0 + YEAR });
  assert.equal(p.pendingRewards, '0'); assert.ok(calls.length <= 5, String(calls.length));
});
await test('a half year gives half the amounts (linear in time, integer floor)', async () => {
  const { read } = chain();
  const full = BigInt((await estimatePendingRewards({ read, accountKey: S, now: T0 + YEAR })).pendingRewards);
  const half = BigInt((await estimatePendingRewards({ read, accountKey: S, now: T0 + YEAR / 2n })).pendingRewards);
  assert.ok(half * 2n <= full && full - half * 2n < full / 1_000_000n, `${half} vs ${full}`);
});
await test('estimateRewardsByMethod accepts the four estimate methods only', async () => {
  const { read } = chain();
  for (const name of ['Total', 'Sponsor', 'Recipient', 'Agent']) assert.equal((await estimateRewardsByMethod(`estimateOffChain${name}Rewards`, { read, accountKey: S, now: T0 })).pendingRewards, '0');
  await assert.rejects(estimateRewardsByMethod('claimOnChainTotalRewards', { read, accountKey: S }), /not an estimate method/);
});

// 2026-11-14: per-row pending for the Claim list (addPendingToTree). The same chain as above, as the staking tree the list draws: S sponsors R at rate 30 (direct bucket 1000, agent A at agentRate 100 with 2000).
const treeOf = (rowKey) => [{ recipientKey: rowKey, rates: [{ recipientRateKey: '30', stakedSPCoins: (3000n * E18).toString(), agents: [{ agentKey: A, rates: [{ agentRateKey: '100', stakedSPCoins: (2000n * E18).toString() }] }] }] }];
await test('claim list rows: a Sponsor row adds up to the Sponsor pending of the Rewards page', async () => {
  const { read } = chain(); const now = T0 + YEAR;
  const tree = treeOf(R);
  await addPendingToTree('Sponsor', S, tree, read, now);
  const rate = tree[0].rates[0];
  assert.equal(rate.pendingDirect, (70n * E18).toString());
  assert.equal(rate.agents[0].rates[0].pending, (140n * E18).toString());
  const total = BigInt(rate.pendingDirect) + BigInt(rate.agents[0].rates[0].pending);
  assert.equal(total.toString(), (await estimatePendingRewards({ read, accountKey: S, now })).pendingSponsorRewards);
});
await test('claim list rows: a Recipient row (the sponsor) adds up to the Recipient pending of the Rewards page', async () => {
  const { read } = chain(); const now = T0 + YEAR;
  const tree = treeOf(S);
  await addPendingToTree('Recipient', R, tree, read, now);
  const rate = tree[0].rates[0];
  assert.equal(rate.pendingDirect, (30n * E18).toString());
  assert.equal(rate.agents[0].rates[0].pending, (54n * E18).toString());
  const total = BigInt(rate.pendingDirect) + BigInt(rate.agents[0].rates[0].pending);
  assert.equal(total.toString(), (await estimatePendingRewards({ read, accountKey: R, now })).pendingRecipientRewards);
});
await test('claim list rows: an Agent row (the sponsor) adds up to the Agent pending of the Rewards page', async () => {
  const { read } = chain(); const now = T0 + YEAR;
  const tree = [{ recipientKey: S, rates: [{ recipientRateKey: '30', stakedSPCoins: (2000n * E18).toString(), agents: [{ agentKey: A, rates: [{ agentRateKey: '100', stakedSPCoins: (2000n * E18).toString(), recipients: [R] }] }] }] }];
  await addPendingToTree('Agent', A, tree, read, now);
  const rate = tree[0].rates[0];
  const agentPending = BigInt(rate.agents[0].rates[0].pending);
  assert.equal(agentPending.toString(), (await estimatePendingRewards({ read, accountKey: A, now })).pendingAgentRewards);
  // the recipient's own reward is broken out: with the agent's it is the whole Recipient+Agent pool (agentRate 100 = 10 percent to the agent)
  assert.equal(BigInt(rate.pendingDirect) * 1n, agentPending * 9n);
  assert.ok(BigInt(rate.agents[0].rates[0].pending) > 0n);
});
await test('claim list rows: nothing accrued yet gives zero, and an unreadable inflation uses 10 percent', async () => {
  const { read } = chain({ inflation: null });
  const tree = treeOf(R);
  await addPendingToTree('Sponsor', S, tree, read, T0 + YEAR);
  assert.equal(tree[0].rates[0].pendingDirect, (70n * E18).toString());
  const fresh = treeOf(R);
  await addPendingToTree('Sponsor', S, fresh, chain().read, T0);
  assert.equal(fresh[0].rates[0].pendingDirect, '0'); assert.equal(fresh[0].rates[0].agents[0].rates[0].pending, '0');
});

await test('claim list rows: the returned function recomputes a later time without reading the chain again', async () => {
  const { read, calls } = chain();
  const tree = treeOf(R);
  const apply = await addPendingToTree('Sponsor', S, tree, read, T0 + YEAR / 2n);
  const half = BigInt(tree[0].rates[0].pendingDirect);
  const readsSoFar = calls.length;
  apply(T0 + YEAR);
  assert.equal(calls.length, readsSoFar, 'no new reads');
  assert.equal(tree[0].rates[0].pendingDirect, (70n * E18).toString());
  assert.ok(half * 2n <= 70n * E18 && 70n * E18 - half * 2n < 70n * E18 / 1_000_000n, String(half));
  assert.equal(tree[0].rates[0].agents[0].rates[0].pending, (140n * E18).toString());
});
// 2026-11-14: the TOTAL estimate lists only roles with something pending (the web server's display step does the same), so the Rewards panel shows N/A for a role the account does not have
await test('the Total estimate omits zero roles; a role estimate keeps its own', async () => {
  const { read } = chain(); const now = T0 + YEAR;
  const total = await estimateRewardsByMethod('estimateOffChainTotalRewards', { read, accountKey: S, now });
  assert.ok(BigInt(total.pendingSponsorRewards) > 0n);
  assert.equal('pendingRecipientRewards' in total, false);
  assert.equal('pendingAgentRewards' in total, false);
  const sponsorOnly = await estimateRewardsByMethod('estimateOffChainRecipientRewards', { read, accountKey: S, now });
  assert.equal(sponsorOnly.pendingRecipientRewards, '0');
});
for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
