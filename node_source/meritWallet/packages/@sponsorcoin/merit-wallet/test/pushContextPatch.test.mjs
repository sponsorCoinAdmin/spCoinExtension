// File: test/pushContextPatch.test.mjs
//
// docs/meritMigration.txt row 32: pushContextPatch (src/sync/pushContextPatch.ts), the one best-effort push that four callers used to copy. Pins the order of calls, that a failure at either step is swallowed and reported, and that the settled approval is cleared in EVERY case.
// Run: node test/pushContextPatch.test.mjs
// MUTANT=noFinally|throws|wrongKey|noRevision|clearBeforePush|failedHookBreaks run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'sync', 'pushContextPatch.ts'), 'utf8').split(String.fromCharCode(13)).join('');
const m = process.env.MUTANT;
if (m === 'noFinally') src = src.replace('  } finally {\n    host.clearSettledMeritApproval();\n  }', '  }');
if (m === 'throws') src = src.replace("    try {\n      hooks.onFailed?.(error);\n    } catch {\n      // a logging hook must not break the push's own guarantee\n    }", '    throw error;');
if (m === 'wrongKey') src = src.replace('host.pushExchangeContextPatch(plan.key,', 'host.pushExchangeContextPatch(plan.address,');
if (m === 'noRevision') src = src.replace('hooks.onPushed?.(plan.key, result.revision);', 'hooks.onPushed?.(plan.key, 0);');
if (m === 'clearBeforePush') src = src.replace("    const token = await host.ensureSyncToken(", "    host.clearSettledMeritApproval();\n    const token = await host.ensureSyncToken(");
if (m === 'failedHookBreaks') src = src.replace("    try {\n      hooks.onFailed?.(error);\n    } catch {\n      // a logging hook must not break the push's own guarantee\n    }", '    hooks.onFailed?.(error);');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { pushContextPatch } = mod.exports;

const PLAN = { chainId: 31337, address: '0xAbC', key: '0xabc', rpcUrl: 'http://rpc' };
const world = (over = {}) => {
  const log = [];
  return { log, host: {
    ensureSyncToken: async (p) => { log.push(['ensureSyncToken', p]); if (over.tokenFails) throw new Error('no token'); return 'TOKEN'; },
    pushExchangeContextPatch: async (key, patch, token, source) => { log.push(['push', key, patch, token, source]); if (over.pushFails) throw new Error('server down'); return { revision: 7 }; },
    clearSettledMeritApproval: () => log.push(['clear']),
  } };
};
const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('a good push: token for the account, then the patch under the lower-case key with that token, then the revision is reported, then the approval is cleared', async () => {
  const w = world(); const pushed = [];
  await pushContextPatch(w.host, PLAN, { network: { appChainId: 1 } }, { onPushed: (k, r) => pushed.push([k, r]) });
  assert.deepEqual(w.log, [['ensureSyncToken', { chainId: 31337, activeAccountAddress: '0xAbC', rpcUrl: 'http://rpc' }], ['push', '0xabc', { network: { appChainId: 1 } }, 'TOKEN', 'MeritExchangeContext'], ['clear']]);
  assert.deepEqual(pushed, [['0xabc', 7]]);
});
await test('the source label can be given', async () => {
  const w = world();
  await pushContextPatch(w.host, PLAN, {}, {}, 'Other');
  assert.equal(w.log.find((l) => l[0] === 'push')[4], 'Other');
});
await test('no token: nothing is pushed, the failure is reported, nothing is thrown, the approval is still cleared', async () => {
  const w = world({ tokenFails: true }); const failed = [];
  await pushContextPatch(w.host, PLAN, {}, { onFailed: (e) => failed.push(e.message) });
  assert.deepEqual(w.log.map((l) => l[0]), ['ensureSyncToken', 'clear']);
  assert.deepEqual(failed, ['no token']);
});
await test('the server refuses: the failure is reported, nothing is thrown, the approval is still cleared, no revision is reported', async () => {
  const w = world({ pushFails: true }); const failed = []; const pushed = [];
  await pushContextPatch(w.host, PLAN, {}, { onFailed: (e) => failed.push(e.message), onPushed: (k, r) => pushed.push(r) });
  assert.deepEqual(w.log.map((l) => l[0]), ['ensureSyncToken', 'push', 'clear']);
  assert.deepEqual(failed, ['server down']);
  assert.deepEqual(pushed, []);
});
await test('a logging hook that throws cannot break the guarantee (still resolves, still clears)', async () => {
  const w = world({ pushFails: true });
  await pushContextPatch(w.host, PLAN, {}, { onFailed: () => { throw new Error('logger broke'); } });
  assert.deepEqual(w.log.map((l) => l[0]), ['ensureSyncToken', 'push', 'clear']);
});
await test('with no hooks at all a failure is simply swallowed', async () => {
  const w = world({ tokenFails: true });
  await pushContextPatch(w.host, PLAN, {});
  assert.deepEqual(w.log.map((l) => l[0]), ['ensureSyncToken', 'clear']);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
