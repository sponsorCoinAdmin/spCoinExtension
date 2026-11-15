// File: test/activeSpCoinApi.test.mjs
//
// Tests for the hosted API's active server spCoin (spcoin-feeds src/api/activeSpCoinApi.ts) against an in-memory store and auth. Run: node test/activeSpCoinApi.test.mjs
// MUTANT=openWrite|noChainCheck|badAddress|mappedChain|ownerRuleOff|firstWriteOpen run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const API = path.join(HERE, '..', '..', '..', '..', '..', 'spCoinFeeds', 'packages', '@sponsorcoin', 'spcoin-feeds', 'src', 'api');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  let src = fs.readFileSync(file, 'utf8');
  if (file.endsWith('activeSpCoinApi.ts')) {
    const m = process.env.MUTANT;
    // anyone with a session (not only the owner / admin) can change the server default
    if (m === 'openWrite') src = src.replace('if (!allowed) return json(403', 'if (false) return json(403');
    // the owner recorded for the chain is not allowed to update it any more / anyone may create the first record
    if (m === 'ownerRuleOff') src = src.replace('existing?.owner ? normalizeHexAddress(existing.owner) === caller', 'false ? false');
    if (m === 'firstWriteOpen') src = src.replace('!existing && claimedOwner === caller', '!existing');
    // a non-numeric chain id is accepted
    if (m === 'noChainCheck') src = src.replace("if (!/^\\d{1,10}$/.test(text)) return undefined;", '');
    // a malformed address is stored
    if (m === 'badAddress') src = src.replace('!isHexAddress(body.address)', 'false');
    // the chain id is remapped (Hardhat 31337 stored under 8453), mixing two different chains
    if (m === 'mappedChain') src = src.replace('chainId, updatedAt: now()', 'chainId: chainId === 31337 ? 8453 : chainId, updatedAt: now()');
  }
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  const localReq = (id) => (id.startsWith('.') ? load(path.join(path.dirname(file), id) + '.ts') : req(id));
  new Function('require', 'module', 'exports', js)(localReq, mod, mod.exports);
  return mod.exports;
}
const { createActiveSpCoinApi } = load(path.join(API, 'activeSpCoinApi.ts'));

const OWNER = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const USER = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
const SPCOIN = '0x0E9166c03194E40eE84532e9A659abcE40ab1724';
const store = () => {
  const m = new Map();
  return { m, read: async (c) => m.get(c) ?? null, write: async (c, r) => { m.set(c, r); } };
};
const auth = { validateBearer: (t) => (t === 'owner' ? { ok: true, address: OWNER } : t === 'user' ? { ok: true, address: USER } : { ok: false, error: 'bad token' }), isOwnerAdmin: (a) => a.toLowerCase() === OWNER };
const rq = (o) => ({ method: 'GET', query: {}, headers: {}, params: {}, ...o });
const bearer = (t) => ({ authorization: `Bearer ${t}` });
const fixedNow = () => new Date('2026-10-10T12:00:00.000Z');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('GET with nothing saved is a 404 that names the chain', async () => {
  const api = createActiveSpCoinApi(store(), auth, fixedNow);
  const r = await api.get(rq({ params: { chainId: '31337' } }));
  assert.equal(r.status, 404); assert.equal(r.body.chainId, 31337);
});
await test('PUT by the owner saves the lower-cased address for that chain, with who and when; GET reads it back', async () => {
  const s = store(); const api = createActiveSpCoinApi(s, auth, fixedNow);
  const put = await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, headers: bearer('owner'), body: { address: SPCOIN } }));
  assert.equal(put.status, 200); assert.equal(put.body.address, SPCOIN.toLowerCase());
  const got = await api.get(rq({ params: { chainId: '31337' } }));
  assert.deepEqual(got.body, { address: SPCOIN.toLowerCase(), chainId: 31337, updatedAt: '2026-10-10T12:00:00.000Z', updatedBy: OWNER });
});
await test('each chain keeps its own value (the real chain id is the key, never a mapped one)', async () => {
  const s = store(); const api = createActiveSpCoinApi(s, auth, fixedNow);
  await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, headers: bearer('owner'), body: { address: SPCOIN } }));
  assert.equal([...s.m.keys()].join(','), '31337');
  assert.equal((await api.get(rq({ params: { chainId: '8453' } }))).status, 404);
});
await test('PUT without a session is 401 and saves nothing', async () => {
  const s = store(); const api = createActiveSpCoinApi(s, auth, fixedNow);
  const r = await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, body: { address: SPCOIN } }));
  assert.equal(r.status, 401); assert.equal(s.m.size, 0);
});
await test('PUT by a signed-in user who is not the owner / admin is 403 and saves nothing', async () => {
  const s = store(); const api = createActiveSpCoinApi(s, auth, fixedNow);
  const r = await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, headers: bearer('user'), body: { address: SPCOIN } }));
  assert.equal(r.status, 403); assert.equal(s.m.size, 0);
});
await test('PUT with a malformed address is 400 and saves nothing', async () => {
  const s = store(); const api = createActiveSpCoinApi(s, auth, fixedNow);
  for (const address of ['', '0x123', 'not an address', undefined, 5]) {
    const r = await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, headers: bearer('owner'), body: { address } }));
    assert.equal(r.status, 400, String(address));
  }
  assert.equal(s.m.size, 0);
});
await test('a chain id that is not a positive integer is 400 (GET and PUT)', async () => {
  const api = createActiveSpCoinApi(store(), auth, fixedNow);
  for (const chainId of ['abc', '0', '-1', '1.5', '', '99999999999']) {
    assert.equal((await api.get(rq({ params: { chainId } }))).status, 400, 'get ' + chainId);
    assert.equal((await api.put(rq({ method: 'PUT', params: { chainId }, headers: bearer('owner'), body: { address: SPCOIN } }))).status, 400, 'put ' + chainId);
  }
});
await test('an owner is saved with the coin (lower-cased) and read back; a malformed owner is 400 and saves nothing', async () => {
  const s = store(); const api = createActiveSpCoinApi(s, auth, fixedNow);
  const bad = await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, headers: bearer('owner'), body: { address: SPCOIN, owner: '0x12' } }));
  assert.equal(bad.status, 400); assert.equal(s.m.size, 0);
  await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, headers: bearer('owner'), body: { address: SPCOIN, owner: OWNER.toUpperCase().replace('0X', '0x') } }));
  assert.equal((await api.get(rq({ params: { chainId: '31337' } }))).body.owner, OWNER);
});
await test('the owner recorded for the chain may update it; a first record is only created by the caller who names themselves its owner', async () => {
  const s = store(); const api = createActiveSpCoinApi(s, { ...auth, isOwnerAdmin: () => false }, fixedNow);
  const other = await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, headers: bearer('user'), body: { address: SPCOIN, owner: OWNER } }));
  assert.equal(other.status, 403); assert.equal(s.m.size, 0);
  const first = await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, headers: bearer('owner'), body: { address: SPCOIN, owner: OWNER } }));
  assert.equal(first.status, 200);
  const again = await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, headers: bearer('owner'), body: { address: SPCOIN, name: 'n' } }));
  assert.equal(again.status, 200);
  const stranger = await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, headers: bearer('user'), body: { address: SPCOIN, owner: USER } }));
  assert.equal(stranger.status, 403);
});
await test('a failing store is reported as 500, not as a saved value', async () => {
  const bad = { read: async () => null, write: async () => { throw new Error('disk full'); } };
  const api = createActiveSpCoinApi(bad, auth, fixedNow);
  const r = await api.put(rq({ method: 'PUT', params: { chainId: '31337' }, headers: bearer('owner'), body: { address: SPCOIN } }));
  assert.equal(r.status, 500);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
