// File: test/chainReconcile.test.mjs
//
// docs/meritMigration.txt row 25: reconcileChain (src/chain/chainReconcile.ts) is the rules of the web's useNetworkController, moved. ORACLE: the original effect body, kept verbatim as test/fixtures/useNetworkController.reconcile.original.txt, run with recording fakes
// over EVERY combination of the inputs (and its refs), each run twice in a row on the same refs (so the log de-duplication and the "previous" memory are exercised). The new function must leave exactly the same calls, in the same order, with the same log payloads,
// and the same refs afterwards.
// Run: node test/chainReconcile.test.mjs
// MUTANT=noTrustLs|adoptNotOnlyOnDefault|appChangedAlone|noSyncChain|noZeroOnDisconnect|justConnectedWrong|noTrustedMark|noDedupe run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
const m = process.env.MUTANT;
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'chain', 'chainReconcile.ts'), 'utf8').split(String.fromCharCode(13)).join('');
const swap = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
if (m === 'noTrustLs') swap('if (hydratedFromLocalStorage && isFirstConnectThisSession) {', 'if (false) {');
if (m === 'adoptNotOnlyOnDefault') swap('appChainId === 1 && walletChainId !== 1', 'walletChainId !== 1');
if (m === 'appChangedAlone') swap('if (appChanged && !walletChanged) {', 'if (appChanged) {');
if (m === 'noSyncChain') swap('host.syncNetworkChainId(walletChainId, true);', '');
if (m === 'noZeroOnDisconnect') swap('if (appNetworkChainId !== 0 || appNetworkConnected) host.syncNetworkChainId(0, false);', '');
if (m === 'justConnectedWrong') swap('!refs.prevWalletConnected.current && walletConnected', 'walletConnected');
if (m === 'noTrustedMark') swap('refs.trustedWalletOverStoredChainOnConnect.current = true;', '');
if (m === 'noDedupe') swap('if (refs.lastWalletDisconnectedLogKey.current !== logKey) {', 'if (true) {');
const compile = (s) => ts.transpileModule(s, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

const mod = { exports: {} };
new Function('module', 'exports', compile(src))(mod, mod.exports);
const { reconcileChain } = mod.exports;

const original = compile(fs.readFileSync(path.join(HERE, 'fixtures', 'useNetworkController.reconcile.original.txt'), 'utf8'));
const NAMES = ['wagmiReady', 'walletConnected', 'status', 'walletChainId', 'appChainId', 'appConnected', 'appNetworkChainId', 'appNetworkConnected', 'hydratedFromLocalStorage', 'adoptedOnFirstConnectRef', 'trustedWalletOverStoredChainOnConnectRef', 'prevWalletChainIdRef', 'prevAppChainIdRef', 'prevWalletConnectedRef', 'lastWalletDisconnectedLogKeyRef', 'setAppConnected', 'setAppChainId', 'syncNetworkChainId', 'switchChainAsync', 'appendDebugTrace', 'debugLog', 'getErrorCode', 'chainLabel', 'alert'];
const runOriginal = new Function(...NAMES, original);

function oracleRun(input, refs, calls) {
  runOriginal(
    input.wagmiReady, input.walletConnected, input.walletStatus, input.walletChainId, input.appChainId, input.appConnected, input.appNetworkChainId, input.appNetworkConnected, input.hydratedFromLocalStorage,
    refs.adoptedOnFirstConnect, refs.trustedWalletOverStoredChainOnConnect, refs.prevWalletChainId, refs.prevAppChainId, refs.prevWalletConnected, refs.lastWalletDisconnectedLogKey,
    (v) => calls.push(['setAppConnected', v]), (v) => calls.push(['setAppChainId', v]), (c, k) => calls.push(['syncNetworkChainId', c, k]),
    ({ chainId }) => { calls.push(['switch', chainId]); return Promise.resolve(); },
    (name, payload) => calls.push(['trace', name, payload]), { log: (name, payload) => calls.push(['log', name, payload]), error: () => {} }, () => undefined, () => '', () => {},
  );
}
function newRun(input, refs, calls) {
  reconcileChain(input, refs, {
    setAppConnected: (v) => calls.push(['setAppConnected', v]),
    setAppChainId: (v) => calls.push(['setAppChainId', v]),
    syncNetworkChainId: (c, k) => calls.push(['syncNetworkChainId', c, k]),
    switchWalletTo: (chainId) => calls.push(['switch', chainId]),
    log: (phase, payload, worthy) => { calls.push(['log', `[${phase}]`, payload]); if (worthy) calls.push(['trace', `useNetworkController:${phase}`, payload]); },
  });
}
const mkRefs = (c) => ({
  adoptedOnFirstConnect: { current: c.adopted }, trustedWalletOverStoredChainOnConnect: { current: c.trusted }, prevWalletChainId: { current: c.prevWallet },
  prevAppChainId: { current: c.prevApp }, prevWalletConnected: { current: c.prevConnected }, lastWalletDisconnectedLogKey: { current: undefined },
});
const snap = (r) => JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.current === undefined ? '__undef__' : v.current])));

const B = [false, true];
let cases = 0; let failed = 0; const shown = [];
for (const wagmiReady of B) for (const walletConnected of B) for (const walletChainId of [undefined, 0, 1, 31337, 8453])
for (const appChainId of [0, 1, 31337]) for (const appConnected of B) for (const appNetworkChainId of [0, 1, 31337]) for (const appNetworkConnected of B)
for (const hydratedFromLocalStorage of B) for (const adopted of B) for (const trusted of B) for (const prevConnected of B)
for (const prevWallet of [undefined, 1, 31337]) for (const prevApp of [undefined, 1, 31337]) {
  const input = { wagmiReady, walletConnected, walletStatus: walletConnected ? 'connected' : 'disconnected', walletChainId, appChainId, appConnected, appNetworkChainId, appNetworkConnected, hydratedFromLocalStorage };
  const c = { adopted, trusted, prevConnected, prevWallet, prevApp };
  const ra = mkRefs(c); const rb = mkRefs(c); const ca = []; const cb = [];
  for (let pass = 0; pass < 2; pass += 1) { oracleRun(input, ra, ca); newRun(input, rb, cb); }
  cases += 1;
  const same = JSON.stringify(ca) === JSON.stringify(cb) && snap(ra) === snap(rb);
  if (!same) { failed += 1; if (shown.length < 3) shown.push({ input, c, oracle: ca.map((x) => x[0] + ':' + (x[1] ?? '')), now: cb.map((x) => x[0] + ':' + (x[1] ?? '')), oracleRefs: snap(ra), nowRefs: snap(rb) }); }
}
for (const s of shown) console.log('FAIL ' + JSON.stringify(s));
console.log(failed ? `\n${failed} of ${cases} combinations FAILED` : `\nall ${cases} combinations leave the same calls, logs and refs as the original`);
process.exit(failed ? 1 : 0);
