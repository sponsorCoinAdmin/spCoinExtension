// File: test/devKeystoreGate.test.mjs
//
// Guards docs/design/accountAuthDesign.txt 14.6 (item V6): the server keystore is a dev authenticator, and a public release must not expose a route that decrypts or uses a key held on the server. Two checks:
//   1. lib/server/devKeystoreGate.ts: open by default (nothing changes on development machines and current deployments), closed (a 404) when SPCOIN_PUBLIC_RELEASE=1.
//   2. EVERY exported GET / POST / PUT / DELETE handler of every app/api/spCoin/meritConnect/*/route.ts starts with the guard (a new route or a new handler that forgets it fails this test).
// Run: node test/devKeystoreGate.test.mjs
// MUTANT=alwaysOpen|dropGuard|guardNotFirst|dropWriteGuard|guardLacksOrigin|guardLacksDevGate run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(import.meta.url);
const ts = req('typescript');
const m = process.env.MUTANT;

let gateSrc = fs.readFileSync(path.join(WEB, 'lib', 'server', 'devKeystoreGate.ts'), 'utf8');
if (m === 'alwaysOpen') gateSrc = gateSrc.replace("return String(env.SPCOIN_PUBLIC_RELEASE ?? '').trim() !== '1';", 'return true;');
const js = ts.transpileModule(gateSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
const fakeNext = { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
new Function('require', 'module', 'exports', js)((id) => (id === 'next/server' ? fakeNext : req(id)), mod, mod.exports);
const { isDevKeystoreOpen, devKeystoreClosedResponse } = mod.exports;

const routesDir = path.join(WEB, 'app', 'api', 'spCoin', 'meritConnect');
const routeFiles = fs.readdirSync(routesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(routesDir, d.name, 'route.ts')).filter((f) => fs.existsSync(f));

const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

test('open by default, with the flag unset, empty or anything but 1', () => {
  assert.equal(isDevKeystoreOpen({}), true);
  assert.equal(isDevKeystoreOpen({ SPCOIN_PUBLIC_RELEASE: '' }), true);
  assert.equal(isDevKeystoreOpen({ SPCOIN_PUBLIC_RELEASE: '0' }), true);
  assert.equal(devKeystoreClosedResponse({}), undefined);
});
test('SPCOIN_PUBLIC_RELEASE=1 closes it: a 404 that says nothing about keys', () => {
  assert.equal(isDevKeystoreOpen({ SPCOIN_PUBLIC_RELEASE: '1' }), false);
  const r = devKeystoreClosedResponse({ SPCOIN_PUBLIC_RELEASE: ' 1 ' });
  assert.equal(r.status, 404);
  assert.deepEqual(r.body, { ok: false, message: 'Not found.' });
});
test('there are meritConnect routes to guard (the check is not vacuous)', () => {
  assert.ok(routeFiles.length >= 7, 'only ' + routeFiles.length + ' route files found');
});
for (const file of routeFiles) {
  const name = path.relative(WEB, file).replace(/\\/g, '/');
  test(`${name}: every GET / POST / PUT / DELETE handler starts with the guard`, () => {
    let src = fs.readFileSync(file, 'utf8');
    if (m === 'dropGuard' && name.includes('/reveal/')) src = src.replace('const devClosed = devKeystoreClosedResponse();', '');
    if (m === 'guardNotFirst' && name.includes('/unlock/')) src = src.replace(/(export async function (?:GET|POST|PUT|DELETE)\([^)]*\)[^{\n]*\{)\s*const devClosed = devKeystoreClosedResponse\(\);\s*if \(devClosed\) return devClosed;/, '$1\n  await Promise.resolve();\n  const devClosed = devKeystoreClosedResponse();\n  if (devClosed) return devClosed;');
    const handlers = [...src.matchAll(/export async function (GET|POST|PUT|DELETE)\([^)]*\)[^{\n]*\{([\s\S]*?)\n\}/g)];
    assert.ok(handlers.length >= 1, 'no handler found');
    for (const [, verb, body] of handlers) {
      const first = body.replace(/^\s*(\/\/[^\n]*\n\s*)*/, '').split('\n').filter((l) => l.trim() && !l.trim().startsWith('//')).slice(0, 2).join(' ');
      assert.ok(/const devClosed = devKeystoreClosedResponse\(\);\s+if \(devClosed\) return devClosed;/.test(first), `${verb} does not start with the guard`);
    }
    assert.ok(src.includes("from '@/lib/server/devKeystoreGate'"), 'the guard is not imported');
  });
}

// 2026-10-11 (section 15, item H2): the key store's own write routes (test-account POST and DELETE) take the same two guards: the dev keystore must be open and the request must come from this origin.
{
  const name = 'app/api/spCoin/lab/networks/[chainId]/testAccounts/route.ts';
  const readTestAccounts = () => {
    let src = fs.readFileSync(path.join(WEB, ...name.split('/')), 'utf8').replace(/\r\n/g, '\n');
    if (m === 'dropWriteGuard') src = src.replace(/export async function POST\(request: Request, _context: RouteContext\) \{\n  const blocked = keystoreWriteGuard\(request\);\n  if \(blocked\) return blocked;/, 'export async function POST(request: Request, _context: RouteContext) {');
    if (m === 'guardLacksOrigin') src = src.replace('if (!isSameOriginRequest(request)) {', 'if (false) {');
    if (m === 'guardLacksDevGate') src = src.replace('if (devClosed) return devClosed;', '');
    return src;
  };
  test(`${name}: POST and DELETE start with keystoreWriteGuard, which checks the dev gate and the origin`, () => {
    const src = readTestAccounts();
    for (const verb of ['POST', 'DELETE']) {
      const header = `export async function ${verb}(request: Request, _context: RouteContext) {\n  const blocked = keystoreWriteGuard(request);\n  if (blocked) return blocked;`;
      assert.ok(src.includes(header), `${verb} does not start with keystoreWriteGuard`);
    }
    const guard = src.slice(src.indexOf('function keystoreWriteGuard'), src.indexOf('export const runtime'));
    assert.ok(/const devClosed = devKeystoreClosedResponse\(\);\s+if \(devClosed\) return devClosed;/.test(guard), 'the guard does not apply the dev keystore gate');
    assert.ok(/if \(!isSameOriginRequest\(request\)\) \{[\s\S]*?status: 403/.test(guard), 'the guard does not refuse a cross-origin request with a 403');
  });
  test(`${name}: GET is not given the write guard (it stays readable by the trusted extension origin)`, () => {
    const src = readTestAccounts();
    const get = src.slice(src.indexOf('export async function GET'), src.indexOf('export async function POST'));
    assert.ok(!get.includes('keystoreWriteGuard'), 'GET must not use the write guard');
  });
}

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
