// File: test/walletHeaders.test.mjs
//
// Guards docs/design/accountAuthDesign.txt 14.7 (item V9): the browser wallet page (/Wallet) is served with the fixed hardening headers of next.config.js: it cannot be framed (X-Frame-Options), sends no referrer and its content types are not sniffed. And no OTHER
// route gets the wallet's headers by accident. The content-security policy itself is per request (middleware.ts) and is pinned in test/walletPageHeaders.test.mjs. Run: node test/walletHeaders.test.mjs
// MUTANT=noFrameOptions|noReferrerPolicy|noWalletRoute|policyRepeated|everyRoute run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const m = process.env.MUTANT;
let src = fs.readFileSync(path.join(WEB, 'next.config.js'), 'utf8');
if (m === 'noFrameOptions') src = src.replace("{ key: 'X-Frame-Options', value: 'DENY' },", '');
if (m === 'noReferrerPolicy') src = src.replace("{ key: 'Referrer-Policy', value: 'no-referrer' },", '');
if (m === 'noWalletRoute') src = src.replace("{ source: '/Wallet', headers: wallet },", '');
if (m === 'policyRepeated') src = src.replace("{ key: 'Referrer-Policy', value: 'no-referrer' },", "{ key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'Content-Security-Policy', value: \"script-src 'unsafe-inline'\" },");
if (m === 'everyRoute') src = src.replace("{ source: '/Wallet', headers: wallet },", "{ source: '/:path*', headers: wallet },");
// load the (possibly mutated) config from a temp copy placed next to the real one so its relative requires resolve
const tmp = path.join(WEB, '.walletHeaders.next.config.test.js');
fs.writeFileSync(tmp, src);
let config;
try {
  config = createRequire(import.meta.url)(tmp);
} finally {
  fs.rmSync(tmp, { force: true });
}
const headers = await config.headers();
const forWallet = headers.find((h) => h.source === '/Wallet')?.headers ?? [];
const get = (name) => forWallet.find((h) => h.key.toLowerCase() === name.toLowerCase())?.value ?? '';

const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

test('/Wallet and its sub-paths have headers', () => {
  assert.ok(headers.some((h) => h.source === '/Wallet'), '/Wallet has no headers');
  assert.ok(headers.some((h) => h.source === '/Wallet/:path*'), '/Wallet/:path* has no headers');
});
test('the page cannot be framed (X-Frame-Options DENY)', () => {
  assert.equal(get('X-Frame-Options'), 'DENY');
});
test('no referrer is sent and content types are not sniffed', () => {
  assert.equal(get('Referrer-Policy'), 'no-referrer');
  assert.equal(get('X-Content-Type-Options'), 'nosniff');
});
test('the content-security policy is NOT fixed here: it is per request (a fixed one here would fight the nonce one)', () => {
  assert.equal(get('Content-Security-Policy'), '');
  assert.equal(get('Content-Security-Policy-Report-Only'), '');
});
test('only the wallet routes get these headers', () => {
  for (const h of headers) assert.ok(h.source.startsWith('/Wallet'), `unexpected route with wallet headers: ${h.source}`);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
