// File: test/spCoinRegistry.test.mjs
//
// Tests for the engine's spCoin registry (src/utils/spCoinCoreUtils.ts), run against the engine's built dist. Run: node test/spCoinRegistry.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const UTILS = path.join(HERE, '..', '..', '..', '..', '..', 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src', 'utils');
// Tiny loader: transpile the engine's .ts files on demand (their imports are extensionless relative paths plus viem and type-only imports).
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  const localReq = (id) => (id.startsWith('.') ? load(path.join(path.dirname(file), id) + '.ts') : req(id));
  new Function('require', 'module', 'exports', js)(localReq, mod, mod.exports);
  return mod.exports;
}
const m = load(path.join(UTILS, 'spCoinCoreUtils.ts'));
const A = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const B = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('empty registry recognises nothing', () => assert.equal(m.isSpCoin({ address: A, chainId: 31337 }), false));
await test('a loaded deployment map is recognised (nested, any case)', () => {
  m.loadSpCoinDeploymentMap({ chainId: { 31337: { SPCOIN: { [A.toLowerCase()]: { name: 'x' } } } } });
  assert.equal(m.isSpCoin({ address: A, chainId: 31337 }), true);
  assert.equal(m.isSpCoin({ address: B, chainId: 31337 }), false);
});
await test('another chain does not match', () => assert.equal(m.isSpCoin({ address: A, chainId: 1 }), false));
await test('register / unregister at runtime', () => {
  m.registerSpCoinAddress(31337, B);
  assert.equal(m.isSpCoin({ address: B, chainId: 31337 }), true);
  assert.equal(m.getPreferredSpCoinContractAddress(31337), B);
  m.unregisterSpCoinAddress(31337, B);
  assert.equal(m.isSpCoin({ address: B, chainId: 31337 }), false);
  assert.equal(m.getPreferredSpCoinContractAddress(31337), A);
});
await test('a trade token wins over the map', () => assert.equal(m.getPreferredSpCoinContractAddress(31337, { zeroXbuyTokenContract: { address: A, chainId: 31337 } }), A));
await test('decimal shift', () => assert.equal(m.bigIntDecimalShift(5n, 3), 5000n));

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
