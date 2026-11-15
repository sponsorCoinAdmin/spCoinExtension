// File: test/parseDecimalAmount.test.mjs
//
// 2026-11-11 (owner: "I cannot reset the sell token back to 0, it flashes back to 1"): the Swap tab's amount box pushes what is typed into the exchange context. An EMPTY box used to push
// nothing (parseDecimalAmount returned undefined), so the context kept the old amount and the box re-synced to it. ORACLE: the rule written out by hand: "" is 0, "0" is 0, a number is
// its value in the token's smallest unit, and only text that is not a number yet ("." or letters) pushes nothing.
// Run: node test/parseDecimalAmount.test.mjs   MUTANT=emptyIsUndefined runs against the old behaviour and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..');
const ts = createRequire(path.join(WEB, 'package.json'))('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'swap', 'parseDecimalAmount.ts'), 'utf8').replace(/\r\n/g, '\n');
if (process.env.MUTANT === 'emptyIsUndefined') {
  assert.ok(src.includes('if (!trimmed) return 0n;'), 'mutant anchor missing');
  src = src.replace('if (!trimmed) return 0n;', "if (!trimmed) return undefined;");
}
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { parseDecimalAmount: parse } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('an empty box is an amount of 0 (the bug: it pushed nothing, so the old amount came back)', () => {
  assert.equal(parse('', 18), 0n);
  assert.equal(parse('   ', 18), 0n);
});
await test('"0" and "0.0" are 0', () => {
  assert.equal(parse('0', 18), 0n);
  assert.equal(parse('0.0', 18), 0n);
});
await test('a number is its value in the smallest unit', () => {
  assert.equal(parse('1', 18), 10n ** 18n);
  assert.equal(parse('1.5', 18), 15n * 10n ** 17n);
  assert.equal(parse('.5', 18), 5n * 10n ** 17n);
  assert.equal(parse('12.', 6), 12n * 10n ** 6n);
  assert.equal(parse('0.000001', 6), 1n);
});
await test('digits past the token\'s decimals are dropped, not rounded', () => {
  assert.equal(parse('1.23456789', 6), 1234567n);
});
await test('only a not-yet-a-number state pushes nothing', () => {
  assert.equal(parse('.', 18), undefined);
  assert.equal(parse('abc', 18), undefined);
  assert.equal(parse('1e5', 18), undefined);
  assert.equal(parse('-1', 18), undefined);
  assert.equal(parse('1.2.3', 18), undefined);
});

for (const [status, name] of results) console.log(status.padEnd(5) + name);
const failed = results.filter(([s]) => s === 'FAIL').length;
console.log('\n' + (failed ? failed + ' FAILED' : 'all ' + results.length + ' passed'));
process.exit(failed ? 1 : 0);
