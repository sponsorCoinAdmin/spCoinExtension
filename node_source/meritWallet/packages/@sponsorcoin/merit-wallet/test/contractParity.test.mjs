// File: test/contractParity.test.mjs
//
// Contract parity for the two ExchangeContext providers (docs/nodeSourceMigrationPlan.txt row 3). Both the web app's ExchangeProvider and the engine's LiteExchangeProvider must build the value they mount on
// ExchangeContextState with the engine's createExchangeContextValue(), so they cannot drift. This checks (1) the builder's behaviour, (2) that both providers pass every member of the contract's key list to it,
// and (3) that neither builds the value inline any more. Run: node test/contractParity.test.mjs   MUTANT=dropMember|inlineValue runs against broken copies and must fail.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const ENGINE = path.join(HERE, '..', '..', '..', '..', '..', 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src');
const WEB_PROVIDER = path.join(HERE, '..', '..', '..', '..', '..', '..', 'lib', 'context', 'ExchangeProvider.tsx');

const contractSrc = fs.readFileSync(path.join(ENGINE, 'exchangeContextContract.ts'), 'utf8');
const js = ts.transpileModule(contractSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', js)((id) => (id === 'react' ? { createContext: () => ({}) } : req(id)), m, m.exports);
const { createExchangeContextValue, EXCHANGE_CONTEXT_VALUE_KEYS } = m.exports;

const liteExists = fs.existsSync(path.join(ENGINE, 'liteProvider.tsx'));
let lite = '';
let web = fs.readFileSync(path.join(ENGINE, 'exchangeProviderCore.tsx'), 'utf8');
const webShell = fs.readFileSync(WEB_PROVIDER, 'utf8');
if (process.env.MUTANT === 'dropMember') web = web.replace('        setAppChainId,\n        errorMessage,', '        errorMessage,');
if (process.env.MUTANT === 'inlineValue') web = web.replace('value={createExchangeContextValue({', 'value={({');

const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

const callBlock = (src) => {
  const i = src.indexOf('createExchangeContextValue({');
  assert.ok(i >= 0, 'provider does not call createExchangeContextValue');
  return src.slice(i, src.indexOf('})', i));
};

test('the key list is the full contract (17 members)', () => assert.equal(EXCHANGE_CONTEXT_VALUE_KEYS.length, 17));
test('the builder returns every member, folds errorMessage into exchangeContext, and does not mutate its input', () => {
  const fn = () => {};
  const parts = Object.fromEntries(EXCHANGE_CONTEXT_VALUE_KEYS.map((k) => [k, fn]));
  parts.exchangeContext = { a: 1 }; parts.errorMessage = { msg: 'x' };
  const v = createExchangeContextValue(parts);
  assert.deepEqual(Object.keys(v).sort(), [...EXCHANGE_CONTEXT_VALUE_KEYS].sort());
  assert.deepEqual(v.exchangeContext, { a: 1, errorMessage: { msg: 'x' } });
  assert.deepEqual(parts.exchangeContext, { a: 1 });
});
for (const [name, src] of [['ExchangeProviderCore (the one provider)', web]]) {
  test(`${name} builds its value with createExchangeContextValue and passes every contract member`, () => {
    const block = callBlock(src);
    for (const k of EXCHANGE_CONTEXT_VALUE_KEYS) assert.match(block, new RegExp("(^|[^A-Za-z0-9_])" + k + "([^A-Za-z0-9_]|$)"), `${name} does not pass ${k}`);
  });
  test(`${name} no longer assembles the value inline`, () => assert.ok(!/value=\{\{/.test(src.slice(src.indexOf('ExchangeContextState.Provider'))), 'inline value={{ found'));
}

test('there is ONE provider implementation: the extension smaller LiteExchangeProvider is gone', () => assert.ok(!liteExists, 'liteProvider.tsx is back'));
test('the web ExchangeProvider is a thin shell over ExchangeProviderCore (no state logic of its own)', () => {
  const shell = process.env.MUTANT === 'fatShell' ? webShell + String.fromCharCode(10) + 'useState(); useEffect();' : webShell;
  assert.ok(shell.includes('<ExchangeProviderCore'), 'the web provider does not mount ExchangeProviderCore');
  assert.ok(!/use(State|Effect|Callback)[(]/.test(shell), 'the web provider has state logic of its own again');
  assert.ok(shell.split(String.fromCharCode(10)).length < 160, 'the web provider shell grew past 160 lines');
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
