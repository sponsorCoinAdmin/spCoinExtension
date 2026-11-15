// File: test/unlockPrompt.test.mjs
//
// docs/design/accountAuthDesign.txt V4 (lib/spCoin/unlockPrompt.ts): the browser wallet's "unlock it first" prompt. An unlocked wallet never opens one; a locked one opens ONE, shared by everyone who asks meanwhile; unlocking settles them all true and closing the dialog settles them all false;
// a background request never opens one; the wallet is first brought back from the saved session (a reload keeps it unlocked), and a refusal is the wallet's own error with its code. Run: node test/unlockPrompt.test.mjs
// MUTANT=sharedNotSettled|backgroundPrompts|declineProceeds|unlockedStillPrompts|restoreSkipped|finishKeepsPending|noNotify run against deliberately broken copies and must report failures.
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
let src = fs.readFileSync(path.join(WEB, 'lib', 'spCoin', 'unlockPrompt.ts'), 'utf8').replace(/\r\n/g, '\n');
const swap = (from, to) => { assert.ok(src.includes(from), 'mutant anchor missing: ' + from); src = src.replace(from, to); };
if (m === 'sharedNotSettled') swap('pending = { resolve: (unlocked) => { previous?.resolve(unlocked); resolve(unlocked); } };', 'pending = { resolve };');
if (m === 'backgroundPrompts') swap("if (gate.interactive === false) throw gate.refuse('unauthorized', 'The browser wallet signs only when you ask it to (no silent background sign-in).');", '');
if (m === 'declineProceeds') swap("if (!gate.isUnlocked() && !(await gate.request())) throw gate.refuse('locked', 'The browser wallet is locked.');", 'if (!gate.isUnlocked()) await gate.request();');
if (m === 'unlockedStillPrompts') swap('if (isUnlocked()) return Promise.resolve(true);', '');
if (m === 'restoreSkipped') swap('await gate.restore();', '');
if (m === 'finishKeepsPending') swap('const request = pending;\n        pending = null;', 'const request = pending;');
if (m === 'noNotify') swap('pending = { resolve: (unlocked) => { previous?.resolve(unlocked); resolve(unlocked); } };\n        emit();', 'pending = { resolve: (unlocked) => { previous?.resolve(unlocked); resolve(unlocked); } };');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)((id) => req(id), mod, mod.exports);
const { createUnlockPrompt, ensureUnlockedForSigning } = mod.exports;

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };
const tick = () => new Promise((r) => setTimeout(r, 5));
const settle = (p) => { const box = { done: false, value: undefined }; p.then((v) => { box.done = true; box.value = v; }); return box; };

await test('an unlocked wallet never opens a prompt', async () => {
  const p = createUnlockPrompt(() => true);
  let notified = 0;
  p.store.subscribe(() => { notified += 1; });
  assert.equal(await p.request(), true);
  assert.deepEqual([p.store.isPending(), notified], [false, 0]);
});

await test('a locked wallet opens ONE prompt, tells the dialog, and unlocking settles the asker true', async () => {
  const p = createUnlockPrompt(() => false);
  let notified = 0;
  p.store.subscribe(() => { notified += 1; });
  const asked = settle(p.request());
  await tick();
  assert.deepEqual([p.store.isPending(), notified, asked.done], [true, 1, false]);
  p.store.finish(true);
  await tick();
  assert.deepEqual([asked.done, asked.value, p.store.isPending()], [true, true, false]);
});

await test('closing the dialog settles the asker false', async () => {
  const p = createUnlockPrompt(() => false);
  const asked = settle(p.request());
  p.store.finish(false);
  await tick();
  assert.deepEqual([asked.done, asked.value], [true, false]);
});

await test('callers that arrive while the prompt is open share it: one prompt, every one of them gets the answer', async () => {
  const p = createUnlockPrompt(() => false);
  const a = settle(p.request());
  const b = settle(p.request());
  const c = settle(p.request());
  await tick();
  assert.equal(p.store.isPending(), true);
  p.store.finish(true);
  await tick();
  assert.deepEqual([a.value, b.value, c.value], [true, true, true]);
});

await test('a finish with nothing waiting is harmless, and a dialog can stop listening', async () => {
  const p = createUnlockPrompt(() => false);
  p.store.finish(true);
  let notified = 0;
  const off = p.store.subscribe(() => { notified += 1; });
  off();
  p.request();
  assert.equal(notified, 0);
});

const gate = (over = {}) => {
  const calls = [];
  let unlocked = over.unlocked ?? false;
  return {
    calls,
    gate: {
      interactive: over.interactive,
      restore: async () => { calls.push('restore'); if (over.restoreUnlocks) unlocked = true; },
      isUnlocked: () => unlocked,
      request: async () => { calls.push('request'); if (over.answer) unlocked = true; return !!over.answer; },
      refuse: (code, message) => Object.assign(new Error(message), { code }),
    },
  };
};

await test('a background request is refused (unauthorized) and neither restores nor prompts', async () => {
  const g = gate({ interactive: false });
  await assert.rejects(ensureUnlockedForSigning(g.gate), (e) => e.code === 'unauthorized');
  assert.deepEqual(g.calls, []);
});

await test('the wallet is restored from the saved session first; if that unlocks it, nobody is asked', async () => {
  const g = gate({ restoreUnlocks: true });
  await ensureUnlockedForSigning(g.gate);
  assert.deepEqual(g.calls, ['restore']);
});

await test('locked: the person is asked once; unlocking lets the signature go on', async () => {
  const g = gate({ answer: true });
  await ensureUnlockedForSigning(g.gate);
  assert.deepEqual(g.calls, ['restore', 'request']);
});

await test('locked and the person closes the dialog: refused as "locked", the wallet\'s own code', async () => {
  const g = gate({ answer: false });
  await assert.rejects(ensureUnlockedForSigning(g.gate), (e) => e.code === 'locked' && /locked/.test(e.message));
});

await test('already unlocked: nothing is asked', async () => {
  const g = gate({ unlocked: true });
  await ensureUnlockedForSigning(g.gate);
  assert.deepEqual(g.calls, ['restore']);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
