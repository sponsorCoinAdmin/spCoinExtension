// File: test/balanceReader.test.mjs
//
// docs/meritMigration.txt row 27: createBalanceReader (src/balance/createBalanceReader.ts), the one balance reader for the web app and the extension. Runs it against a fake client that records every call.
// Run: node test/balanceReader.test.mjs
// MUTANT=noCodeCheck|noLowerCase|noClient run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'balance', 'createBalanceReader.ts'), 'utf8').split(String.fromCharCode(13)).join('');
const m = process.env.MUTANT;
if (m === 'noCodeCheck') src = src.replace("if (!code || code === '0x') return 0n;", '');
if (m === 'noLowerCase') src = src.replace("'0x' + value.slice(2).toLowerCase()", 'value');
if (m === 'noClient') src = src.replace('if (!client) return undefined;', '');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)(() => ({ erc20Abi: ['erc20'] }), mod, mod.exports);
const { createBalanceReader } = mod.exports;

const TOKEN = '0xAbCdEf0123456789aBcDeF0123456789AbCdEf01';
const ACCOUNT = '0xF39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const fake = (over = {}) => {
  const calls = [];
  return { calls, client: { getBalance: async (a) => { calls.push(['getBalance', a.address]); return 11n; }, getCode: async (a) => { calls.push(['getCode', a.address]); return over.code === undefined ? '0x6080' : over.code; }, readContract: async (a) => { calls.push(['readContract', a.address, a.functionName, a.args[0]]); return 22n; } } };
};
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the native balance: no token address means getBalance of the lower-case account', async () => {
  const f = fake();
  assert.equal(await createBalanceReader(() => f.client)({ accountAddress: ACCOUNT }), 11n);
  assert.deepEqual(f.calls, [['getBalance', ACCOUNT.toLowerCase()]]);
});
await test('a token with contract code: balanceOf of the lower-case account on the lower-case token', async () => {
  const f = fake();
  assert.equal(await createBalanceReader(() => f.client)({ tokenAddress: TOKEN, accountAddress: ACCOUNT }), 22n);
  assert.deepEqual(f.calls, [['getCode', TOKEN.toLowerCase()], ['readContract', TOKEN.toLowerCase(), 'balanceOf', ACCOUNT.toLowerCase()]]);
});
await test('a token with no code on this chain holds nothing here: 0, and balanceOf is never called', async () => {
  for (const code of ['0x', undefined === 1 ? 0 : '', null]) {
    const f = fake({ code });
    assert.equal(await createBalanceReader(() => f.client)({ tokenAddress: TOKEN, accountAddress: ACCOUNT }), 0n);
    assert.equal(f.calls.some((c) => c[0] === 'readContract'), false);
  }
});
await test('a host with no client for the chain: the balance is unavailable, nothing is called', async () => {
  assert.equal(await createBalanceReader(() => undefined)({ accountAddress: ACCOUNT }), undefined);
  assert.equal(await createBalanceReader(() => undefined)({ tokenAddress: TOKEN, accountAddress: ACCOUNT }), undefined);
});
await test('the client is asked for on every read (the active chain can change between reads)', async () => {
  let asked = 0; const f = fake();
  const read = createBalanceReader(() => { asked += 1; return f.client; });
  await read({ accountAddress: ACCOUNT }); await read({ accountAddress: ACCOUNT });
  assert.equal(asked, 2);
});
await test('an address that is not a 40-hex address passes through unchanged (a bad input is the client\'s error, not rewritten here)', async () => {
  const f = fake();
  await createBalanceReader(() => f.client)({ accountAddress: 'not-an-address' });
  assert.deepEqual(f.calls, [['getBalance', 'not-an-address']]);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
