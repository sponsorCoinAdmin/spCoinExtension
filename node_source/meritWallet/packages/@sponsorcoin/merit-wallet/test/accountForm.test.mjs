// File: test/accountForm.test.mjs
//
// Tests for the shared account editor's pure helpers (src/account/form/formHelpers.ts). Run: node test/accountForm.test.mjs
// MUTANT=blockAtLimit|trimKeepsDup|noHttps|addrNoLower run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'account', 'form', 'formHelpers.ts'), 'utf8');
if (process.env.MUTANT === 'blockAtLimit') src = src.replace('return nextLen > maxLen;', 'return nextLen >= maxLen;');
if (process.env.MUTANT === 'trimKeepsDup') src = src.replace('      new Set(', '      ((a) => a)(');
if (process.env.MUTANT === 'noHttps') src = src.replace("/^https?:$/i.test(url.protocol) && hasDot", 'hasDot');
if (process.env.MUTANT === 'addrNoLower') src = src.replace(".replace(/^0[xX]/, '').toLowerCase()}`;", ".replace(/^0[xX]/, '')}`;");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
const stubs = { '@sponsorcoin/spcoin-feeds/accounts': { ANONYMOUS_ACCOUNT_AVATAR_URL: '/assets/anon.png' }, '@sponsorcoin/spcoin-exchange-engine': { withCacheBust: (u) => u } };
new Function('require', 'module', 'exports', js)((id) => stubs[id], mod, mod.exports);
const h = mod.exports;

const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

test('normalizeAddress lowercases and adds 0x', () => {
  assert.equal(h.normalizeAddress('0xABCdef'), '0xabcdef'); assert.equal(h.normalizeAddress('ABC'), '0xabc');
});
test('input is blocked past the limit, but the limit itself is allowed', () => {
  assert.equal(h.shouldBlockAdditionalInput('name', 'a'.repeat(49), 'a'.repeat(50)), false);
  assert.equal(h.shouldBlockAdditionalInput('name', 'a'.repeat(50), 'a'.repeat(51)), true);
  assert.equal(h.shouldBlockAdditionalInput('name', 'a'.repeat(60), 'a'.repeat(59)), false, 'an over-long value may shrink');
});
test('trimForm trims text and de-duplicates the recipient networks', () => {
  const t = h.trimForm({ name: ' a ', symbol: ' b', email: 'c ', website: ' d ', description: ' e ', recipientNetwork: [1, 1, '137', NaN] });
  assert.deepEqual(t, { name: 'a', symbol: 'b', email: 'c', website: 'd', description: 'e', recipientNetwork: [1, 137] });
});
test('website needs http(s) and a dot; relative asset paths pass', () => {
  assert.equal(h.isValidWebsite('example.com'), true); assert.equal(h.isValidWebsite('ftp://example.com'), false);
  assert.equal(h.isValidWebsite('localhost'), false); assert.equal(h.isValidWebsite('/assets/x.png'), true);
});
test('email check and preview links', () => {
  assert.equal(h.isValidEmail('a@b.co'), true); assert.equal(h.isValidEmail('a@b'), false);
  assert.equal(h.toPreviewHref('email', 'a@b.co'), 'mailto:a@b.co'); assert.equal(h.toPreviewHref('website', 'example.com'), 'https://example.com');
  assert.equal(h.toPreviewHref('website', 'ftp://example.com'), null);
});
test('absolute errors only for name and symbol; blank logo falls back to the anonymous avatar', () => {
  assert.equal(h.getAbsoluteFieldError('name', 'a'.repeat(51)), 'Name too large'); assert.equal(h.getAbsoluteFieldError('email', 'a'.repeat(999)), null);
  assert.equal(h.ensureAbsoluteAssetURL(''), '/assets/anon.png'); assert.equal(h.ensureAbsoluteAssetURL('assets/x.png'), '/assets/x.png');
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
