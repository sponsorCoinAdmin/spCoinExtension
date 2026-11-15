// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/sendButton.test.mjs
//
// Tests for the Send button's rules (node_source/spCoinPanels/.../src/sendButtonState.ts), shared by the web app and the extension.
// Run: node test/sendButton.test.mjs.  MUTANT=insufficientUnknown blocks a send while the balance is unknown and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', '..', '..', '..', '..', 'spCoinPanels', 'packages', '@sponsorcoin', 'spcoin-panels', 'src', 'sendButtonState.ts'), 'utf8');
if (process.env.MUTANT === 'insufficientUnknown') src = src.replace('input.balanceRaw !== undefined && (amountRaw as bigint) > input.balanceRaw', '(amountRaw as bigint) > (input.balanceRaw ?? 0n)');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', js)(req, m, m.exports);
const { computeSendButton, parseAmountRaw } = m.exports;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const base = { amount: '', decimals: 18, hasRecipient: false, symbol: 'ETH' };
const ONE = 10n ** 18n;

await test('the label walks through what is missing, in the web button\'s order', () => {
  assert.equal(computeSendButton(base).text, 'Enter Amount & Select Recipient');
  assert.equal(computeSendButton({ ...base, amount: '1' }).text, 'Select Recipient');
  assert.equal(computeSendButton({ ...base, hasRecipient: true }).text, 'Enter Amount');
  assert.equal(computeSendButton({ ...base, hasRecipient: true, amount: '0' }).text, 'Enter Amount');
  const ready = computeSendButton({ ...base, hasRecipient: true, amount: '1', balanceRaw: 2n * ONE });
  assert.deepEqual([ready.text, ready.kind, ready.canSend], ['Send', 'ready', true]);
  assert.equal(computeSendButton({ ...base, amount: '1' }).kind, 'idle');
});

await test('insufficient balance compares exact base units, not floating point', () => {
  const over = computeSendButton({ ...base, hasRecipient: true, amount: '1.000000000000000001', balanceRaw: ONE });
  assert.deepEqual([over.text, over.kind, over.canSend], ['Insufficient ETH Balance', 'insufficient', false]);
  assert.equal(computeSendButton({ ...base, hasRecipient: true, amount: '1', balanceRaw: ONE }).canSend, true);
});

await test('a balance that is not known yet never blocks a send (the chain is the authority)', () => {
  const s = computeSendButton({ ...base, hasRecipient: true, amount: '5' });
  assert.deepEqual([s.text, s.canSend], ['Send', true]);
});

await test('a send in flight says Sending… and cannot be clicked; while an approval screen is up the button keeps its normal text but still cannot be clicked', () => {
  const busy = computeSendButton({ ...base, hasRecipient: true, amount: '1', balanceRaw: ONE, isPending: true });
  assert.deepEqual([busy.text, busy.kind, busy.canSend], ['Sending…', 'busy', false]);
  const waiting = computeSendButton({ ...base, hasRecipient: true, amount: '1', balanceRaw: ONE, isPending: true, approvalPending: true });
  assert.deepEqual([waiting.text, waiting.kind, waiting.canSend], ['Send', 'pending', false]);
});

await test('amount parsing is exact and strict', () => {
  assert.equal(parseAmountRaw('1.5', 18), 15n * 10n ** 17n);
  assert.equal(parseAmountRaw('0.000001', 6), 1n);
  assert.equal(parseAmountRaw('1.0000001', 6), null);
  assert.equal(parseAmountRaw('1e3', 18), null);
  assert.equal(parseAmountRaw('-1', 18), null);
  assert.equal(parseAmountRaw('.', 18), null);
  assert.equal(parseAmountRaw('', 18), null);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
