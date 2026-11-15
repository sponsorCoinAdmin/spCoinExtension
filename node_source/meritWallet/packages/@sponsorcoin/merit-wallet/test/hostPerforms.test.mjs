// File: test/hostPerforms.test.mjs
//
// docs/meritMigration.txt row 10: a host that performs an add entry itself for its own wallet (the web app's dev keystore: no vault importKey / importPhrase flags, but its Add flow writes the key) is not told "cannot import" by the wallet's feature flags; for any other wallet the flags still decide.
// Run: node test/hostPerforms.test.mjs
// MUTANT=performsIgnored|allTargets|hostReasonDropped run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };
let flow = read(HERE, '..', 'src', 'account', 'AddAccountFlow.tsx');
if (m === 'performsIgnored') flow = swap(flow, 'for (const entry of host.performs ?? []) delete featureReasons[entry];', '');
if (m === 'allTargets') flow = swap(flow, "if (target && hostTargets?.split(',').includes(target.id)) for", 'if (target) for');
if (m === 'hostReasonDropped') flow = swap(flow, '{ ...featureReasons, ...(host.unavailable ?? {}) }', '{ ...featureReasons }');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
await test('the host contract has performs, documented against the wallet flags', () => {
  assert.match(flow, /performs\?: readonly AddAccountEntry\[\];/);
});
await test('performed entries lose the feature reason only for the host\'s own target wallets', () => {
  assert.match(flow, /if \(target && hostTargets\?\.split\(','\)\.includes\(target\.id\)\) for \(const entry of host\.performs \?\? \[\]\) delete featureReasons\[entry\];/);
});
await test('the host\'s own unavailable reasons still win', () => {
  assert.match(flow, /\{ \.\.\.featureReasons, \.\.\.\(host\.unavailable \?\? \{\}\) \}/);
});
let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
