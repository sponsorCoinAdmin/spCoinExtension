// File: test/loginPrecedence.test.mjs
//
// docs/meritMigration.txt row 24: resolveLoginState (src/session/validateLogin.ts) is the "gate mirror" rule that sat inline in the web's walletState.tsx: an unacknowledged recovery phrase keeps the state LOGGED_OUT, the dev bypass reads LOGGED_IN, otherwise the facts decide.
// ORACLE: that inline expression as it stood, over every combination of its inputs.
// Run: node test/loginPrecedence.test.mjs     MUTANT=bypassFirst|noPendingRule|bootIgnored|lockedIgnored|nullPasswordLoggedIn run against broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ts = createRequire(import.meta.url)('typescript');
const m = process.env.MUTANT;
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'session', 'validateLogin.ts'), 'utf8').split(String.fromCharCode(13)).join('');
const swap = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
if (m === 'bypassFirst') swap("  if (facts.pendingRecoveryPhrase) return 'LOGGED_OUT';\n  if (facts.devGateBypassed) return 'LOGGED_IN';", "  if (facts.devGateBypassed) return 'LOGGED_IN';\n  if (facts.pendingRecoveryPhrase) return 'LOGGED_OUT';");
if (m === 'noPendingRule') swap("  if (facts.pendingRecoveryPhrase) return 'LOGGED_OUT';\n", '');
if (m === 'bootIgnored') swap("if (!facts.bootResolved) return 'UNKNOWN';", '');
if (m === 'lockedIgnored') swap('facts.hasWalletPassword === true && !facts.isWalletLocked', 'facts.hasWalletPassword === true');
if (m === 'nullPasswordLoggedIn') swap('facts.hasWalletPassword === true && !facts.isWalletLocked', 'facts.hasWalletPassword !== false && !facts.isWalletLocked');
const mod = { exports: {} };
new Function('module', 'exports', ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(mod, mod.exports);
const { resolveLoginState } = mod.exports;

// the original inline expression in walletState.tsx, with deriveLoginState as it was
const derive = (f) => { if (!f.bootResolved) return 'UNKNOWN'; return f.hasWalletPassword === true && !f.isWalletLocked ? 'LOGGED_IN' : 'LOGGED_OUT'; };
const original = (f) => (f.pendingRecoveryPhrase ? 'LOGGED_OUT' : f.devGateBypassed ? 'LOGGED_IN' : derive(f));

let n = 0; let bad = 0;
for (const pendingRecoveryPhrase of [false, true]) for (const devGateBypassed of [false, true]) for (const bootResolved of [false, true]) for (const hasWalletPassword of [null, false, true]) for (const isWalletLocked of [false, true]) {
  const f = { pendingRecoveryPhrase, devGateBypassed, bootResolved, hasWalletPassword, isWalletLocked };
  n += 1;
  if (resolveLoginState(f) !== original(f)) { bad += 1; console.log('FAIL ' + JSON.stringify(f) + ' want ' + original(f) + ' got ' + resolveLoginState(f)); }
}
console.log(bad ? `\n${bad} of ${n} FAILED` : `\nall ${n} combinations resolve exactly as the inline expression did`);
process.exit(bad ? 1 : 0);
