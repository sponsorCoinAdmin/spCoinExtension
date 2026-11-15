// File: test/meritApproval.test.mjs
//
// The approval gate (request / resolve / settle) now lives in the package. Run: node test/meritApproval.test.mjs
// MUTANT=approveSkipsSettling|rejectKeepsRequest|backgroundNotPreempted run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const ts = createRequire(path.join(WEB, 'package.json'))('typescript');
const m = process.env.MUTANT;
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'approval', 'meritApproval.ts'), 'utf8').replace(/\r\n/g, '\n');
const mutate = (from, to) => { assert.ok(src.includes(from), `mutant anchor missing: ${from}`); src = src.replace(from, to); };
if (m === 'approveSkipsSettling') mutate("{ ...currentRequest, phase: 'settling' }", 'currentRequest');
if (m === 'rejectKeepsRequest') mutate('currentRequest = null;\n    notify();\n    resolve(false);', 'notify();\n    resolve(false);');
if (m === 'backgroundNotPreempted') mutate('currentRequest.background && !details.background', 'false');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)(() => ({}), mod, mod.exports);
const a = mod.exports;

let failed = 0;
const test = async (name, fn) => {
  try { await fn(); console.log('PASS ' + name); } catch (e) { failed++; console.log('FAIL ' + name + '\n  ' + e.message); }
};
const base = { label: 'stake', signerAddress: '0xabc', chainId: 31337 };

await test('a request opens in the decide phase, subscribers see it, approval moves it to settling and clear removes it', async () => {
  const seen = [];
  const off = a.subscribeMeritApproval((r) => seen.push(r?.phase ?? null));
  const p = a.requestMeritWriteApproval(base);
  assert.equal(a.getPendingMeritApproval().phase, 'decide');
  a.resolveMeritApproval(true);
  assert.equal(await p, true);
  assert.equal(a.getPendingMeritApproval().phase, 'settling');
  a.clearSettledMeritApproval();
  assert.equal(a.getPendingMeritApproval(), null);
  off();
  assert.deepEqual(seen, [null, 'decide', 'settling', null]);
});

await test('a rejection resolves false and clears the request', async () => {
  const p = a.requestMeritWriteApproval(base);
  a.resolveMeritApproval(false);
  assert.equal(await p, false);
  assert.equal(a.getPendingMeritApproval(), null);
});

await test('a second foreground request while one is pending is refused; clearSettled does nothing in the decide phase', async () => {
  const p = a.requestMeritWriteApproval(base);
  await assert.rejects(() => a.requestMeritWriteApproval(base), /already pending/);
  a.clearSettledMeritApproval();
  assert.ok(a.getPendingMeritApproval());
  a.resolveMeritApproval(false);
  await p;
});

await test('a foreground request preempts a pending background one (which resolves false)', async () => {
  const bg = a.requestMeritWriteApproval({ ...base, background: true });
  const fg = a.requestMeritWriteApproval(base);
  assert.equal(await bg, false);
  assert.equal(a.getPendingMeritApproval().background, undefined);
  a.resolveMeritApproval(true);
  assert.equal(await fg, true);
  a.clearSettledMeritApproval();
});

await test('requestReauthentication re-opens the decide phase locked; with nothing pending it answers false', async () => {
  assert.equal(await a.requestReauthentication(), false);
  const first = a.requestMeritWriteApproval(base);
  a.resolveMeritApproval(true);
  await first;
  const again = a.requestReauthentication();
  const r = a.getPendingMeritApproval();
  assert.equal(r.phase, 'decide');
  assert.equal(r.isLocked, true);
  a.resolveMeritApproval(true);
  assert.equal(await again, true);
  a.clearSettledMeritApproval();
});

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
