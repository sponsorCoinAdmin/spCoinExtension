// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/accountProfile.test.mjs
//
// Tests for the account profile form rules (src/account/profileForm.ts). Run: node test/accountProfile.test.mjs.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');

function load(file, shims = {}) {
  let src = fs.readFileSync(path.join(HERE, '..', 'src', 'account', file), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const m = { exports: {} };
  new Function('require', 'module', 'exports', js)((name) => shims[name] ?? req(name), m, m.exports);
  return m.exports;
}
const form = load('profileForm.ts');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

const FIELDS = { name: 'Doggie', symbol: 'Hot Dog', email: 'dog@example.com', website: 'dog.example.com', description: 'A good dog' };

await test('the field rules are the web form\'s: limits and the email / website checks', () => {
  assert.equal(form.validateProfileField('name', 'x'.repeat(51)), 'Name too large');
  assert.equal(form.validateProfileField('symbol', 'x'.repeat(11)), 'Symbol too large');
  assert.equal(form.validateProfileField('description', 'x'.repeat(1025)), 'Description too large');
  assert.equal(form.validateProfileField('email', 'nope'), 'Invalid email address');
  assert.equal(form.validateProfileField('email', ''), null);
  assert.equal(form.validateProfileField('website', 'localhost'), 'Invalid website URL');
  assert.equal(form.validateProfileField('website', 'dog.example.com'), null);
  assert.deepEqual(form.validateProfile(FIELDS), {});
  assert.equal(form.profileChanged(FIELDS, { ...FIELDS, name: 'Doggie ' }), false);
  assert.equal(form.profileChanged(FIELDS, { ...FIELDS, name: 'Cat' }), true);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
