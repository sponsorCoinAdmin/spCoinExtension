// File: test/quoteCache.test.mjs
//
// Tests for the engine's keyed quote cache (spcoin-exchange-engine src/utils/quoteCache.ts). Run: node test/quoteCache.test.mjs
// MUTANT=noDedupe / noExpire / cacheFailure run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', '..', '..', '..', '..', 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src', 'utils', 'quoteCache.ts'), 'utf8');
if (process.env.MUTANT === 'noDedupe') src = src.replace('if (existing) return existing;', '');
if (process.env.MUTANT === 'noExpire') src = src.split('now() - entry.at < ttlMs').join('true');
if (process.env.MUTANT === 'cacheFailure') src = src.replace('const promise = load()', 'const promise = load().catch((e) => { values.set(key, { value: undefined, at: now() }); throw e; })');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', js)(req, m, m.exports);
const { createQuoteCache } = m.exports;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('two callers of one key share one load', async () => {
  const c = createQuoteCache(1000, () => 0);
  let calls = 0;
  const load = async () => { calls++; await new Promise((r) => setTimeout(r, 5)); return 7; };
  const [a, b] = await Promise.all([c.get('k', load), c.get('k', load)]);
  assert.deepEqual([a, b, calls], [7, 7, 1]);
});
await test('a fresh value is answered from memory', async () => {
  let t = 0; const c = createQuoteCache(1000, () => t);
  let calls = 0; const load = async () => ++calls;
  await c.get('k', load); t = 999; assert.equal(await c.get('k', load), 1); assert.equal(c.peek('k'), 1);
});
await test('an expired value is loaded again', async () => {
  let t = 0; const c = createQuoteCache(1000, () => t);
  let calls = 0; const load = async () => ++calls;
  await c.get('k', load); t = 1000; assert.equal(await c.get('k', load), 2); 
});
await test('different keys do not share', async () => {
  const c = createQuoteCache(1000, () => 0);
  assert.equal(await c.get('a', async () => 1), 1); assert.equal(await c.get('b', async () => 2), 2);
});
await test('a failure is not remembered', async () => {
  const c = createQuoteCache(1000, () => 0);
  await assert.rejects(c.get('k', async () => { throw new Error('boom'); }), /boom/);
  assert.equal(c.peek('k'), undefined);
  assert.equal(await c.get('k', async () => 5), 5);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
