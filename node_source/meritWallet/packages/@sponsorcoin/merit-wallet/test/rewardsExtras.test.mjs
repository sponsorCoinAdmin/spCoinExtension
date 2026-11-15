// File: test/rewardsExtras.test.mjs
//
// docs/meritMigration.txt row 20: the web's Rewards tab and its Un-Stake list ran through the web's own adapters (deleted with the overlay); a host now passes the same pieces as DATA on the host contract: rewardsHost, rewardsExtras
// (Auto Refresh store, deposit address, refresh hook, trace) and stakingHost. The component draws both screens from them, the same in every app.
// Run: node test/rewardsExtras.test.mjs
// MUTANT=extrasDropped|extrasNotInContract|stakingHostIgnored run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };
let wallet = read('MeritWallet.tsx');
let contract = read('hostContract.ts');
if (m === 'extrasDropped') wallet = swap(wallet, 'React.createElement(ConnectedRewardsPanel, { host: rewardsHost, extras: rewardsExtras })', 'React.createElement(ConnectedRewardsPanel, { host: rewardsHost })');
if (m === 'extrasNotInContract') contract = swap(contract, "'rewardsHost' | 'rewardsExtras'", "'rewardsHost'");
if (m === 'stakingHostIgnored') wallet = swap(wallet, 'stakingHost ? React.createElement(ConnectedSponsorStakingList, { host: stakingHost })', 'false ? React.createElement(ConnectedSponsorStakingList, { host: stakingHost })');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the Rewards card is drawn from rewardsHost and rewardsExtras', () => {
  assert.match(wallet, /rewardsExtras\?: RewardsPanelExtras;/);
  assert.match(wallet, /React\.createElement\(ConnectedRewardsPanel, \{ host: rewardsHost, extras: rewardsExtras \}\)/);
});
await test('the contract classifies rewardsExtras with the data a host supplies', () => {
  assert.match(contract, /'rewardsHost' \| 'rewardsExtras'/);
});
await test('the Un-Stake list is drawn from stakingHost', () => {
  // 2026-11-07: drawn inside WALLET_RADIO_PANELS (stakingListNode), under the tab strip
  assert.ok(wallet.includes('stakingHost ? React.createElement(ConnectedSponsorStakingList, { host: stakingHost })'));
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
