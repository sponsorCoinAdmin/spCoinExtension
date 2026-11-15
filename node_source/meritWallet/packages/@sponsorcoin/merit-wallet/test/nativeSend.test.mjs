// File: test/nativeSend.test.mjs
//
// docs/meritMigration.txt row 34: the Send tab hands the native coin to the host as its PLACEHOLDER address (0xEeee...). A host that read that as an ERC20 contract sent a call with no value to the placeholder (found live on the web, component body). The shared rule is isNativePlaceholder; the package exports it so a host asks the same question the shared executeSend asks.
// Run: node test/nativeSend.test.mjs
// MUTANT=noExport|wrongPlaceholder|caseSensitive run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', 'src');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(SRC, ...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };
let index = read('index.ts');
let send = read('send', 'sendTransfer.ts');
if (m === 'noExport') index = swap(index, 'executeSend, isNativePlaceholder }', 'executeSend }');
if (m === 'wrongPlaceholder') send = swap(send, "'0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'", "'0x0000000000000000000000000000000000000000'");
if (m === 'caseSensitive') send = swap(send, 'String(address ?? \'\').trim().toLowerCase() === NATIVE_PLACEHOLDER', 'String(address ?? \'\').trim() === NATIVE_PLACEHOLDER');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the package exports the native-placeholder rule a host uses', () => {
  assert.match(index, /export \{ parseDecimalToWei, encodeErc20Transfer, prepareTransfer, executeSend, isNativePlaceholder \} from '\.\/send\/sendTransfer';/);
});
await test('the rule is the 0xEeee placeholder, any letter case', () => {
  // evaluate the function body from the source
  const body = /export function isNativePlaceholder\(address: string \| undefined\): boolean \{\n  return ([^\n]+);\n\}/.exec(send);
  assert.ok(body, 'function not found');
  const placeholder = /const NATIVE_PLACEHOLDER = '([^']+)';/.exec(send)[1];
  const fn = new Function('NATIVE_PLACEHOLDER', 'address', 'return ' + body[1].replace(/ as string/g, ''));
  assert.equal(fn(placeholder, '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'), true);
  assert.equal(fn(placeholder, '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913'), false);
  assert.equal(fn(placeholder, undefined), false);
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
