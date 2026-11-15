// File: test/walletPageHeaders.test.mjs
//
// Pins the browser wallet page's security (docs/design/accountAuthDesign.txt 14.7, item V9): the content-security policy (the web app's lib/security/walletCsp.ts, issued per request by middleware.ts) lets only scripts that carry the
// request's NONCE run (no inline script, no third-party script), forbids framing, plug-ins, a changed base URL and forms posted elsewhere; the fixed headers (next.config.js) send no referrer and stop sniffing and framing; the middleware
// applies the policy to the wallet page and its sub-paths only, on the request (so Next can put the nonce on its scripts) and on the response; the page is rendered per request. Run: node test/walletPageHeaders.test.mjs
// MUTANT=unsafeInline|thirdPartyScripts|framable|noObjectBlock|nonceFixed|devEvalInProduction|policyNotOnRequest|referrerDropped run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(path.join(WEB, 'package.json'));
const ts = req('typescript');
const m = process.env.MUTANT;
const read = (rel) => fs.readFileSync(path.join(WEB, rel), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let csp = read('lib/security/walletCsp.ts');
if (m === 'unsafeInline') csp = swap(csp, "'nonce-${nonce}' 'strict-dynamic'", "'nonce-${nonce}' 'unsafe-inline' 'strict-dynamic'");
if (m === 'thirdPartyScripts') csp = swap(csp, "script-src 'self' 'nonce-", "script-src 'self' https: 'nonce-");
if (m === 'framable') csp = swap(csp, `"frame-ancestors 'none'",`, '');
if (m === 'noObjectBlock') csp = swap(csp, `"object-src 'none'",`, '');
if (m === 'nonceFixed') csp = swap(csp, 'crypto.getRandomValues(bytes);', 'bytes.fill(7);');
if (m === 'devEvalInProduction') csp = swap(csp, "${dev ? \" 'unsafe-eval'\" : ''}", " 'unsafe-eval'");
const mod = { exports: {} };
new Function('require', 'module', 'exports', 'crypto', 'btoa', ts.transpileModule(csp, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(req, mod, mod.exports, globalThis.crypto, globalThis.btoa);
const { walletCsp, newNonce, isWalletPath } = mod.exports;

let mw = read('middleware.ts');
if (m === 'policyNotOnRequest') mw = swap(mw, "requestHeaders.set('Content-Security-Policy', policy);", '');
let cfg = read('next.config.js');
if (m === 'referrerDropped') cfg = swap(cfg, "{ key: 'Referrer-Policy', value: 'no-referrer' },", '');
const tmp = path.join(WEB, '.next-config-test.cjs');
fs.writeFileSync(tmp, cfg);
let config;
try { config = req(tmp); } finally { fs.rmSync(tmp, { force: true }); }

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const directive = (policy, name) => policy.split(';').map((d) => d.trim()).find((d) => d.startsWith(name));

for (const dev of [false, true]) {
  const env = dev ? 'development' : 'production';
  await test(`${env}: scripts run only with the request's nonce (and what such a script loads): no inline script, no third-party origin`, () => {
    const policy = walletCsp('abc123', dev);
    const sources = directive(policy, 'script-src').split(/\s+/).slice(1);
    for (const s of sources) assert.ok(["'self'", "'nonce-abc123'", "'strict-dynamic'", "'unsafe-eval'"].includes(s), `a script source is allowed that should not be: ${s}`);
    assert.ok(sources.includes("'nonce-abc123'") && sources.includes("'strict-dynamic'"));
    assert.equal(sources.includes("'unsafe-inline'"), false);
    assert.equal(sources.includes("'unsafe-eval'"), dev, 'unsafe-eval belongs to the dev server only');
  });
  await test(`${env}: nothing is framed, no plug-ins, the base URL and forms stay on the page's own origin`, () => {
    const policy = walletCsp('n', dev);
    assert.match(policy, /frame-ancestors 'none'/);
    assert.match(policy, /object-src 'none'/);
    assert.match(policy, /base-uri 'self'/);
    assert.match(policy, /form-action 'self'/);
  });
}

await test('every request gets a new nonce of 128 random bits', () => {
  const seen = new Set(Array.from({ length: 50 }, () => newNonce()));
  assert.equal(seen.size, 50);
  for (const n of seen) assert.equal(Buffer.from(n, 'base64').length, 16);
});

await test('only the wallet page and what is under it are the wallet path', () => {
  assert.equal(isWalletPath('/Wallet'), true);
  assert.equal(isWalletPath('/Wallet/anything'), true);
  assert.equal(isWalletPath('/WalletOther'), false);
  assert.equal(isWalletPath('/Exchange'), false);
});

await test('the middleware sets the policy on the REQUEST (Next reads the nonce there) and on the response, for wallet paths only', () => {
  assert.match(mw, /if \(isWalletPath\(pathname\)\) \{/);
  assert.match(mw, /requestHeaders\.set\('Content-Security-Policy', policy\);/);
  assert.match(mw, /NextResponse\.next\(\{ request: \{ headers: requestHeaders \} \}\)/);
  assert.match(mw, /response\.headers\.set\('Content-Security-Policy', policy\);/);
});

await test('the wallet page is rendered per request, so its scripts can carry the nonce', () => {
  const page = read('app/(menu)/Wallet/page.tsx');
  assert.match(page, /await connection\(\);/);
  assert.doesNotMatch(page, /'use client'/);
});

for (const env of ['production', 'development']) {
  await test(`${env}: the fixed headers of the wallet page and everything under it: no referrer, no sniffing, no framing; the policy itself is not repeated here`, async () => {
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = env;
    let rules;
    try { rules = await (typeof config === 'function' ? config('phase', { defaultConfig: {} }) : config).headers(); } finally { process.env.NODE_ENV = before; }
    assert.deepEqual(rules.map((r) => r.source).sort(), ['/Wallet', '/Wallet/:path*']);
    assert.deepEqual(rules[0].headers, rules[1].headers);
    const value = (key) => (rules[0].headers.find((h) => h.key === key) || {}).value;
    assert.equal(value('Referrer-Policy'), 'no-referrer');
    assert.equal(value('X-Content-Type-Options'), 'nosniff');
    assert.equal(value('X-Frame-Options'), 'DENY');
    assert.equal(value('Content-Security-Policy'), undefined);
  });
}

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
