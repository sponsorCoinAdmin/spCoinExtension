// File: test/tabStack.test.mjs
//
// 2026-10-16 (owner rule; docs/design/spcoinPackagesDesign.txt 8.5.10) -- selecting a tab against the displayStack (the pure rule in spcoin-common panels/tabStack.ts, which usePanelTree().validateTab runs).
// A tab is on the stack at most once; a tab's section is its entry plus the non-tab entries after it, up to the next tab. Selecting a tab already on the stack pushes nothing and removes everything after its section; a tab not on the stack is pushed by the caller.
// Run: node test/tabStack.test.mjs      MUTANT=keepLater|noCut|noBootPush runs against a deliberately broken copy (must FAIL).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
const file = path.join(HERE, '..', '..', '..', '..', '..', 'spCoinCommon', 'packages', '@sponsorcoin', 'spcoin-common', 'src', 'panels', 'tabStack.ts');
let src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const mutate = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
const m = process.env.MUTANT;
if (m === 'keepLater') mutate('stack.slice(0, end)', 'stack.slice()');
if (m === 'noCut') mutate('if (isTab(stack[i])) { end = i; break; }', 'if (false) { end = i; break; }');
if (m === 'noBootPush') mutate('if (stack.includes(visibleTab)) return null;', 'return null;');
const mod = { exports: {} };
new Function('module', 'exports', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(mod, mod.exports);
const { stackAfterTabSelect, tabToPushBefore } = mod.exports;

// ids: tabs A..D = 1..4, panels P1 = 11, P2 = 12, P3 = 13, P7 = 17
const [A, B, C, D, P1, P2, P3, P7] = [1, 2, 3, 4, 11, 12, 13, 17];
const isTab = (id) => id >= 1 && id <= 4;
let passed = 0;
const t = (name, fn) => { try { fn(); passed++; console.log('PASS', name); } catch (e) { console.error('FAIL', name, '-', e.message); process.exitCode = 1; } };

const stack = [A, P1, P7, B, P7, P3, P2, C, P3, D];
t("selecting Tab B pops D, Panel 3 and Tab C and leaves Panel 2 on top (the owner's example)", () => {
  const r = stackAfterTabSelect(stack, B, isTab);
  assert.equal(r.found, true);
  assert.deepEqual(r.stack, [A, P1, P7, B, P7, P3, P2]);
  assert.deepEqual(r.popped, [D, P3, C]);
});
t('selecting the tab you are on, with covering panels, changes nothing', () => {
  const r = stackAfterTabSelect([A, P1, B, P7, P2], B, isTab);
  assert.deepEqual(r.stack, [A, P1, B, P7, P2]);
  assert.deepEqual(r.popped, []);
});
t('selecting an earlier tab pops every later tab and keeps its own covering panels', () => {
  const r = stackAfterTabSelect([A, P1, P7, B, P2, C], A, isTab);
  assert.deepEqual(r.stack, [A, P1, P7]);
});
t('a tab not on the stack is reported not found and the stack is untouched (the caller pushes it)', () => {
  const r = stackAfterTabSelect([A, P1, B], C, isTab);
  assert.equal(r.found, false);
  assert.deepEqual(r.stack, [A, P1, B]);
  assert.deepEqual(r.popped, []);
});
t('an empty stack: not found', () => {
  assert.equal(stackAfterTabSelect([], A, isTab).found, false);
});
t('the input stack is never modified', () => {
  const copy = [...stack];
  stackAfterTabSelect(stack, B, isTab);
  assert.deepEqual(stack, copy);
});
t('the boot tab, visible but never pushed, is pushed before a panel opened over it (else the list counts as another tab section)', () => {
  assert.equal(tabToPushBefore([], A, isTab), A);
  assert.equal(tabToPushBefore([D, P1], A, isTab), A);
});
t('no tab push when the visible tab is already on the stack, or when no tab is visible (a list covers it)', () => {
  assert.equal(tabToPushBefore([A, P1], A, isTab), null);
  assert.equal(tabToPushBefore([A, B, P1], A, isTab), null);
  assert.equal(tabToPushBefore([A], null, isTab), null);
  assert.equal(tabToPushBefore([A], P1, isTab), null);
});
console.log(`tabStack: ${passed} passed`);
