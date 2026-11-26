// File: test/testSites.test.mjs
//
// 2026-11-24: the Test Sites section's pure part (src/testSites.ts): what the fields may hold and the link they build. Run with `npm test` in this package.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// testSites.ts has no imports: it is transpiled on demand and run, so the test needs no build step
const here = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
const source = fs.readFileSync(path.join(here, '..', 'src', 'testSites.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { DEFAULT_TEST_SITE, TEST_SITE_PROTOCOLS, TEST_SITE_TYPES, digitsOnly, testSiteProblem, buildTestSiteUrl, testSiteWindowFeatures } = mod.exports;

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const form = (over = {}) => ({ ...DEFAULT_TEST_SITE, ...over });

test('the defaults: http (the local servers are plain http), localhost, port 3101, height max', () => {
  assert.equal(DEFAULT_TEST_SITE.protocol, 'http');
  assert.equal(DEFAULT_TEST_SITE.host, 'localhost');
  assert.equal(DEFAULT_TEST_SITE.port, '3101');
  assert.equal(DEFAULT_TEST_SITE.height, 'max');
  assert.deepEqual([...TEST_SITE_PROTOCOLS], ['http', 'https']);
  assert.deepEqual([...TEST_SITE_TYPES], ['WEB', 'WEB_APP', 'EXT', 'ANDROID', 'IPHONE']);
});

test('the default fields build a link', () => {
  assert.equal(buildTestSiteUrl(form()), 'http://localhost:3101/');
  assert.equal(buildTestSiteUrl(form({ protocol: 'https' })), 'https://localhost:3101/');
});

test('the port box takes digits only', () => {
  assert.equal(digitsOnly('31a0-2 x'), '3102');
  assert.equal(digitsOnly('abc'), '');
});

test('the port must be 1 to 65535', () => {
  assert.equal(buildTestSiteUrl(form({ port: '' })), undefined);
  assert.equal(buildTestSiteUrl(form({ port: '0' })), undefined);
  assert.equal(buildTestSiteUrl(form({ port: '65536' })), undefined);
  assert.equal(buildTestSiteUrl(form({ port: '65535' })), 'http://localhost:65535/');
  assert.equal(buildTestSiteUrl(form({ port: '3102' })), 'http://localhost:3102/');
});

test('the host must be a name, an address, or an IPv6 address in brackets', () => {
  assert.equal(buildTestSiteUrl(form({ host: '127.0.0.1' })), 'http://127.0.0.1:3101/');
  assert.equal(buildTestSiteUrl(form({ host: 'sponsorcoin.org' })), 'http://sponsorcoin.org:3101/');
  assert.equal(buildTestSiteUrl(form({ host: '[::1]' })), 'http://[::1]:3101/');
  assert.equal(buildTestSiteUrl(form({ host: '  localhost  ' })), 'http://localhost:3101/');
  for (const bad of ['', '   ', 'local host', 'a/b', 'a@b', 'host:80', '-bad', 'bad-', 'x?y=1', 'javascript:alert(1)']) assert.notEqual(testSiteProblem(form({ host: bad })), undefined, `host "${bad}" must be refused`);
});

test('width and height: a size from 200 to 4000, and the height may be max', () => {
  assert.equal(testSiteProblem(form({ width: '460', height: 'max' })), undefined);
  assert.equal(testSiteProblem(form({ height: 'MAX' })), undefined);
  assert.equal(testSiteProblem(form({ height: '860' })), undefined);
  assert.notEqual(testSiteProblem(form({ width: '' })), undefined);
  assert.notEqual(testSiteProblem(form({ width: '199' })), undefined);
  assert.notEqual(testSiteProblem(form({ width: '4001' })), undefined);
  assert.notEqual(testSiteProblem(form({ height: 'tall' })), undefined);
  assert.notEqual(testSiteProblem(form({ height: '10' })), undefined);
});

test('the harness options become the link\'s query', () => {
  assert.equal(buildTestSiteUrl(form({ port: '3102', type: 'EXT' })), 'http://localhost:3102/?type=EXT');
  assert.equal(buildTestSiteUrl(form({ port: '3102', compare: true, log: true })), 'http://localhost:3102/?compare=1&log=1');
  assert.equal(buildTestSiteUrl(form({ port: '3102', type: 'WEB_APP', compare: true, log: true })), 'http://localhost:3102/?type=WEB_APP&compare=1&log=1');
  assert.equal(buildTestSiteUrl(form({ type: 'ADMIN' })), undefined);
});

test('the window is a popup of the chosen size; max is the screen\'s height', () => {
  // 2026-11-26: the width is SCREEN pixels; at pixel ratio 1 with nothing measured the window.open width is the width less Chrome's 17 extra units
  assert.equal(testSiteWindowFeatures(form(), 1040), 'popup,width=443,height=1040,left=0,top=0');
  assert.equal(testSiteWindowFeatures(form({ width: '430', height: '780' }), 1040), 'popup,width=413,height=780,left=0,top=0');
  // at pixel ratio 2.8 a width of 700 screen pixels asks for 700 / 2.8 - 17 = 233 units; a measured window (landed at 700 screen pixels from a request of 233) gives the same
  assert.equal(testSiteWindowFeatures(form({ width: '700' }), 1040, 2.8), 'popup,width=233,height=1040,left=0,top=0');
});

console.log(`${passed} passed`);
