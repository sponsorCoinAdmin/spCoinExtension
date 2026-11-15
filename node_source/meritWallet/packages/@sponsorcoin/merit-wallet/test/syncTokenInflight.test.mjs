// File: test/syncTokenInflight.test.mjs
//
// docs/design/accountAuthDesign.txt rows 11 and 13 (found live with a real MetaMask, 2026-10-12): when an account becomes active the account, network and token syncs each ask for a sync token at once, and every ask used to start its own mint; with MetaMask
// every mint is a signature request, so the person saw the same "Account Write Authorization" prompt three or four times. ensureSyncToken (the web's lib/structure/exchangeContextCore/client/ensureSyncToken.ts) now runs ONE mint at a time per account:
// callers that arrive while it runs share its result, a later call after it finished uses the cached token, a different account mints its own, and a failed mint is not remembered. Run: node test/syncTokenInflight.test.mjs
// MUTANT=noGuard|guardIgnoresAddress|neverCleared run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', '..', '..', '..', '..', '..');
const req = createRequire(path.join(WEB, 'package.json'));
const ts = req('typescript');
const m = process.env.MUTANT;
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'sync', 'syncToken.ts'), 'utf8').replace(/\r\n/g, '\n');
const swap = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
if (m === 'noGuard') swap('if (inFlight?.address === normalized) return inFlight.promise;', '');
if (m === 'guardIgnoresAddress') swap('if (inFlight?.address === normalized) return inFlight.promise;', 'if (inFlight) return inFlight.promise;');
if (m === 'neverCleared') swap('if (inFlight?.promise === promise) inFlight = null;', '');

let mints = 0;
let failNext = false;
const gate = { release: undefined };
const fakeSigner = { signMessage: async () => 'sig' };
const modules = {
  '@/lib/spCoin/getConnectedSigner': { getConnectedSigner: async () => { mints += 1; await new Promise((r) => { gate.release = r; setTimeout(r, 30); }); if (failNext) throw new Error('rejected'); return fakeSigner; } },
  '@/components/wallet/lib/meritConnect': { isSyncAuthorizationRequired: () => false, isSyncDisabled: () => false },
  './exchangeContextClient': { signInForSync: async (address) => `v1.${(Date.now() + 600000).toString(36)}.${address}.sig` },
};
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
// docs/meritMigration.txt row 32: the policy lives in the package (createSyncTokenProvider); the web's ensureSyncToken.ts is only an adapter.
const provider = mod.exports.createSyncTokenProvider({
  getSigner: modules['@/lib/spCoin/getConnectedSigner'].getConnectedSigner,
  signInForSync: modules['./exchangeContextClient'].signInForSync,
  isSyncDisabled: modules['@/components/wallet/lib/meritConnect'].isSyncDisabled,
  isSyncAuthorizationRequired: modules['@/components/wallet/lib/meritConnect'].isSyncAuthorizationRequired,
});
const ensureSyncToken = provider.ensureSyncToken;
const _resetSyncTokenCacheForTests = provider.reset;

const A = '0x58A57ed9d8d624cBD12e2C467D34787555bB1b25';
const B = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const ask = (address) => ensureSyncToken({ chainId: 1, activeAccountAddress: address, rpcUrl: '' });
const results = [];
const test = async (name, fn) => { _resetSyncTokenCacheForTests(); mints = 0; failNext = false; try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('callers that ask at the same time share ONE mint (one MetaMask prompt, not one per caller)', async () => {
  const tokens = await Promise.all([ask(A), ask(A), ask(A), ask(A)]);
  assert.equal(mints, 1);
  assert.equal(new Set(tokens).size, 1);
});

await test('after the mint finished the cached token is used: no new mint', async () => {
  await ask(A);
  await ask(A);
  assert.equal(mints, 1);
});

await test('a different account mints its own token', async () => {
  await Promise.all([ask(A), ask(B)]);
  assert.equal(mints, 2);
});

await test('a failed mint is not remembered: the next ask mints again, and everyone waiting on the failed one gets its error', async () => {
  failNext = true;
  const results2 = await Promise.allSettled([ask(A), ask(A)]);
  assert.deepEqual(results2.map((r) => r.status), ['rejected', 'rejected']);
  assert.equal(mints, 1);
  failNext = false;
  await ask(A);
  assert.equal(mints, 2);
});

await test('the guard is cleared when the mint ends, so it cannot hold later asks', async () => {
  await ask(A);
  _resetSyncTokenCacheForTests();
  mints = 0;
  await ask(A);
  assert.equal(mints, 1);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
