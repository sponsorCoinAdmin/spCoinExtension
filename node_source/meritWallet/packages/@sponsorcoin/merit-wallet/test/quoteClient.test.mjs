// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/quoteClient.test.mjs
// Tests for the swap-quote client (src/swap/quoteClient.ts). Run: node test/quoteClient.test.mjs
// MUTANT=dropTaker runs against a broken copy and must report a failure.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'swap', 'quoteClient.ts'), 'utf8');
if (process.env.MUTANT === 'dropTaker') src = src.split("if (request.taker) params.set('taker', request.taker);").join('');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', js)(req, m, m.exports);
const { createQuoteClient, QuoteServiceError } = m.exports;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const T1 = '0x' + '11'.repeat(20), T2 = '0x' + '22'.repeat(20), ME = '0x' + '33'.repeat(20);

await test('price and quote call the right path with only the given parameters, and return the body', async () => {
  const seen = [];
  const c = createQuoteClient({ baseUrl: 'https://quotes.example/', fetchImpl: async (u) => { seen.push(u); return { ok: true, status: 200, json: async () => ({ buyAmount: '9' }) }; } });
  assert.deepEqual(await c.getPrice({ chainId: 1, sellToken: T1, buyToken: T2, sellAmount: '100' }), { buyAmount: '9' });
  await c.getQuote({ chainId: 1, sellToken: T1, buyToken: T2, sellAmount: '100', taker: ME, slippageBps: 50 });
  const p = new URL(seen[0]), q = new URL(seen[1]);
  assert.equal(p.origin + p.pathname, 'https://quotes.example/price'); assert.equal(p.searchParams.get('taker'), null); assert.equal(p.searchParams.get('sellAmount'), '100');
  assert.equal(q.pathname, '/quote'); assert.equal(q.searchParams.get('taker'), ME); assert.equal(q.searchParams.get('slippageBps'), '50');
});

await test('service errors carry the status and code; an unreachable service is status 0', async () => {
  const c = createQuoteClient({ baseUrl: 'https://q', fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: 'RATE_LIMITED' }) }) });
  await assert.rejects(c.getPrice({ chainId: 1, sellToken: T1, buyToken: T2, sellAmount: '1' }), (e) => e instanceof QuoteServiceError && e.status === 429 && e.code === 'RATE_LIMITED');
  const down = createQuoteClient({ baseUrl: 'https://q', fetchImpl: async () => { throw new Error('offline'); } });
  await assert.rejects(down.getPrice({ chainId: 1, sellToken: T1, buyToken: T2, sellAmount: '1' }), (e) => e.status === 0 && /offline/.test(e.message));
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
