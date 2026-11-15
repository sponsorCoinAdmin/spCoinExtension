// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/test/session.test.mjs
//
// Tests for the unlock / lock gate (src/session/walletSession.ts). Run: node test/session.test.mjs
// MUTANT=noMatchCheck / MUTANT=wrongPasswordPasses run against a deliberately broken copy and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'session', 'walletSession.ts'), 'utf8');
if (process.env.MUTANT === 'noMatchCheck') src = src.replace("if (password !== confirmPassword) return", "if (false) return");
if (process.env.MUTANT === 'wrongPasswordPasses') src = src.replace("(await adapter.unlock(password)) ? { ok: true }", "(await adapter.unlock(password), true) ? { ok: true }");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = { exports: {} };
new Function('require', 'module', 'exports', js)(req, m, m.exports);
const { passwordModeFor, phaseFromStatus, submitWalletPassword, createWalletSession } = m.exports;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

function fakeAdapter(initial) {
  const a = { s: { ...initial }, created: [], unlocks: [], locks: 0, password: undefined, failStatus: false };
  a.status = async () => { if (a.failStatus) throw new Error('down'); return a.s ? { ...a.s } : null; };
  a.create = async (p) => { a.created.push(p); a.password = p; a.s = { initialized: true, unlocked: true }; return { recoveryPhrase: 'one two three' }; };
  a.unlock = async (p) => { a.unlocks.push(p); if (p !== a.password) return false; a.s.unlocked = true; return true; };
  a.lock = async () => { a.locks++; a.s.unlocked = false; };
  return a;
}

await test('phase and password-screen mode follow the status: unknown -> checking, none -> setup, locked -> unlock, open -> unlocked', () => {
  assert.equal(phaseFromStatus(null), 'checking');
  assert.equal(phaseFromStatus({ initialized: false, unlocked: false }), 'setup');
  assert.equal(phaseFromStatus({ initialized: true, unlocked: false }), 'locked');
  assert.equal(phaseFromStatus({ initialized: true, unlocked: true }), 'unlocked');
  assert.deepEqual(['checking', 'setup', 'locked', 'unlocked'].map(passwordModeFor), ['checking', 'setup', 'unlock', 'unlock']);
});

await test('setup validation: short and mismatched passwords never reach the adapter; a good one creates and returns the phrase', async () => {
  const a = fakeAdapter({ initialized: false, unlocked: false });
  assert.deepEqual(await submitWalletPassword('setup', a, 'short', 'short'), { ok: false, error: 'Password must be at least 8 characters.' });
  assert.deepEqual(await submitWalletPassword('setup', a, 'longenough', 'different1'), { ok: false, error: 'Passwords do not match.' });
  assert.equal(a.created.length, 0);
  assert.deepEqual(await submitWalletPassword('setup', a, 'longenough', 'longenough'), { ok: true, recoveryPhrase: 'one two three' });
  assert.deepEqual(a.created, ['longenough']);
});

await test('unlock: wrong password gives "Incorrect password."; right one succeeds; empty is refused without calling the adapter', async () => {
  const a = fakeAdapter({ initialized: true, unlocked: false }); a.password = 'the-password';
  assert.deepEqual(await submitWalletPassword('locked', a, 'nope-nope', ''), { ok: false, error: 'Incorrect password.' });
  assert.deepEqual(await submitWalletPassword('locked', a, '', ''), { ok: false, error: 'Enter your password.' });
  assert.equal(a.unlocks.length, 1);
  assert.deepEqual(await submitWalletPassword('locked', a, 'the-password', ''), { ok: true });
});

await test('adapter failures become an error message instead of an exception', async () => {
  const bad = { create: async () => { throw new Error('disk full'); }, unlock: async () => { throw new Error('worker gone'); } };
  assert.deepEqual(await submitWalletPassword('setup', bad, 'longenough', 'longenough'), { ok: false, error: 'disk full' });
  assert.deepEqual(await submitWalletPassword('locked', bad, 'x', ''), { ok: false, error: 'worker gone' });
});

await test('controller: refresh reads the phase; submit moves setup -> unlocked and holds the phrase until dismissed; lock returns to locked', async () => {
  const a = fakeAdapter({ initialized: false, unlocked: false });
  let changes = 0; const c = createWalletSession(a, () => { changes++; });
  assert.equal(c.getState().phase, 'checking');
  await c.refresh(); assert.equal(c.getState().phase, 'setup');
  await c.submit('longenough', 'nomatch12'); assert.equal(c.getState().phase, 'setup'); assert.equal(c.getState().error, 'Passwords do not match.');
  await c.submit('longenough', 'longenough');
  assert.equal(c.getState().phase, 'unlocked'); assert.equal(c.getState().recoveryPhrase, 'one two three'); assert.equal(c.getState().error, '');
  c.dismissRecoveryPhrase(); assert.equal(c.getState().recoveryPhrase, undefined);
  await c.lock(); assert.equal(c.getState().phase, 'locked'); assert.equal(a.locks, 1);
  await c.submit('wrong-pass', ''); assert.equal(c.getState().phase, 'locked'); assert.equal(c.getState().error, 'Incorrect password.');
  await c.submit('longenough', ''); assert.equal(c.getState().phase, 'unlocked'); assert.equal(c.getState().error, '');
  assert.ok(changes > 8);
});

await test('controller: a status that cannot be read stays "checking"; a second submit while one is running is ignored', async () => {
  const a = fakeAdapter({ initialized: true, unlocked: false }); a.password = 'the-password'; a.failStatus = true;
  const c = createWalletSession(a);
  await c.refresh(); assert.equal(c.getState().phase, 'checking');
  a.failStatus = false; await c.refresh(); assert.equal(c.getState().phase, 'locked');
  let release; const slow = new Promise((r) => { release = r; });
  a.unlock = async (p) => { a.unlocks.push(p); await slow; return true; };
  const first = c.submit('the-password', ''); const second = c.submit('the-password', '');
  release(); await Promise.all([first, second]);
  assert.equal(a.unlocks.length, 1);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
