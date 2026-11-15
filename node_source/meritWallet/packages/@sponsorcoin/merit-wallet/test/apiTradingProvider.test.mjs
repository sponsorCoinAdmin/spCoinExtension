// File: test/apiTradingProvider.test.mjs
//
// Tests for the trading-provider store (engine src/stores/apiTradingProviderStore.ts): the saved choice is read once, a set is saved and announced, a bad saved value falls back to the default.
// Run: node test/apiTradingProvider.test.mjs
// MUTANT=noSave|badValueAccepted|alwaysNotify|wrongKey run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const FILE = path.join(HERE, '..', '..', '..', '..', '..', 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src', 'stores', 'apiTradingProviderStore.ts');

function load(storage) {
  let src = fs.readFileSync(FILE, 'utf8');
  const m = process.env.MUTANT;
  // a choice is never written to storage
  if (m === 'noSave') src = src.replace('lsSetRaw(API_TRADING_PROVIDER_LS_KEY, next);', '');
  // any saved text is accepted as the provider
  if (m === 'badValueAccepted') src = src.replace('if (raw && isApiTradingProvider(raw)) state = raw;', 'if (raw) state = raw as never;');
  // listeners are told even when nothing changed
  if (m === 'alwaysNotify') src = src.replace('if (state === next) return;', '');
  // a different storage key than before: a saved choice would be lost by the move
  if (m === 'wrongKey') src = src.replace("'spcoin-merit-api-trading-provider'", "'spcoin-api-provider'");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  const stubs = {
    react: { useSyncExternalStore: () => undefined, useCallback: (f) => f },
    '../storage/localStorageCache': { lsGetRaw: (k) => storage.get(k) ?? null, lsSetRaw: (k, v) => { storage.set(k, v); } },
  };
  globalThis.window = {};
  new Function('require', 'module', 'exports', js)((id) => stubs[id], mod, mod.exports);
  return mod.exports;
}

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const KEY = 'spcoin-merit-api-trading-provider';

await test('with nothing saved the provider is 0x', () => {
  const { apiTradingProviderStore } = load(new Map());
  assert.equal(apiTradingProviderStore.get(), 'API_0X');
});
await test('a saved provider is read under the same key as before the move', () => {
  const { apiTradingProviderStore } = load(new Map([[KEY, 'UNISWAP']]));
  assert.equal(apiTradingProviderStore.get(), 'UNISWAP');
});
await test('a saved value that is not a provider falls back to 0x', () => {
  const { apiTradingProviderStore } = load(new Map([[KEY, 'something else']]));
  assert.equal(apiTradingProviderStore.get(), 'API_0X');
});
await test('a set is saved, read back, and announced once', () => {
  const storage = new Map();
  const { apiTradingProviderStore } = load(storage);
  let calls = 0;
  apiTradingProviderStore.subscribe(() => { calls += 1; });
  apiTradingProviderStore.set('API_1INCH');
  assert.equal(apiTradingProviderStore.get(), 'API_1INCH');
  assert.equal(storage.get(KEY), 'API_1INCH');
  assert.equal(calls, 1);
});
await test('setting the same provider again announces nothing', () => {
  const { apiTradingProviderStore } = load(new Map([[KEY, 'UNISWAP']]));
  let calls = 0;
  apiTradingProviderStore.subscribe(() => { calls += 1; });
  apiTradingProviderStore.set('UNISWAP');
  assert.equal(calls, 0);
});
await test('an unsubscribed listener is not called', () => {
  const { apiTradingProviderStore } = load(new Map());
  let calls = 0;
  const off = apiTradingProviderStore.subscribe(() => { calls += 1; });
  off();
  apiTradingProviderStore.set('UNISWAP');
  assert.equal(calls, 0);
});
await test('isApiTradingProvider accepts the three providers and nothing else', () => {
  const { isApiTradingProvider } = load(new Map());
  for (const ok of ['API_0X', 'API_1INCH', 'UNISWAP']) assert.equal(isApiTradingProvider(ok), true);
  for (const bad of ['', 'api_0x', undefined, 5, null]) assert.equal(isApiTradingProvider(bad), false);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
