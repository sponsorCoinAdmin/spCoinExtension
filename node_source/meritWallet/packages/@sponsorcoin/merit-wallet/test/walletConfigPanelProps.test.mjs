// File: test/walletConfigPanelProps.test.mjs
//
// Tests for the persisted-password time limit helpers of the shared Config panel props (src/walletConfigPanelProps.tsx, docs/nodeSourceMigrationPlan.txt row 11): splitting hours into the two picker values and joining them back with the
// one-minute / 24-hour bounds. Run: node test/walletConfigPanelProps.test.mjs
// MUTANT=noMinimum|noMaximum|nanAsNumber|floorMinutes run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'walletConfigPanelProps.tsx'), 'utf8').replace(/\r\n/g, '\n');
const m = process.env.MUTANT;
// the clamp lives in walletConfig.ts now (docs/meritMigration.txt row 21): load it from there, with the mutants applied to it
let cfgSrc = fs.readFileSync(path.join(HERE, '..', 'src', 'walletConfig.ts'), 'utf8').split(String.fromCharCode(13)).join('');
if (m === 'noMinimum') cfgSrc = cfgSrc.replace('Math.min(24, Math.max(1 / 60, hours))', 'Math.min(24, hours)');
if (m === 'noMaximum') cfgSrc = cfgSrc.replace('Math.min(24, Math.max(1 / 60, hours))', 'Math.max(1 / 60, hours)');
const cfgMod = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(cfgSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)((id) => ({ react: { useCallback: (f) => f, useEffect() {}, useRef: () => ({}), useState: (v) => [v, () => {}] } }[id] || {}), cfgMod, cfgMod.exports);
if (m === 'nanAsNumber') src = src.replace('(Number.isFinite(hours) ? hours : 0)', 'hours');
if (m === 'floorMinutes') src = src.replace('minutes: Math.round((hours - whole) * 60)', 'minutes: Math.floor((hours - whole) * 60)');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)((id) => ({ react: { createElement: () => null }, '@sponsorcoin/spcoin-panels': {}, './walletConfig': cfgMod.exports }[id]), mod, mod.exports);
const { splitPersistedTimeout, joinPersistedTimeout, HOUR_OPTIONS, MINUTE_OPTIONS } = mod.exports;

const results = [];
const test = (name, fn) => { try { fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('split: 1.5 h is 1 h 30 m; 24 h is 24 h 0 m; one minute is 0 h 1 m; 2 h is 2 h 0 m', () => {
  assert.deepEqual(splitPersistedTimeout(1.5), { hours: 1, minutes: 30 });
  assert.deepEqual(splitPersistedTimeout(24), { hours: 24, minutes: 0 });
  assert.deepEqual(splitPersistedTimeout(1 / 60), { hours: 0, minutes: 1 });
  assert.deepEqual(splitPersistedTimeout(2), { hours: 2, minutes: 0 });
});
test('split then join gives the same time for every whole minute in a day', () => {
  for (let minutes = 1; minutes <= 24 * 60; minutes += 7) {
    const hours = minutes / 60; const s = splitPersistedTimeout(hours);
    close(joinPersistedTimeout(s.hours, s.minutes), hours);
  }
});
test('join: never less than one minute, never more than 24 hours', () => {
  close(joinPersistedTimeout(0, 0), 1 / 60);
  close(joinPersistedTimeout(30, 0), 24);
  close(joinPersistedTimeout(24, 59), 24);
});
test('join: a missing number counts as zero (a picker that has no value yet)', () => {
  close(joinPersistedTimeout(Number.NaN, 30), 0.5);
  close(joinPersistedTimeout(2, Number.NaN), 2);
});
test('the picker lists are 0-24 hours and 0-59 minutes', () => {
  assert.equal(HOUR_OPTIONS.length, 25); assert.equal(HOUR_OPTIONS[24], 24);
  assert.equal(MINUTE_OPTIONS.length, 60); assert.equal(MINUTE_OPTIONS[59], 59);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
