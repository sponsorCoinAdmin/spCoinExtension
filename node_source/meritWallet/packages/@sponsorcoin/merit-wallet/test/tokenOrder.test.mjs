// File: test/tokenOrder.test.mjs
//
// docs/meritMigration.txt row 16: one token-list order in every app, whichever source answered. The hosted tokens API (the web app) answers by address alone; the extension's bundled feed was sorted by the component. Both now pass
// through the same sort: the native token first, then the spCoins, then the rest by address.
// Run: node test/tokenOrder.test.mjs
// MUTANT=noSharedSort|rankNativeLast|rankIgnoresSpCoin run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const m = process.env.MUTANT;
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'panels', 'meritWalletDataFetch.ts'), 'utf8').replace(/\r\n/g, '\n');
if (m === 'noSharedSort') src = swap(src, '    items = [...items].sort(', '    void ([...items].sort(').replace('a.address.toLowerCase().localeCompare(b.address.toLowerCase()));\n    return await withAssetIcons', 'a.address.toLowerCase().localeCompare(b.address.toLowerCase())));\n    return await withAssetIcons');
if (m === 'rankNativeLast') src = swap(src, "=== NATIVE_TOKEN_SENTINEL ? 0 :", "=== NATIVE_TOKEN_SENTINEL ? 3 :");
if (m === 'rankIgnoresSpCoin') src = swap(src, ': isSpCoin({ address: t.address, chainId } as never) ? 1 : 2);', ': 2);');

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the rank is native 0, spCoin 1, rest 2', () => {
  assert.match(src, /const tokenRank = \(t: \{ address: string \}, chainId: number\): number => \(t\.address\.toLowerCase\(\) === NATIVE_TOKEN_SENTINEL \? 0 : isSpCoin\(\{ address: t\.address, chainId \} as never\) \? 1 : 2\);/);
});
await test('every source goes through the one sort (hosted and bundled)', () => {
  assert.match(src, /items = \[\.\.\.items\]\.sort\(\(a, b\) => tokenRank\(a, chainId\) - tokenRank\(b, chainId\) \|\| a\.address\.toLowerCase\(\)\.localeCompare\(b\.address\.toLowerCase\(\)\)\);\n\s+return await withAssetIcons/);
  assert.match(src, /\.sort\(\(a, b\) => tokenRank\(a as \{ address: string \}, chainId\)/);
});

let failed = 0;
for (const [status, name] of results) { console.log(status + ' ' + name); if (status === 'FAIL') failed++; }
process.exit(failed ? 1 : 0);
