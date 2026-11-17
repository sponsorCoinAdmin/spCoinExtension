// File: test/hostedApi.test.mjs
//
// Tests for the app-agnostic hosted API in spcoin-feeds (src/api), run against an in-memory store and auth. Run: node test/hostedApi.test.mjs
// MUTANT=noOwnerCheck / noLogoLimit / noPaging run against deliberately broken copies and must report failures.
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
  if (process.env.MUTANT === 'noOwnerCheck' && file.endsWith('accountApi.ts')) src = src.replace('caller === address || auth.isOwnerAdmin(caller)', 'true');
  if (process.env.MUTANT === 'noLogoLimit' && file.endsWith('accountApi.ts')) src = src.replace('if (logo.length > MAX_LOGO_BYTES) throw tooLarge();', '');
  if (process.env.MUTANT === 'badDecimal' && file.endsWith('accountCacheApi.ts')) src = src.replace(/const DECIMAL = .*;/, 'const DECIMAL = /.*/;');
  if (process.env.MUTANT === 'anonWritable' && file.endsWith('exchangeContextApi.ts')) src = src.replace('if (key === host.server.anonymousKey)', 'if (false)');
  if (process.env.MUTANT === 'noRateLimit' && file.endsWith('authApi.ts')) src = src.replace('if (!limiter.ok) return tooMany(', 'if (false) return tooMany(');
  if (process.env.MUTANT === 'noPaging' && file.endsWith('accountsApi.ts')) src = src.replace('rows.slice(start, start + pageSize)', 'rows');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  cache.set(file, mod);
  const localReq = (id) => (id.startsWith('.') ? load(path.join(path.dirname(file), id) + '.ts') : req(id));
  new Function('require', 'module', 'exports', js)(localReq, mod, mod.exports);
  return mod.exports;
}
const { createAccountsApi, createAccountApi, MAX_LOGO_BYTES, createAccountCacheApi, createTokensApi, createTokenApi, createNativeTokenApi, createExchangeContextApi, createAuthApi } = { ...load(path.join(API, 'tokensApi.ts')), ...load(path.join(API, 'tokenApi.ts')), ...load(path.join(API, 'nativeTokenApi.ts')), ...load(path.join(API, 'exchangeContextApi.ts')), ...load(path.join(API, 'authApi.ts')), ...load(path.join(API, 'accountsApi.ts')), ...load(path.join(API, 'accountApi.ts')), ...load(path.join(API, 'accountCacheApi.ts')) };

const A = '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
const B = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
const folder = (a) => '0X' + a.slice(2).toUpperCase();
function memoryStore() {
  const files = new Map([[folder(A), { address: A, name: 'A' }], [folder(B), { address: B, name: 'B' }], ['not-an-address', {}]]);
  const logos = new Map();
  return {
    files, logos,
    listFolders: async () => [...files.keys()],
    readAccount: async (f) => (files.has(f) ? files.get(f) : null),
    logoMtimeMs: async (f) => (logos.has(f) ? 1234 : null),
    writeAccount: async (f, payload) => { files.set(f, JSON.parse(payload)); },
    writeLogo: async (f, bytes) => { logos.set(f, bytes); },
  };
}
const auth = { validateBearer: (t) => (t === 'a' ? { ok: true, address: A } : t === 'owner' ? { ok: true, address: B } : { ok: false, error: 'bad token' }), isOwnerAdmin: (x) => x === B };
const rq = (o) => ({ method: 'GET', query: {}, headers: {}, params: {}, ...o });

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('list returns sorted addresses, skipping non-address folders', async () => {
  const r = await createAccountsApi(memoryStore()).list(rq({}));
  assert.deepEqual(r.body, [B, A].sort());
});
await test('list with allData pages', async () => {
  const r = await createAccountsApi(memoryStore()).list(rq({ query: { allData: '1', pageSize: '1', page: '2' } }));
  assert.equal(r.body.items.length, 1); assert.equal(r.body.totalItems, 2); assert.equal(r.body.hasNextPage, false);
});
await test('batch splits found / missing / invalid', async () => {
  const r = await createAccountsApi(memoryStore()).batch(rq({ method: 'POST', body: { addresses: [A.toUpperCase().replace('0X', '0x'), '0x8d581506486BC255B42D05754392573e46c34577', 'nope'] } }));
  assert.equal(r.body.countFound, 1); assert.deepEqual(r.body.missing, ['0x8d581506486BC255B42D05754392573e46c34577'.toLowerCase()]); // the API answers addresses in lower case assert.deepEqual(r.body.invalid, ['nope']);
});
await test('batch with no addresses is 400', async () => assert.equal((await createAccountsApi(memoryStore()).batch(rq({ body: {} }))).status, 400));
await test('get: 400 bad address, 404 unknown, 200 with logo url', async () => {
  const s = memoryStore(); const api = createAccountApi(s, auth);
  assert.equal((await api.get(rq({ params: { accountAddress: 'zzz' } }))).status, 400);
  assert.equal((await api.get(rq({ params: { accountAddress: '0x0000000000000000000000000000000000000009' } }))).status, 404);
  let r = await api.get(rq({ params: { accountAddress: A } }));
  assert.equal(r.status, 200); assert.equal(r.body.hasLogo, false);
  s.logos.set(folder(A), new Uint8Array(3));
  r = await api.get(rq({ params: { accountAddress: A } }));
  assert.equal(r.body.hasLogo, true); assert.match(r.body.logoURL, /avatar\.png\?v=1234$/);
});
await test('put: 401 without a session', async () => assert.equal((await createAccountApi(memoryStore(), auth).put(rq({ method: 'PUT', params: { accountAddress: A }, body: {} }))).status, 401));
await test('put: a caller may edit their own account', async () => {
  const s = memoryStore(); const r = await createAccountApi(s, auth).put(rq({ method: 'PUT', headers: { authorization: 'Bearer a' }, params: { accountAddress: A }, body: { name: 'new' } }));
  assert.equal(r.status, 200); assert.equal(s.files.get(folder(A)).name, 'new');
});
await test('put: another caller is forbidden, the owner / admin is allowed', async () => {
  const s = memoryStore(); const api = createAccountApi(s, { ...auth, validateBearer: (t) => (t === 'x' ? { ok: true, address: '0x0000000000000000000000000000000000000007' } : auth.validateBearer(t)) });
  assert.equal((await api.put(rq({ method: 'PUT', headers: { authorization: 'Bearer x' }, params: { accountAddress: A }, body: {} }))).status, 403);
  assert.equal((await api.put(rq({ method: 'PUT', headers: { authorization: 'Bearer owner' }, params: { accountAddress: A }, body: { name: 'by owner' } }))).status, 200);
});
await test('put logo: stores bytes, rejects empty and oversized', async () => {
  const s = memoryStore(); const api = createAccountApi(s, auth);
  const base = { method: 'PUT', headers: { authorization: 'Bearer a' }, params: { accountAddress: A }, query: { target: 'logo' } };
  assert.equal((await api.put(rq({ ...base, bytes: new Uint8Array(10) }))).status, 200); assert.equal(s.logos.get(folder(A)).length, 10);
  assert.equal((await api.put(rq({ ...base, bytes: new Uint8Array(0) }))).status, 500);
  const big = await api.put(rq({ ...base, bytes: new Uint8Array(MAX_LOGO_BYTES + 1) }));
  assert.equal(big.status, 413);
});
await test('put account: non-object body is 400', async () => assert.equal((await createAccountApi(memoryStore(), auth).put(rq({ method: 'PUT', headers: { authorization: 'Bearer a' }, params: { accountAddress: A }, body: [1] }))).status, 400));

function cacheStore() {
  const s = memoryStore();
  s.updateAccount = async (f, address, mutate) => { const merged = mutate(s.files.get(f) ?? { address }); s.files.set(f, merged); return merged; };
  return s;
}
await test('cache: sponsored-amount round trip, clear, and validation', async () => {
  const s = cacheStore(); const api = createAccountCacheApi(s);
  const p = { accountAddress: A };
  assert.equal((await api.getSponsoredAmount(rq({ params: p }))).body.sponsoredAmount, null);
  assert.equal((await api.putSponsoredAmount(rq({ method: 'PUT', params: p, body: { sponsoredAmount: '12.5' } }))).status, 200);
  const got = await api.getSponsoredAmount(rq({ params: p }));
  assert.equal(got.body.sponsoredAmount, '12.5'); assert.ok(got.body.updatedAt > 0);
  assert.equal((await api.putSponsoredAmount(rq({ method: 'PUT', params: p, body: { sponsoredAmount: '-1' } }))).status, 400);
  assert.equal((await api.putSponsoredAmount(rq({ method: 'PUT', params: p, body: { sponsoredAmount: null } }))).status, 200);
  assert.equal((await api.getSponsoredAmount(rq({ params: p }))).body.sponsoredAmount, null);
  assert.equal((await api.putSponsoredAmount(rq({ method: 'PUT', params: p }))).status, 400);
});
await test('cache: staked-from-sponsors set, delete, clearAll', async () => {
  const s = cacheStore(); const api = createAccountCacheApi(s); const p = { accountAddress: A };
  let r = await api.putStakedFromSponsors(rq({ method: 'PUT', params: p, body: { sponsorAddress: B.toUpperCase().replace('0X', '0x'), amount: '3' } }));
  assert.equal(r.status, 200); assert.equal(r.body.stakedFromSponsors[B].amount, '3');
  assert.equal((await api.getStakedFromSponsors(rq({ params: p }))).body.stakedFromSponsors[B].amount, '3');
  r = await api.putStakedFromSponsors(rq({ method: 'PUT', params: p, body: { sponsorAddress: B, amount: null } }));
  assert.deepEqual(r.body.stakedFromSponsors, {});
  await api.putStakedFromSponsors(rq({ method: 'PUT', params: p, body: { sponsorAddress: B, amount: '4' } }));
  r = await api.putStakedFromSponsors(rq({ method: 'PUT', params: p, body: { clearAll: true } }));
  assert.deepEqual(r.body.stakedFromSponsors, {});
  assert.equal((await api.putStakedFromSponsors(rq({ method: 'PUT', params: p, body: { sponsorAddress: 'x' } }))).status, 400);
  assert.equal((await api.putStakedFromSponsors(rq({ method: 'PUT', params: p, body: { sponsorAddress: B, amount: 'abc' } }))).status, 400);
});
await test('cache: an unparsable file is a 409, other failures 500', async () => {
  const s = cacheStore(); const api = createAccountCacheApi(s); const p = { accountAddress: A };
  s.updateAccount = async () => { const e = new Error('bad json'); e.name = 'AccountParseError'; throw e; };
  assert.equal((await api.putSponsoredAmount(rq({ method: 'PUT', params: p, body: { sponsoredAmount: '1' } }))).status, 409);
  s.updateAccount = async () => { throw new Error('disk'); };
  assert.equal((await api.putSponsoredAmount(rq({ method: 'PUT', params: p, body: { sponsoredAmount: '1' } }))).status, 500);
});

const T1 = '0x5fbdb2315678afecb367f032d93f642f64180aa3';
const T2 = '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512';
function tokenStore() {
  const lists = new Map([[8453, [T1.toUpperCase().replace('0X', '0x'), 'junk']], [31337, [T2]], [1, []]]);
  const infos = new Map([[`8453/${folder(T1)}`, { name: 'T1', logoURL: '/x.png' }], [`8453/${folder(T2)}`, { name: "T2" }]]);
  const logos = new Set([`8453/${folder(T1)}`]);
  return {
    supportedChainIds: () => [8453, 31337, 1],
    diskChainId: (c) => (c === 31337 ? 8453 : c),
    readTokenList: async (d) => lists.get(d) ?? [],
    readTokenInfo: async (d, f) => (infos.has(`${d}/${f}`) ? { info: infos.get(`${d}/${f}`), hasLogo: logos.has(`${d}/${f}`) } : null),
    infos, logos,
  };
}
await test('tokens list: needs a chain, returns normalised sorted seed addresses, fork merges Base + own', async () => {
  const api = createTokensApi(tokenStore());
  assert.equal((await api.list(rq({}))).status, 400);
  assert.deepEqual((await api.list(rq({ query: { chainId: '8453' } }))).body, [T1]);
  assert.deepEqual((await api.list(rq({ query: { chainId: '31337' } }))).body, [T1, T2].sort());
  assert.deepEqual((await api.list(rq({ query: { chainId: '5' } }))).body, []);
  const all = await api.list(rq({ query: { allNetworks: 'true' } }));
  assert.equal(all.body.totalItems, 3);
});
await test('tokens list: allData pages, address lookup, logo url only when a logo exists', async () => {
  const api = createTokensApi(tokenStore());
  const page = await api.list(rq({ query: { chainId: '31337', allData: '1', pageSize: '1' } }));
  assert.equal(page.body.items.length, 1); assert.equal(page.body.hasNextPage, true);
  const one = await api.list(rq({ query: { chainId: '8453', address: T1 } }));
  assert.equal(one.body.data.logoURL, `/assets/blockchains/8453/contracts/${folder(T1)}/logo.png`);
  const other = await api.list(rq({ query: { chainId: '31337', address: T2 } }));
  assert.equal(other.body.data.logoURL, undefined);
  assert.equal((await api.list(rq({ query: { chainId: '8453', address: '0x8d581506486BC255B42D05754392573e46c34577' } }))).status, 404);
  assert.equal((await api.list(rq({ query: { chainId: '8453', address: 'bad' } }))).status, 400);
});
await test('tokens batch: both body shapes, invalid, missing, dedupe', async () => {
  const api = createTokensApi(tokenStore());
  const r = await api.batch(rq({ method: 'POST', body: { chainId: 8453, addresses: [T1, T1, 'bad', '0x8d581506486BC255B42D05754392573e46c34577'] } }));
  assert.equal(r.body.countRequested, 2); assert.equal(r.body.countFound, 1); assert.equal(r.body.invalid.length, 1); assert.equal(r.body.missing.length, 1);
  const r2 = await api.batch(rq({ method: 'POST', body: { requests: [{ chainId: 31337, address: T2 }, { chainId: 0, address: T1 }] } }));
  assert.equal(r2.body.countFound, 1); assert.equal(r2.body.invalid.length, 1);
  assert.equal((await api.batch(rq({ method: 'POST', body: {} }))).status, 400);
});
await test('token: get 400 / 404 / 200, put needs any session, info and logo targets', async () => {
  const files = new Map(); const logos = new Map();
  const st = { diskChainId: (c) => (c === 31337 ? 8453 : c), readInfo: async (d, f) => files.get(`${d}/${f}`) ?? null, writeInfo: async (d, f, p) => { files.set(`${d}/${f}`, JSON.parse(p)); }, writeLogo: async (d, f, b) => { logos.set(`${d}/${f}`, b); } };
  const api = createTokenApi(st, auth);
  const p = { chainId: '31337', tokenAddress: T1 };
  assert.equal((await api.get(rq({ params: { chainId: 'x', tokenAddress: T1 } }))).status, 400);
  assert.equal((await api.get(rq({ params: { chainId: '1', tokenAddress: 'bad' } }))).status, 400);
  assert.equal((await api.get(rq({ params: p }))).status, 404);
  assert.equal((await api.put(rq({ method: 'PUT', params: p, body: { n: 1 } }))).status, 401);
  const hdr = { authorization: 'Bearer a' };
  const w = await api.put(rq({ method: 'PUT', params: p, headers: hdr, body: { name: 'T1' } }));
  assert.equal(w.status, 200); assert.match(w.body.file, /^\/assets\/blockchains\/8453\/contracts\/0X5FBDB/);
  assert.equal((await api.get(rq({ params: p }))).body.data.name, 'T1');
  assert.equal((await api.put(rq({ method: 'PUT', params: p, headers: hdr, body: [1] }))).status, 400);
  assert.equal((await api.put(rq({ method: 'PUT', params: p, headers: hdr, query: { target: 'logo' }, bytes: new Uint8Array(5) }))).status, 200);
  assert.equal((await api.put(rq({ method: 'PUT', params: p, headers: hdr, query: { target: 'logo' }, bytes: new Uint8Array(MAX_LOGO_BYTES + 1) }))).status, 413);
});
await test('native token: 400 / 404 / 422 / 400 invalid / 200 cacheable / 500', async () => {
  const mk = (read) => createNativeTokenApi({ readNativeTokenInfo: read }).get;
  const good = JSON.stringify({ chainId: 1, address: '0xEeee', name: 'Ether', symbol: 'ETH' });
  assert.equal((await mk(async () => good)(rq({ params: {} }))).status, 400);
  assert.equal((await mk(async () => null)(rq({ params: { chainId: '1' } }))).status, 404);
  assert.equal((await mk(async () => '{oops')(rq({ params: { chainId: '1' } }))).status, 422);
  assert.equal((await mk(async () => '{}')(rq({ params: { chainId: '1' } }))).status, 400);
  const ok = await mk(async () => good)(rq({ params: { chainId: '1' } }));
  assert.equal(ok.status, 200); assert.equal(ok.headers['Cache-Control'], 'public, max-age=60');
  assert.equal((await mk(async () => { throw new Error('x'); })(rq({ params: { chainId: '1' } }))).status, 500);
});

function ecHost(over = {}) {
  const patches = [];
  return {
    patches,
    host: {
      server: { anonymousKey: 'anonymous', normalizeKey: (k) => (k ? String(k).toLowerCase() : 'anonymous'), get: async (k) => ({ key: k, v: 10n }), patch: async (k, p, src) => { patches.push([k, p, src]); return { key: k, ...p }; } },
      codec: { serialize: (v) => JSON.stringify(v, (_, x) => (typeof x === 'bigint' ? `BigInt(${x})` : x)), deserialize: (t) => JSON.parse(t) },
      validateSessionFor: (t, k) => (t === 'good' ? { ok: true, address: k } : { ok: false, error: 'bad token' }),
      corsHeaders: (h) => (h.origin === 'chrome-extension://x' ? { 'Access-Control-Allow-Origin': 'chrome-extension://x' } : {}),
      ...over,
    },
  };
}
await test('exchangeContext: get serialises BigInt and adds CORS only for the pinned origin', async () => {
  const api = createExchangeContextApi(ecHost().host);
  const a = await api.get(rq({ query: { key: '0xAB' }, headers: { origin: 'chrome-extension://x' } }));
  assert.equal(a.status, 200); assert.equal(a.text, '{"key":"0xAB","v":"BigInt(10)"}'); assert.equal(a.headers['Access-Control-Allow-Origin'], 'chrome-extension://x');
  assert.equal((await api.get(rq({ query: { key: '0xAB' }, headers: { origin: 'https://evil' } }))).headers['Access-Control-Allow-Origin'], undefined);
});
await test('exchangeContext: post refuses the anonymous key, a bad session, a non-object and unknown fields', async () => {
  const { host, patches } = ecHost(); const api = createExchangeContextApi(host);
  const ok = { method: 'POST', query: { key: '0xab' }, headers: { authorization: 'Bearer good' } };
  assert.equal((await api.post(rq({ ...ok, query: {} , rawText: '{}' }))).status, 401);
  assert.equal((await api.post(rq({ ...ok, headers: {}, rawText: '{}' }))).status, 401);
  assert.equal((await api.post(rq({ ...ok, rawText: '[1]' }))).status, 400);
  const unk = await api.post(rq({ ...ok, rawText: '{"hack":1}' })); assert.equal(unk.status, 400); assert.match(unk.body.error, /Unknown APICoreSyncedMembers field: "hack"/);
  assert.equal(patches.length, 0);
});
await test('exchangeContext: a valid post merges through the store with the sync source', async () => {
  const { host, patches } = ecHost(); const api = createExchangeContextApi(host);
  const r = await api.post(rq({ method: 'POST', query: { key: '0xab' }, headers: { authorization: 'Bearer good', 'x-sync-source': ' panel ' }, rawText: '{"showTestNets":true}' }));
  assert.equal(r.status, 200); assert.deepEqual(patches, [['0xab', { showTestNets: true }, 'panel']]);
});
await test('exchangeContext: options is a read-only 204 preflight, store errors are 500', async () => {
  const { host } = ecHost({ server: { anonymousKey: 'anonymous', normalizeKey: (k) => k, get: async () => { throw new Error('disk'); }, patch: async () => ({}) } });
  const api = createExchangeContextApi(host);
  const o = await api.options(rq({ method: 'OPTIONS', headers: { origin: 'chrome-extension://x' } }));
  assert.equal(o.status, 204); assert.equal(o.headers['Access-Control-Allow-Methods'], 'GET, OPTIONS');
  assert.equal((await api.get(rq({ query: { key: 'k' } }))).status, 500);
});

function authSvc(over = {}) {
  const calls = [];
  return { calls, svc: { isConfigured: () => true, consumeRateLimit: async (k, key) => { calls.push([k, key]); return { ok: true }; }, issueNonce: (a) => { if (a === 'bad') throw new Error('Invalid address'); return { address: a, nonce: 'n1', expiresAt: 1 }; }, verify: async (i) => (i.signature === 'sig' ? { ok: true, token: 't' } : { ok: false, error: 'bad signature' }), ...over } };
}
await test('auth nonce: 503 unconfigured, 429 with Retry-After, 200, 400 on a thrown error or no body', async () => {
  assert.equal((await createAuthApi(authSvc({ isConfigured: () => false }).svc).nonce(rq({ method: 'POST', body: { address: A } }))).status, 503);
  const limited = await createAuthApi(authSvc({ consumeRateLimit: async () => ({ ok: false, retryAfterSeconds: 7 }) }).svc).nonce(rq({ method: 'POST', body: { address: A } }));
  assert.equal(limited.status, 429); assert.equal(limited.headers['Retry-After'], '7');
  const { svc, calls } = authSvc(); const api = createAuthApi(svc);
  const ok = await api.nonce(rq({ method: 'POST', headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, body: { address: ' ' + A.toUpperCase().replace('0X', '0x') + ' ' } }));
  assert.equal(ok.status, 200); assert.deepEqual(calls[0], ['nonce', `1.2.3.4:${A}`]);
  assert.equal((await api.nonce(rq({ method: 'POST', body: { address: 'bad' } }))).status, 400);
  assert.equal((await api.nonce(rq({ method: 'POST' }))).status, 400);
});
await test('auth verify: 503, 429, 401 on a bad signature, 200 with the session, rate-limit key lower-cased', async () => {
  assert.equal((await createAuthApi(authSvc({ isConfigured: () => false }).svc).verify(rq({ method: 'POST', body: {} }))).status, 503);
  assert.equal((await createAuthApi(authSvc({ consumeRateLimit: async () => ({ ok: false }) }).svc).verify(rq({ method: 'POST', body: { address: A } }))).headers['Retry-After'], '1');
  const { svc, calls } = authSvc(); const api = createAuthApi(svc);
  assert.equal((await api.verify(rq({ method: 'POST', body: { address: A, nonce: 'n', signature: 'nope' } }))).status, 401);
  const ok = await api.verify(rq({ method: 'POST', body: { address: A.toUpperCase().replace('0X', '0x'), nonce: 'n', signature: 'sig' } }));
  assert.equal(ok.status, 200); assert.equal(ok.body.token, 't'); assert.equal(calls[1][1], `unknown:${A}`);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
