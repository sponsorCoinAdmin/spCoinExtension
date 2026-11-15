// File: test/unlockRevoke.test.mjs
//
// Guards docs/design/accountAuthDesign.txt section 15, item H4: locking the wallet ends the unlock tokens on the SERVER, not only in the browser. Three pieces:
//   1. lib/server/meritUnlockSession.server.ts: a revoked token no longer returns its key (and another token is untouched).
//   2. components/wallet/lib/meritConnect/unlockSession.ts: clearAllCachedUnlockTokens sends every cached token to /api/spCoin/meritConnect/revoke, then forgets them.
//   3. app/api/spCoin/meritConnect/revoke/route.ts: starts with the dev keystore gate, refuses a cross-origin request, and revokes each token it is given.
// Run: node test/unlockRevoke.test.mjs
// MUTANT=revokeIsNoop|clearDoesNotNotify|routeSkipsRevoke|routeNoOriginCheck run against deliberately broken copies and must report failures.
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
const read = (...p) => fs.readFileSync(path.join(WEB, ...p), 'utf8').replace(/\r\n/g, '\n');
const compile = (src, requireFn) => {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)(requireFn, mod, mod.exports);
  return mod.exports;
};

// 1. the server store
let serverSrc = read('lib', 'server', 'meritUnlockSession.server.ts');
if (m === 'revokeIsNoop') serverSrc = serverSrc.replace('unlockStore.delete(String(token ?? \'\').trim());', '/* nothing */');
const server = compile(serverSrc, (id) => (id === 'crypto' ? { default: req('crypto'), ...req('crypto') } : req(id)));
const ADDR = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

// 2. the client cache
const sent = [];
const store = new Map();
globalThis.window = { sessionStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) } };
globalThis.fetch = async (url, init) => { sent.push([url, JSON.parse(init.body)]); return { ok: true, json: async () => ({}) }; };
let clientSrc = read('components', 'wallet', 'lib', 'meritConnect', 'unlockSession.ts');
if (m === 'clearDoesNotNotify') clientSrc = clientSrc.replace("void fetch('/api/spCoin/meritConnect/revoke'", "void (async () => undefined)('/api/spCoin/meritConnect/revoke'");
store.set('spCoin:meritUnlockCache', JSON.stringify({ '31337:0xaaa': { token: 'tokA', expiresAt: Date.now() + 60000 }, '1:0xbbb': { token: 'tokB', expiresAt: Date.now() + 60000 } }));
const client = compile(clientSrc, () => ({}));

// 3. the route
let routeSrc = read('app', 'api', 'spCoin', 'meritConnect', 'revoke', 'route.ts');
if (m === 'routeSkipsRevoke') routeSrc = routeSrc.replace('for (const token of tokens) revokeUnlockToken(token);', '');
if (m === 'routeNoOriginCheck') routeSrc = routeSrc.replace('if (!isSameOriginRequest(request)) {', 'if (false) {');
const revoked = [];
let sameOrigin = true;
const route = compile(routeSrc, (id) => {
  if (id === 'next/server') return { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
  if (id === '@/lib/server/devKeystoreGate') return { devKeystoreClosedResponse: () => undefined };
  if (id === '@/lib/server/spCoinAuth') return { isSameOriginRequest: () => sameOrigin };
  if (id === '@/lib/server/meritUnlockSession.server') return { revokeUnlockToken: (t) => revoked.push(t) };
  return {};
});
const jsonRequest = (body) => ({ json: async () => body });

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('server: a revoked token no longer returns its key, and another token is untouched', () => {
  const a = server.issueUnlockToken(ADDR, 31337, '0xkeyA');
  const b = server.issueUnlockToken(ADDR, 1, '0xkeyB');
  assert.equal(server.getUnlockedPrivateKey(a.token, ADDR, 31337), '0xkeyA');
  server.revokeUnlockToken(a.token);
  assert.equal(server.getUnlockedPrivateKey(a.token, ADDR, 31337), null);
  assert.equal(server.getUnlockedPrivateKey(b.token, ADDR, 1), '0xkeyB');
  server.revokeUnlockToken('not-a-token');
  server.revokeUnlockToken(undefined);
});
await test('client: locking sends every cached token to /revoke, then forgets them', async () => {
  assert.equal(client.getCachedUnlockToken(31337, '0xaaa'), 'tokA');
  client.clearAllCachedUnlockTokens();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(sent.length, 1);
  assert.equal(sent[0][0], '/api/spCoin/meritConnect/revoke');
  assert.deepEqual([...sent[0][1].tokens].sort(), ['tokA', 'tokB']);
  assert.equal(client.getCachedUnlockToken(31337, '0xaaa'), null);
  assert.equal(client.getCachedUnlockToken(1, '0xbbb'), null);
});
await test('client: locking with nothing cached sends nothing', async () => {
  sent.length = 0;
  client.clearAllCachedUnlockTokens();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(sent.length, 0);
});
await test('route: revokes each token it is given and reports the count', async () => {
  revoked.length = 0; sameOrigin = true;
  const r = await route.POST(jsonRequest({ tokens: ['t1', 't2', 5, null, 't3'] }));
  assert.equal(r.status, 200);
  assert.deepEqual(revoked, ['t1', 't2', 't3']);
  assert.equal(r.body.revoked, 3);
});
await test('route: a cross-origin request revokes nothing and gets a 403', async () => {
  revoked.length = 0; sameOrigin = false;
  const r = await route.POST(jsonRequest({ tokens: ['t1'] }));
  assert.equal(r.status, 403);
  assert.deepEqual(revoked, []);
  sameOrigin = true;
});
await test('route: a body that is not JSON is a 400, not a crash', async () => {
  const r = await route.POST({ json: async () => { throw new Error('bad json'); } });
  assert.equal(r.status, 400);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
