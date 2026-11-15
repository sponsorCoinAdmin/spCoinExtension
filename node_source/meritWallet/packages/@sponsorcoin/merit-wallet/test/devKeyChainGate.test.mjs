// File: test/devKeyChainGate.test.mjs
//
// Guards docs/design/accountAuthDesign.txt section 15, item H3 (lib/server/devKeyChainGate.ts): a development key (one of Hardhat's PUBLISHED keys, marked devOrigin) may sign only where the RPC answers chain 31337.
// The gate asks each RPC URL for eth_chainId and FAILS CLOSED: a different chain, an unreachable RPC, an HTTP error and an unreadable answer are all refused; a key that is not a dev key is not probed at all;
// the answer is cached per URL. Also checks that run-script calls the gate before it resolves the key. Run: node test/devKeyChainGate.test.mjs
// MUTANT=failOpen|skipWriteRpc|noDevCheck|noCache|runScriptSkipsGate run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(path.join(WEB, 'package.json'));
const ts = req('typescript');
const m = process.env.MUTANT;

let src = fs.readFileSync(path.join(WEB, 'lib', 'server', 'devKeyChainGate.ts'), 'utf8').replace(/\r\n/g, '\n');
// a probe that fails lets the key through
if (m === 'failOpen') src = src.replace('throw new Error(`A development key may sign only on the local Hardhat chain (${DEV_KEY_CHAIN_ID}), and the chain of the RPC could not be checked', 'return; throw new Error(`x');
// only the first URL is checked (the write endpoint is the one that signs)
if (m === 'skipWriteRpc') src = src.replace('for (const url of urls) {', 'for (const url of urls.slice(0, 1)) {');
// a dev key is not recognised
if (m === 'noDevCheck') src = src.replace('if (!options.devOrigin) return;', 'return;');
// every call probes again
if (m === 'noCache') src = src.replace('if (hit && now() - hit.at < CACHE_MS) return hit.chainId;', '');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)(() => ({}), mod, mod.exports);
const { assertDevKeyOnDevChain, clearDevKeyChainCache, probeChainId } = mod.exports;

const answer = (chainHex) => async () => ({ ok: true, status: 200, json: async () => ({ jsonrpc: '2.0', id: 1, result: chainHex }) });
const counting = (impl) => { const f = async (...a) => { f.calls += 1; return impl(...a); }; f.calls = 0; return f; };

const results = [];
const test = async (name, fn) => { clearDevKeyChainCache(); try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('a key that is not a development key is not probed and not refused', async () => {
  const f = counting(answer('0x1'));
  await assertDevKeyOnDevChain({ devOrigin: false, rpcUrls: ['https://mainnet.example'], fetchImpl: f });
  await assertDevKeyOnDevChain({ devOrigin: undefined, rpcUrls: ['https://mainnet.example'], fetchImpl: f });
  assert.equal(f.calls, 0);
});
await test('a development key on an RPC that answers 31337 is allowed (read and write endpoints both checked)', async () => {
  const f = counting(answer('0x7a69'));
  await assertDevKeyOnDevChain({ devOrigin: true, rpcUrls: ['https://read.example', 'https://write.example'], fetchImpl: f });
  assert.equal(f.calls, 2);
});
await test('a development key on mainnet is refused, naming the chain', async () => {
  await assert.rejects(assertDevKeyOnDevChain({ devOrigin: true, rpcUrls: ['https://mainnet.example'], fetchImpl: answer('0x1') }), /answers chain 1\b/);
});
await test('the WRITE endpoint is checked too: a dev key with a safe read RPC and a mainnet write RPC is refused', async () => {
  const f = async (url) => (String(url).includes('write') ? answer('0x1')() : answer('0x7a69')());
  await assert.rejects(assertDevKeyOnDevChain({ devOrigin: true, rpcUrls: ['https://read.example', 'https://write.example'], fetchImpl: f }), /answers chain 1\b/);
});
await test('fail closed: an RPC that does not answer, answers an HTTP error or answers nonsense is refused', async () => {
  await assert.rejects(assertDevKeyOnDevChain({ devOrigin: true, rpcUrls: ['https://down.example'], fetchImpl: async () => { throw new Error('ECONNREFUSED'); } }), /could not be checked/);
  await assert.rejects(assertDevKeyOnDevChain({ devOrigin: true, rpcUrls: ['https://err.example'], fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }) }), /HTTP 503/);
  await assert.rejects(assertDevKeyOnDevChain({ devOrigin: true, rpcUrls: ['https://junk.example'], fetchImpl: answer('banana') }), /unreadable/);
});
await test('the answer is cached per URL (one probe for many write steps)', async () => {
  const f = counting(answer('0x7a69'));
  for (let i = 0; i < 5; i++) await assertDevKeyOnDevChain({ devOrigin: true, rpcUrls: ['https://same.example'], fetchImpl: f });
  assert.equal(f.calls, 1);
  assert.equal(await probeChainId('https://same.example', f), 31337);
});
await test('run-script calls the gate before it resolves the sender key', async () => {
  let route = fs.readFileSync(path.join(WEB, 'app', 'api', 'spCoin', 'run-script', 'route.ts'), 'utf8').replace(/\r\n/g, '\n');
  if (m === 'runScriptSkipsGate') route = route.replace(/await assertDevKeyOnDevChain\([^\n]*\n/, '');
  const gate = route.indexOf('await assertDevKeyOnDevChain({ devOrigin: senderEntry.devOrigin, rpcUrls: [rpcUrl, writeRpcUrl] });');
  const resolve = route.indexOf('const senderPrivateKey = await resolveMeritWalletSignerPrivateKey(');
  assert.ok(gate > 0, 'the gate call is missing from run-script');
  assert.ok(resolve > gate, 'the key is resolved before the gate runs');
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
