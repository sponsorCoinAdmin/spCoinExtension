// File: test/affiliateFee.test.mjs
//
// docs/design/spcoinPackagesDesign.txt 8.5.12: the affiliate fee has ONE source. The server's AFFILIATE_FEE / FEE_RECIPIENT_WALLET decide whether 0x v2 is asked for a fee (lib/server/affiliateFee.ts) and the screens disclose only what the quote
// reports as charged (fees.integratorFee.amount); no screen or host carries a fee rate of its own and NEXT_PUBLIC_AFFILIATE_FEE is read nowhere. Run: node test/affiliateFee.test.mjs
// MUTANT=v1Names|noCap|noRecipientCheck|screenRate|routeOwnFee run against deliberately broken copies and must report failures.
// (2026-10-20, docs/meritMigration.txt row 29: the web's own AffiliateFee wrapper and its Trading Station screen were deleted, so the envRead mutant and the wrapper assertions are gone; the panel and the server module are the whole of it.)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const WEB = path.join(PKG, '..', '..', '..', '..', '..');
const NS = path.join(WEB, 'node_source');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let server = read(WEB, 'lib', 'server', 'affiliateFee.ts');
let route = read(WEB, 'app', 'api', '0x', 'lib', 'apiResponse.ts');
let panel = read(NS, 'spCoinPanels', 'packages', '@sponsorcoin', 'spcoin-panels', 'src', 'AffiliateFee.tsx');
if (m === 'v1Names') server = swap(server, '&swapFeeRecipient=${config.recipient}&swapFeeBps=${config.bps}&swapFeeToken=', '&feeRecipient=${config.recipient}&AFFILIATE_FEE=${config.bps}&token=');
if (m === 'noCap') server = swap(server, 'rate > MAX_RATE || ', '');
if (m === 'noRecipientCheck') server = swap(server, ' || !ADDRESS.test(recipient)', '');
if (m === 'screenRate') panel = swap(panel, 'feeAmount?: string;', 'feeAmount?: string;\n  feeRate?: number;');
if (m === 'routeOwnFee') route = swap(route, '${affiliateFeeQuery(new URLSearchParams(query))}', '&feeRecipient=x&AFFILIATE_FEE=0');

// the server module, compiled and run
const ts = createRequire(import.meta.url)('typescript');
const js = ts.transpileModule(server, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', 'process', js)(mod, mod.exports, { env: {} });
const { affiliateFeeConfig, affiliateFeeQuery } = mod.exports;
const RECIPIENT = '0x75A94931B81d81C7a62b76DC0FcFAC77FbE1e917';

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('no fee unless the server is configured with a sane rate and a real recipient', () => {
  for (const env of [{}, { AFFILIATE_FEE: '0', FEE_RECIPIENT_WALLET: RECIPIENT }, { AFFILIATE_FEE: '0.001' }, { AFFILIATE_FEE: '0.001', FEE_RECIPIENT_WALLET: 'nope' }, { AFFILIATE_FEE: 'abc', FEE_RECIPIENT_WALLET: RECIPIENT }, { AFFILIATE_FEE: '-1', FEE_RECIPIENT_WALLET: RECIPIENT }, { AFFILIATE_FEE: '1', FEE_RECIPIENT_WALLET: RECIPIENT }]) {
    assert.equal(affiliateFeeConfig(env), undefined, JSON.stringify(env));
  }
});
await test('a configured fee becomes 0x v2 swap fee parameters in basis points on the buy token', () => {
  assert.deepEqual(affiliateFeeConfig({ AFFILIATE_FEE: '0.001', FEE_RECIPIENT_WALLET: RECIPIENT }), { bps: 10, recipient: RECIPIENT });
  const q = affiliateFeeQuery(new URLSearchParams('sellToken=0xA&buyToken=0xB&sellAmount=1'), { bps: 10, recipient: RECIPIENT });
  assert.equal(q, `&swapFeeRecipient=${RECIPIENT}&swapFeeBps=10&swapFeeToken=0xB`);
  assert.equal(affiliateFeeQuery(new URLSearchParams('sellToken=0xA'), { bps: 10, recipient: RECIPIENT }), '');
  assert.equal(affiliateFeeQuery(new URLSearchParams('buyToken=0xB'), undefined), '');
});
await test('the route takes the fee from that one module and from nowhere else', () => {
  assert.match(route, /\$\{affiliateFeeQuery\(new URLSearchParams\(query\)\)\}/);
  assert.doesNotMatch(route, /AFFILIATE_FEE|FEE_RECIPIENT/);
});
await test('the screens disclose the fee the quote reports as charged and carry no rate of their own', () => {
  assert.match(panel, /feeAmount\?: string;/);
  assert.doesNotMatch(panel, /feeRate/);
  assert.doesNotMatch(panel, /process\.env/);
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
