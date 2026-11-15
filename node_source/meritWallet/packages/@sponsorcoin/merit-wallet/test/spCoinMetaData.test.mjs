// File: test/spCoinMetaData.test.mjs
//
// Tests for loadSpCoinMetaData (engine src/utils/spCoinMetaData.ts): complete the active spCoin's record from the chain, save it back, and the API's metadata validation (spcoin-feeds activeSpCoinApi.ts).
// Run: node test/spCoinMetaData.test.mjs
// MUTANT=refillKnown|skipSave|newCoinKeepsOld|saveErrorHidden|apiAcceptsText run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const PKGS = path.join(HERE, '..', '..', '..', '..', '..');
const META = path.join(PKGS, 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src', 'utils', 'spCoinMetaData.ts');
const API = path.join(PKGS, 'spCoinFeeds', 'packages', '@sponsorcoin', 'spcoin-feeds', 'src', 'api');

function loadTs(file, patch) {
  let src = fs.readFileSync(file, 'utf8');
  if (patch) src = patch(src);
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  const localReq = (id) => {
    if (id === 'viem') return { parseAbi: (a) => a };
    if (id.startsWith('.')) return loadTs(path.join(path.dirname(file), id) + '.ts').exports ?? {};
    return req(id);
  };
  new Function('require', 'module', 'exports', js)(localReq, mod, mod.exports);
  return mod.exports;
}
const m = process.env.MUTANT;
const core = loadTs(META, (src) => {
  // a field that is already stored is read from the chain again
  if (m === 'refillKnown') src = src.replace('record![field] === undefined', 'true');
  // the completed record is never written back
  if (m === 'skipSave') src = src.replace('if (persist && (filled.length || address))', 'if (false)');
  // a just-deployed coin keeps the old file's fields instead of starting clean
  if (m === 'newCoinKeepsOld') src = src.replace("record = { address: address.toLowerCase() };", "record = { address: address.toLowerCase(), name: 'OLD' };");
  // a failed save is reported as saved
  if (m === 'saveErrorHidden') src = src.replace('if (response.ok) saved = true;', 'saved = true; if (false)');
  return src;
});
const { loadSpCoinMetaData, SPCOIN_META_FIELDS } = core;
const { createActiveSpCoinApi } = (() => {
  const cache = new Map();
  const load = (file) => {
    if (cache.has(file)) return cache.get(file).exports;
    let src = fs.readFileSync(file, 'utf8');
    if (m === 'apiAcceptsText' && file.endsWith('activeSpCoinApi.ts')) src = src.replace("if (typeof body[key] !== 'number' || !Number.isFinite(body[key])) return undefined;", '');
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const mod = { exports: {} };
    cache.set(file, mod);
    new Function('require', 'module', 'exports', js)((id) => (id.startsWith('.') ? load(path.join(path.dirname(file), id) + '.ts') : req(id)), mod, mod.exports);
    return mod.exports;
  };
  return load(path.join(API, 'activeSpCoinApi.ts'));
})();

const COIN = '0x8b0edfa21c0aaa8daa633f6c1685e1d4fc79a8fc';
const OWNER = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const CHAIN = { owner: OWNER, name: 'Sponsor Coin', symbol: 'spCoin', decimals: 18n, version: '0.0.1', totalSupply: 1000n * 10n ** 18n, getInflationRate: 5n, getRecipientRateRange: [20n, 100n], getAgentRateRange: [2n, 10n], getRecipientRateIncrement: 1n, getAgentRateIncrement: 1n };
const chainReader = (reads = []) => (address) => async (fn) => {
  reads.push(fn);
  const key = fn === 'getInflationRate' || fn.startsWith('getRecipient') || fn.startsWith('getAgent') ? fn : fn;
  if (!(key in CHAIN)) throw new Error('no ' + fn);
  return CHAIN[key];
};
const server = (stored) => {
  const log = { puts: [] };
  const fetchImpl = async (url, init = {}) => {
    if (init.method === 'PUT') { log.puts.push(JSON.parse(init.body)); return { ok: log.status ? log.status < 300 : true, status: log.status ?? 200, json: async () => ({}) }; }
    return stored ? { ok: true, status: 200, json: async () => stored } : { ok: false, status: 404, json: async () => ({}) };
  };
  return { fetchImpl, log };
};

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('a file with only the coin and owner is completed from the chain, every missing field, and saved', async () => {
  const { fetchImpl, log } = server({ address: COIN, owner: OWNER });
  const r = await loadSpCoinMetaData({ chainId: 31337, read: chainReader(), persist: true, getToken: async () => 't', fetchImpl });
  assert.equal(r.record.name, 'Sponsor Coin'); assert.equal(r.record.decimals, 18); assert.equal(r.record.totalSupply, (1000n * 10n ** 18n).toString());
  assert.deepEqual(r.record.recipientRateRange, [20, 100]); assert.deepEqual(r.record.agentRateRange, [2, 10]); assert.equal(r.record.inflationRate, 5);
  assert.deepEqual(r.filled.sort(), ['agentRateIncrement', 'agentRateRange', 'decimals', 'inflationRate', 'name', 'recipientRateIncrement', 'recipientRateRange', 'symbol', 'totalSupply', 'version'].sort());
  assert.equal(r.saved, true); assert.equal(log.puts.length, 1); assert.equal(log.puts[0].version, '0.0.1');
});
await test('a field already in the file is never read from the chain again', async () => {
  const reads = []; const { fetchImpl } = server({ address: COIN, owner: OWNER, name: 'Stored Name' });
  const r = await loadSpCoinMetaData({ chainId: 31337, read: chainReader(reads), fetchImpl });
  assert.equal(r.record.name, 'Stored Name'); assert.equal(reads.includes('name'), false); assert.equal(reads.includes('symbol'), true);
});
await test('without persist nothing is saved (the start-up load needs no sign-in)', async () => {
  const { fetchImpl, log } = server({ address: COIN });
  const r = await loadSpCoinMetaData({ chainId: 31337, read: chainReader(), fetchImpl });
  assert.equal(r.saved, false); assert.equal(log.puts.length, 0); assert.equal(r.record.owner, OWNER);
});
await test('a complete file needs no chain read and no save', async () => {
  const full = { address: COIN, owner: OWNER, name: 'n', symbol: 's', decimals: 18, version: '1', totalSupply: '1', inflationRate: 1, recipientRateRange: [1, 2], agentRateRange: [1, 2], recipientRateIncrement: 1, agentRateIncrement: 1 };
  const reads = []; const { fetchImpl, log } = server(full);
  const r = await loadSpCoinMetaData({ chainId: 31337, read: chainReader(reads), persist: true, getToken: async () => 't', fetchImpl });
  assert.equal(reads.length, 0); assert.equal(r.filled.length, 0); assert.equal(log.puts.length, 0);
});
await test('a field the chain cannot answer stays missing and the others are still filled', async () => {
  const { fetchImpl } = server({ address: COIN });
  const read = (a) => async (fn) => { if (fn === 'version') throw new Error('reverted'); return CHAIN[fn]; };
  const r = await loadSpCoinMetaData({ chainId: 31337, read, fetchImpl });
  assert.equal(r.record.version, undefined); assert.equal(r.record.name, 'Sponsor Coin'); assert.equal(r.filled.includes('version'), false);
});
await test('a NEW address (a deploy) starts clean: every field is read, the old file is ignored, and it is saved', async () => {
  const { fetchImpl, log } = server({ address: '0xf340045a01f11d9d7841b4dc61f1a1b7485e5e1b', name: 'OLD', owner: '0x1' });
  const r = await loadSpCoinMetaData({ chainId: 31337, address: COIN, read: chainReader(), persist: true, getToken: async () => 't', fetchImpl });
  assert.equal(r.record.address, COIN); assert.equal(r.record.name, 'Sponsor Coin'); assert.equal(r.record.owner, OWNER); assert.equal(log.puts[0].address, COIN);
});
await test('no file for the chain: no record, no reads, no save', async () => {
  const reads = []; const { fetchImpl, log } = server(undefined);
  const r = await loadSpCoinMetaData({ chainId: 1, read: chainReader(reads), persist: true, getToken: async () => 't', fetchImpl });
  assert.equal(r.record, undefined); assert.equal(reads.length, 0); assert.equal(log.puts.length, 0);
});
await test('a refused save (403) is reported, the loaded record is still returned', async () => {
  const { fetchImpl, log } = server({ address: COIN }); log.status = 403;
  const r = await loadSpCoinMetaData({ chainId: 31337, read: chainReader(), persist: true, getToken: async () => 't', fetchImpl });
  assert.equal(r.saved, false); assert.match(r.saveError, /owner/); assert.equal(r.record.name, 'Sponsor Coin');
});
await test('saving with no sign-in available is reported, not silent', async () => {
  const { fetchImpl } = server({ address: COIN });
  const r = await loadSpCoinMetaData({ chainId: 31337, read: chainReader(), persist: true, fetchImpl });
  assert.equal(r.saved, false); assert.match(r.saveError, /sign-in/);
});

// the API accepts the metadata and refuses wrong types
const OWN = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const memory = () => { const mm = new Map(); return { mm, read: async (c) => mm.get(c) ?? null, write: async (c, r) => { mm.set(c, r); } }; };
const auth = { validateBearer: () => ({ ok: true, address: OWN }), isOwnerAdmin: () => true };
const put = (api, body) => api.put({ method: 'PUT', query: {}, headers: { authorization: 'Bearer x' }, params: { chainId: '31337' }, body });
await test('API: PUT stores the metadata fields; a wrong type (decimals as text, a one-number range, a non-digit supply) is 400', async () => {
  const s = memory(); const api = createActiveSpCoinApi(s, auth);
  const ok = await put(api, { address: COIN, owner: OWNER, name: 'n', decimals: 18, totalSupply: '123', recipientRateRange: [1, 2] });
  assert.equal(ok.status, 200); assert.equal(s.mm.get(31337).totalSupply, '123'); assert.deepEqual(s.mm.get(31337).recipientRateRange, [1, 2]);
  s.mm.clear();
  for (const bad of [{ decimals: 'x' }, { recipientRateRange: [1] }, { totalSupply: '1.5' }, { name: 5 }]) assert.equal((await put(api, { address: COIN, ...bad })).status, 400, JSON.stringify(bad));
  assert.equal(s.mm.size, 0);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
