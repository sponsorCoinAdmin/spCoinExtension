// File: test/chainClock.test.mjs
//
// The chain clock (src/rewards/chainClock.ts) and the role flags (src/rewards/accountRoleFlags.ts): the two rules every host shares so a reward figure is the same on every computer and in every time zone.
// Run: node test/chainClock.test.mjs      MUTANT=wallClock|noAdopt|backwards|flagSwap run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const load = (file, mutate = (s) => s) => {
  const src = mutate(fs.readFileSync(path.join(HERE, '..', 'src', 'rewards', file), 'utf8'));
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  new Function('require', 'module', 'exports', js)(req, m, m.exports);
  return m.exports;
};
const M = process.env.MUTANT;
const { createChainClock, readChainTimestamp } = load('chainClock.ts', (s) => {
  if (M === 'wallClock') return s.replace('return anchor.chainSeconds +', 'return BigInt(Math.floor(Date.now() / 1000)) + 0n * anchor.chainSeconds +');
  if (M === 'noAdopt') return s.replace('latest > anchor.chainSeconds', 'false');
  if (M === 'backwards') return s.replace('Math.max(0, Math.floor((elapsedMs() - anchor.atMs) / 1000))', 'Math.floor((anchor.atMs - elapsedMs()) / 1000)');
  return s;
});
const { withRoleFlags } = load('accountRoleFlags.ts', (s) => (M === 'flagSwap' ? s.replace('isSponsor: recipients > 0', 'isSponsor: sponsors > 0') : s));

let n = 0;
const test = async (name, fn) => {
  try {
    await fn();
    n += 1;
    console.log('ok -', name);
  } catch (e) {
    console.log('FAIL -', name, e.message.split('\n')[0]);
    process.exitCode = 1;
  }
};

await test('the chain time is the block time, not the computer time (a fork hours behind the wall clock)', async () => {
  const clock = createChainClock(async () => 1_000_000n, () => 5_000_000_000);
  assert.equal(await clock.now(), 1_000_000n);
});
await test('two computers with clocks hours apart get the same chain time', async () => {
  const a = createChainClock(async () => 1_000_000n, () => 111_000);
  const b = createChainClock(async () => 1_000_000n, () => 999_999_000_000);
  assert.equal(await a.now(), await b.now());
});
await test('between blocks it counts forward with elapsed time', async () => {
  let t = 0;
  const clock = createChainClock(async () => 1_000_000n, () => t);
  assert.equal(await clock.now(), 1_000_000n);
  t = 7_900;
  assert.equal(clock.current(), 1_000_007n);
  assert.equal(await clock.now(), 1_000_007n); // an idle chain (same newest block) keeps counting
});
await test('a newer block becomes the anchor (no drift builds up)', async () => {
  let t = 0;
  let block = 1_000_000n;
  const clock = createChainClock(async () => block, () => t);
  await clock.now();
  t = 10_000;
  block = 1_000_008n; // the chain advanced only 8 s while 10 s passed here
  assert.equal(await clock.now(), 1_000_008n);
});
await test('the time never moves backwards on its own', async () => {
  let t = 0;
  const clock = createChainClock(async () => 1_000_000n, () => t);
  await clock.now();
  t = -5_000; // a computer clock set back
  assert.equal(clock.current(), 1_000_000n);
});
await test('a failed read keeps counting from the last anchor; before any anchor it throws', async () => {
  let t = 0;
  let fail = false;
  const clock = createChainClock(async () => { if (fail) throw new Error('rpc down'); return 1_000_000n; }, () => t);
  fail = true;
  await assert.rejects(() => clock.now());
  fail = false;
  await clock.now();
  fail = true;
  t = 3_000;
  assert.equal(await clock.now(), 1_000_003n);
});
await test('accepts a number or a decimal string from the host', async () => {
  assert.equal(await createChainClock(async () => 42, () => 0).now(), 42n);
  assert.equal(await createChainClock(async () => '43', () => 0).now(), 43n);
});

await test('role flags follow the access module rule (a Sponsor has recipients; a Recipient has sponsors or agents; an Agent has parent recipients)', () => {
  const sponsorOnly = withRoleFlags({ sponsorCount: '0', recipientCount: '3', agentCount: '0', parentRecipientCount: '0' });
  assert.deepEqual([sponsorOnly.isSponsor, sponsorOnly.isRecipient, sponsorOnly.isAgent], [true, false, false]);
  const recipient = withRoleFlags({ sponsorCount: '2', recipientCount: '0', agentCount: '0', parentRecipientCount: '0' });
  assert.deepEqual([recipient.isSponsor, recipient.isRecipient, recipient.isAgent], [false, true, false]);
  const agent = withRoleFlags({ sponsorCount: '0', recipientCount: '0', agentCount: '0', parentRecipientCount: '1' });
  assert.deepEqual([agent.isSponsor, agent.isRecipient, agent.isAgent], [false, false, true]);
  const recipientViaAgents = withRoleFlags({ sponsorCount: '0', recipientCount: '0', agentCount: '4', parentRecipientCount: '0' });
  assert.equal(recipientViaAgents.isRecipient, true);
});
await test('a record that already has the flags (the web server\'s) is returned unchanged', () => {
  const record = { isSponsor: false, isRecipient: true, isAgent: false, recipientCount: '9' };
  assert.equal(withRoleFlags(record), record);
});
await test('non-records pass through', () => {
  assert.equal(withRoleFlags(undefined), undefined);
  assert.equal(withRoleFlags(null), null);
  assert.deepEqual(withRoleFlags([1]), [1]);
});
await test('the chain time is the pending block time (the next block time) when the node has one, else the newest block time', async () => {
  const calls = [];
  const withPending = async (method, params) => { calls.push(params[0]); return params[0] === 'pending' ? { timestamp: '0x64' } : { timestamp: '0x32' }; };
  assert.equal(await readChainTimestamp(withPending), 100n);
  const noPending = async (method, params) => { if (params[0] === 'pending') throw new Error('unsupported'); return { timestamp: '0x32' }; };
  assert.equal(await readChainTimestamp(noPending), 50n);
  const nullPending = async (method, params) => (params[0] === 'pending' ? null : { timestamp: 50 });
  assert.equal(await readChainTimestamp(nullPending), 50n);
  await assert.rejects(() => readChainTimestamp(async () => null));
});
await test('no reward calculation reads the calendar clock or time zone', () => {
  for (const file of ['estimateRewards.ts', 'accountRoleFlags.ts']) {
    const text = fs.readFileSync(path.join(HERE, '..', 'src', 'rewards', file), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(text, /Date\.now|new Date|getTimezoneOffset|Intl\.DateTimeFormat|toLocale/, file);
  }
});
console.log(`${n} passed`);
