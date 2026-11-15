// File: test/serverActiveSpCoin.test.mjs
//
// Tests for the start-up read of the active server spCoin (engine src/hooks/trade/useServerActiveSpCoin.ts, fetchServerActiveSpCoin). Run: node test/serverActiveSpCoin.test.mjs
// MUTANT=noAddressCheck|badStatus|wrongUrl run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', '..', '..', '..', '..', 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src', 'hooks', 'trade', 'useServerActiveSpCoin.ts'), 'utf8');
const m = process.env.MUTANT;
if (m === 'noAddressCheck') src = src.replace('!isAddress(record.address)', 'false');
if (m === 'badStatus') src = src.replace('if (!response.ok) return undefined;', '');
if (m === 'wrongUrl') src = src.replace('networks/${chainId}/', 'networks/8453/');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
const metaFile = path.join(path.dirname(path.join(HERE, '..', '..', '..', '..', '..', 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src', 'hooks', 'trade', 'useServerActiveSpCoin.ts')), '..', '..', 'utils', 'spCoinMetaData.ts');
const metaMod = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(metaFile, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)((id) => (id === 'viem' ? { parseAbi: (x) => x } : {}), metaMod, metaMod.exports);
// the in-process API (docs/meritMigration.txt row 27): what a host with no server registers; undefined means no local answer for the route
let localAnswer;
const stub = (id) => id.endsWith('api/localApi') ? { localGetJson: async (route) => { localAnswer && (localAnswer.asked = route); return localAnswer && localAnswer.result; } } : id.endsWith('utils/spCoinMetaData') ? metaMod.exports : (id === 'react' ? { useEffect() {}, useRef() {} } : id.endsWith('utils/address') ? { isAddress: (a) => /^0x[0-9a-fA-F]{40}$/.test(a) } : {});
new Function('require', 'module', 'exports', js)(stub, mod, mod.exports);
const { fetchServerActiveSpCoin, fetchServerActiveSpCoinRecord } = mod.exports;

const ADDR = '0x0e9166c03194e40ee84532e9a659abce40ab1724';
const reply = (status, body) => async (url) => { reply.last = url; return { ok: status >= 200 && status < 300, status, json: async () => body }; };
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('a saved address is returned, asked for the REAL chain id, on the given base url', async () => {
  assert.equal(await fetchServerActiveSpCoin(31337, 'http://localhost:3000/', reply(200, { address: ADDR })), ADDR);
  assert.equal(reply.last, 'http://localhost:3000/api/spCoin/lab/networks/31337/activeSpCoin');
  assert.deepEqual(await fetchServerActiveSpCoinRecord(31337, '', reply(200, { address: ADDR, owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' })), { address: ADDR, owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' });
});
await test('nothing saved (404) means no default, not an error', async () => {
  assert.equal(await fetchServerActiveSpCoin(31337, '', reply(404, { error: 'none', address: ADDR })), undefined);
});
await test('a malformed address from the server is ignored', async () => {
  assert.equal(await fetchServerActiveSpCoin(31337, '', reply(200, { address: '0x12' })), undefined);
  assert.equal(await fetchServerActiveSpCoin(31337, '', reply(200, {})), undefined);
});
await test('an unreachable server or a bad chain id is no default', async () => {
  assert.equal(await fetchServerActiveSpCoin(31337, '', async () => { throw new Error('offline'); }), undefined);
  assert.equal(await fetchServerActiveSpCoin(0, '', reply(200, { address: ADDR })), undefined);
});
await test('a host with an in-process answer for the route is asked FIRST, and the network is not touched', async () => {
  localAnswer = { result: { value: { address: ADDR } } };
  let fetched = false;
  assert.equal(await fetchServerActiveSpCoin(31337, 'http://nowhere', async () => { fetched = true; return { ok: false, status: 500, json: async () => ({}) }; }), ADDR);
  assert.equal(fetched, false);
  assert.equal(localAnswer.asked, '/api/spCoin/lab/networks/31337/activeSpCoin');
  localAnswer = undefined;
});
await test('the in-process answer is checked the same way: a malformed address, or a non-2xx answer, is no default and does not fall through to the network', async () => {
  let fetched = false;
  const net = async () => { fetched = true; return { ok: true, status: 200, json: async () => ({ address: ADDR }) }; };
  localAnswer = { result: { value: { address: '0x12' } } };
  assert.equal(await fetchServerActiveSpCoin(31337, '', net), undefined);
  localAnswer = { result: { status: 404 } };
  assert.equal(await fetchServerActiveSpCoin(31337, '', net), undefined);
  assert.equal(fetched, false);
  localAnswer = undefined;
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
