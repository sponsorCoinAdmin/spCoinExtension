// File: test/hostSendResult.test.mjs
//
// docs/meritMigration.txt row 28: sendOutcomeToHostResult and sendFailureToHostResult (src/receipt/transactionReceipts.ts) are how the web host's handleSendSubmit shaped a send's outcome for the wallet (MeritWallet.tsx), now shared with the extension.
// ORACLE: that inline code as it stood, over every combination of hash / receipt shape / thrown value.
// Run: node test/hostSendResult.test.mjs     MUTANT=noHashOk|dropReceipt|extraReceiptFields|failureMessage|errorNotInstance run against broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
const m = process.env.MUTANT;
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'receipt', 'transactionReceipts.ts'), 'utf8').split(String.fromCharCode(13)).join('');
const swap = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
if (m === 'noHashOk') swap('if (sent?.hash) return {', 'if (sent) return {');
if (m === 'dropReceipt') swap('receipt: sent.receipt ? { blockNumber: sent.receipt.blockNumber, gasUsed: sent.receipt.gasUsed, status: sent.receipt.status } : null', 'receipt: null');
if (m === 'extraReceiptFields') swap('receipt: sent.receipt ? { blockNumber: sent.receipt.blockNumber, gasUsed: sent.receipt.gasUsed, status: sent.receipt.status } : null', 'receipt: sent.receipt ?? null');
if (m === 'failureMessage') swap("'The wallet reported no transaction hash.'", "'No hash.'");
if (m === 'errorNotInstance') swap("error instanceof Error ? error.message : 'The send failed.'", "(error as { message?: string })?.message ?? 'The send failed.'");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
// the file imports only the common context's constants (types and two values); stub them
new Function('module', 'exports', 'require', js)(mod, mod.exports, () => ({ MESSAGE_ACCOUNTS_MARKER: '<<A>>', STATUS: { SUCCESS: 'SUCCESS' } }));
const { sendOutcomeToHostResult, sendFailureToHostResult } = mod.exports;

// the original inline code in components/views/MeritWallet.tsx
const originalOutcome = (sent) => {
  if (sent?.hash) return { ok: true, hash: sent.hash, receipt: sent.receipt ? { blockNumber: sent.receipt.blockNumber, gasUsed: sent.receipt.gasUsed, status: sent.receipt.status } : null };
  return { ok: false, message: 'The wallet reported no transaction hash.' };
};
const originalFailure = (error) => ({ ok: false, message: error instanceof Error ? error.message : 'The send failed.' });

const receipts = [undefined, null, {}, { blockNumber: 12n, gasUsed: 21000n, status: 1 }, { blockNumber: '0xc', gasUsed: 21000, status: null }, { blockNumber: 7, gasUsed: 5n, status: 0, extra: 'x' }];
const sents = [undefined, null, {}, { hash: '' }, { hash: '0xabc' }, { hash: '0xabc', receipt: undefined }, ...receipts.map((r) => ({ hash: '0xdef', receipt: r })), { receipt: { blockNumber: 1 } }];
let n = 0; let bad = 0;
const show = (v) => JSON.stringify(v, (k, x) => (typeof x === 'bigint' ? 'n' + x : x));
for (const s of sents) { n += 1; if (show(sendOutcomeToHostResult(s)) !== show(originalOutcome(s))) { bad += 1; console.log('FAIL outcome ' + show(s)); } }
for (const e of [new Error('boom'), new TypeError('bad'), 'a string', { message: 'plain object' }, null, undefined, 42]) { n += 1; if (show(sendFailureToHostResult(e)) !== show(originalFailure(e))) { bad += 1; console.log('FAIL failure ' + show(e)); } }
console.log(bad ? `\n${bad} of ${n} FAILED` : `\nall ${n} inputs are shaped exactly as the web host did`);
process.exit(bad ? 1 : 0);
