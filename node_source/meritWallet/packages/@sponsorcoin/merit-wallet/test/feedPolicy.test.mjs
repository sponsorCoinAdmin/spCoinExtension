// File: test/feedPolicy.test.mjs
//
// Tests for the feeds' network policy (spcoin-feeds src/shared/fetchJson.ts, docs/nodeSourceMigrationPlan.txt row 25, owner: "no dependency on the web app"): the default is today's behaviour (network first, bundled only as the fallback);
// { bundledFirst: true, hostedAllowed: false } is the extension's: a bundled path is answered with NO request and an unbundled path never reaches the hosted app. Run: node test/feedPolicy.test.mjs
// MUTANT=bundledFirstIgnored|hostedAllowedIgnored|orNullThrows|iconNoGuard|localAssetsOpen run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const FEEDS = path.join(HERE, '..', '..', '..', '..', '..', 'spCoinFeeds', 'packages', '@sponsorcoin', 'spcoin-feeds', 'src');
const m = process.env.MUTANT;
let src = fs.readFileSync(path.join(FEEDS, 'shared', 'fetchJson.ts'), 'utf8').replace(/\r\n/g, '\n');
if (m === 'bundledFirstIgnored') src = src.split('if (feedPolicy.bundledFirst) {').join('if (false) {');
if (m === 'hostedAllowedIgnored') src = src.replace("if (!feedPolicy.hostedAllowed) throw new FeedFetchError(`${path} is not bundled", "if (false) throw new FeedFetchError(`${path} is not bundled");
if (m === 'localAssetsOpen') src = src.replace("(url.startsWith('/assets/blockchains/') || url.startsWith('/assets/accounts/'))", 'true');
if (m === 'orNullThrows') src = src.replace('if (!feedPolicy.hostedAllowed) return null;', "if (!feedPolicy.hostedAllowed) throw new Error('x');");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
const calls = [];
globalThis.fetch = async (url) => { calls.push(String(url)); return { ok: true, status: 200, json: async () => ({ from: 'network', url }) }; };
// fetchJson.ts also imports the in-process API registry (./localApi, migration part 2 row 4); load that sibling source the same way
const localMod = { exports: {} };
const localJs = ts.transpileModule(fs.readFileSync(path.join(FEEDS, 'shared', 'localApi.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
new Function('require', 'module', 'exports', localJs)((id) => req(id), localMod, localMod.exports);
new Function('require', 'module', 'exports', js)((id) => (id === './localApi' ? localMod.exports : req(id)), mod, mod.exports);
const { fetchJson, fetchJsonOrNull, registerBundledFeeds, getBundledFeed, setFeedNetworkPolicy, getFeedNetworkPolicy, assertHostedAllowed, FeedFetchError } = mod.exports;

const results = [];
const test = async (name, fn) => { calls.length = 0; try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
registerBundledFeeds({ '/assets/a.json': { from: 'bundle' }, '/assets/accounts/0xabc/account.json': { name: 'Abc' } });

await test('default policy: the network is asked first and wins; the bundle answers only when the network fails', async () => {
  setFeedNetworkPolicy({});
  assert.deepEqual(getFeedNetworkPolicy(), { bundledFirst: false, hostedAllowed: true, localAssets: false });
  assert.equal((await fetchJson('/assets/a.json', { baseUrl: 'http://web' })).from, 'network');
  assert.deepEqual(calls, ['http://web/assets/a.json']);
  const saved = globalThis.fetch; globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal((await fetchJson('/assets/a.json', { baseUrl: 'http://web' })).from, 'bundle');
  globalThis.fetch = saved;
});
await test('bundledFirst: a bundled path is answered from the bundle with NO request', async () => {
  setFeedNetworkPolicy({ bundledFirst: true });
  assert.equal((await fetchJson('/assets/a.json', { baseUrl: 'http://web' })).from, 'bundle');
  assert.equal((await fetchJsonOrNull('/assets/a.json?v=2', { baseUrl: 'http://web' })).from, 'bundle');
  assert.deepEqual(calls, []);
  assert.equal((await fetchJson('/assets/other.json', { baseUrl: 'http://web' })).from, 'network');
  assert.equal(calls.length, 1);
});
await test('hostedAllowed false: an unbundled path makes no request (fetchJson throws, fetchJsonOrNull gives null); a bundled one still answers', async () => {
  setFeedNetworkPolicy({ bundledFirst: true, hostedAllowed: false });
  await assert.rejects(fetchJson('/assets/other.json', { baseUrl: 'http://web' }), (e) => e instanceof FeedFetchError && e.status === 0);
  assert.equal(await fetchJsonOrNull('/assets/other.json', { baseUrl: 'http://web' }), null);
  assert.equal((await fetchJson('/assets/a.json')).from, 'bundle');
  assert.deepEqual(calls, []);
});
await test('bundled account profiles are found whatever case the address is in', async () => {
  setFeedNetworkPolicy({ bundledFirst: true, hostedAllowed: false });
  assert.equal((await fetchJsonOrNull('/assets/accounts/0xABC/account.json')).name, 'Abc');
  assert.equal((await fetchJsonOrNull('/assets/accounts/0XAbC/account.json?x=1')).name, 'Abc');
  assert.equal(await fetchJsonOrNull('/assets/accounts/0xdef/account.json'), null);
});
await test('getBundledFeed returns the bundled value (query ignored, account paths without regard to case) or undefined', async () => {
  assert.deepEqual(getBundledFeed('/assets/a.json?v=1'), { from: 'bundle' });
  assert.equal(getBundledFeed('/assets/accounts/0XABC/account.json').name, 'Abc');
  assert.equal(getBundledFeed('/assets/nope.json'), undefined);
});
await test('assertHostedAllowed (used by the icon fetchers): silent when allowed, throws without a request when not', async () => {
  setFeedNetworkPolicy({});
  assertHostedAllowed('http://web/x.png');
  setFeedNetworkPolicy({ hostedAllowed: false });
  assert.throws(() => assertHostedAllowed('http://web/x.png'), (e) => e instanceof FeedFetchError);
  assert.deepEqual(calls, []);
});
await test('localAssets: only the shipped image paths (/assets/blockchains/, /assets/accounts/) pass the icon guard when the hosted app is off; other paths still do not', async () => {
  setFeedNetworkPolicy({ bundledFirst: true, hostedAllowed: false, localAssets: true });
  assertHostedAllowed('/assets/blockchains/8453/contracts/0XABC/logo.png');
  assertHostedAllowed('/assets/accounts/0XABC/avatar.png');
  assert.throws(() => assertHostedAllowed('/assets/ABIs/spCoin/V_1.json'), (e) => e instanceof FeedFetchError);
  assert.throws(() => assertHostedAllowed('http://web/assets/blockchains/1/logo.png'), (e) => e instanceof FeedFetchError);
  setFeedNetworkPolicy({ bundledFirst: true, hostedAllowed: false });
  assert.throws(() => assertHostedAllowed('/assets/blockchains/8453/logo.png'), (e) => e instanceof FeedFetchError);
});

await test('the three icon fetchers call assertHostedAllowed before any fetch', async () => {
  for (const f of ['accounts/accountIcons.ts', 'networks/networkIcons.ts', 'tokens/tokenIcons.ts']) {
    let text = fs.readFileSync(path.join(FEEDS, f), 'utf8').replace(/\r\n/g, '\n');
    if (m === 'iconNoGuard' && f.startsWith('tokens')) text = text.replace('assertHostedAllowed(url);\n', '');
    const guard = text.indexOf('assertHostedAllowed(url);');
    const fetchAt = text.indexOf('await fetch(url)');
    assert.ok(guard > 0 && guard < fetchAt, `${f}: no guard before the fetch`);
  }
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
