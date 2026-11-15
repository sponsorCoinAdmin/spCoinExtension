// File: test/chainChanged.test.mjs
//
// docs/meritMigration.txt row 25: decideWalletChainChanged (src/chain/chainReconcile.ts) is the decision inside the web's raw `chainChanged` listener (useNetworkController.ts), moved. ORACLE: that listener's logic as it stood, run over a grid of event values, supported-chain
// sets, app chains and connection states; the decision, the unsupported-chain message text and the connected flag must match exactly.
// Run: node test/chainChanged.test.mjs     MUTANT=acceptsZero|noSupportedCheck|messageTypo|alwaysMarkConnected|wrongRadix run against broken copies and must report failures.
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
if (m === 'acceptsZero') swap('nextId <= 0', 'nextId < 0');
if (m === 'noSupportedCheck') swap('if (!input.supportedChainIds.has(nextId)) {', 'if (false) {');
if (m === 'messageTypo') swap('Unsuported  Network', 'Unsupported Network');
if (m === 'alwaysMarkConnected') swap('markConnected: !input.appConnected', 'markConnected: true');
if (m === 'wrongRadix') swap('String(input.hexChainId), 16)', 'String(input.hexChainId), 10)');
const mod = { exports: {} };
new Function('module', 'exports', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(mod, mod.exports);
const { decideWalletChainChanged } = mod.exports;

// ---- the original listener logic (the decision parts), as it stood in useNetworkController.ts ----
function original(hexChainId, appId, appConnected, SUPPORTED, chainLabel) {
  const nextId = Number.parseInt(String(hexChainId), 16);
  if (!Number.isFinite(nextId) || nextId <= 0) return { kind: 'ignore' };
  if (!SUPPORTED.has(nextId)) {
    const metamaskName = chainLabel(nextId);
    const spCoinName = chainLabel(appId);
    const msg =
      `Unsuported  Network ${metamaskName}(${nextId})\n` +
      `\n` +
      `WARNING: Networks not in sync\n` +
      `Metamask Network: ${metamaskName} chainId: ${nextId}\n` +
      `Spoonsor Coin Network: ${spCoinName} appChainId: ${appId}\n`;
    return { kind: 'unsupported', chainId: nextId, message: msg };
  }
  return { kind: 'adopt', chainId: nextId, markConnected: !appConnected };
}

const label = (id) => (id === 1 ? 'Ethereum' : id === 31337 ? 'Hardhat' : `Chain ${id}`);
const events = ['0x1', '0x7a69', '0x89', '0x0', '0x', '', 'abc', '0xZZ', '  0x1 ', '0X1', 'not-hex', '0x2105', '-0x1', '0x1.5', undefined, null, 1, '0xffffffffff'];
const sets = [new Set([1, 31337, 137, 8453]), new Set([1]), new Set()];
let cases = 0; let bad = 0; const shown = [];
for (const hex of events) for (const set of sets) for (const app of [0, 1, 31337, 5]) for (const conn of [false, true]) {
  cases += 1;
  const want = original(hex, app, conn, set, label);
  const got = decideWalletChainChanged({ hexChainId: hex, appChainId: app, appConnected: conn, supportedChainIds: set, chainLabel: label });
  if (JSON.stringify(want) !== JSON.stringify(got)) { bad += 1; if (shown.length < 2) shown.push({ hex, app, conn, want, got }); }
}
for (const s of shown) console.log('FAIL ' + JSON.stringify(s).slice(0, 400));
console.log(bad ? `\n${bad} of ${cases} FAILED` : `\nall ${cases} combinations decide exactly as the original listener did`);
process.exit(bad ? 1 : 0);
