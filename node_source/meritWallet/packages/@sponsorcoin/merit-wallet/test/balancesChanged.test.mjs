// File: test/balancesChanged.test.mjs
//
// Tests for the engine's balancesChangedStore (the "a confirmed write changed some balance" signal the balance rows subscribe to). Run: node test/balancesChanged.test.mjs
// MUTANT=noNotify|noUnsubscribe run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
const FILE = path.join(HERE, '..', '..', '..', '..', '..', 'spCoinExchangeEngine', 'packages', '@sponsorcoin', 'spcoin-exchange-engine', 'src', 'stores', 'balancesChangedStore.ts');
let src = fs.readFileSync(FILE, 'utf8');
if (process.env.MUTANT === 'noNotify') src = src.replace('for (const listener of listeners) listener();', '');
if (process.env.MUTANT === 'noUnsubscribe') src = src.replace('return () => listeners.delete(listener);', 'return () => false;');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { balancesChangedStore: store } = mod.exports;

const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

test('bump raises the snapshot by one each time', () => {
  const before = store.getSnapshot(); store.bump(); store.bump();
  assert.equal(store.getSnapshot(), before + 2);
});
test('every subscriber hears each bump', () => {
  let a = 0; let b = 0; const offA = store.subscribe(() => a++); const offB = store.subscribe(() => b++);
  store.bump(); store.bump(); offA(); offB();
  assert.deepEqual([a, b], [2, 2]);
});
test('after unsubscribing a listener hears nothing more', () => {
  let n = 0; const off = store.subscribe(() => n++); store.bump(); off(); store.bump(); store.bump();
  assert.equal(n, 1);
});
test('the server snapshot is a constant zero (no hydration mismatch)', () => {
  store.bump(); assert.equal(store.getServerSnapshot(), 0);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
