// File: test/secretClearing.test.mjs
//
// Item V9 of docs/design/accountAuthDesign.txt (memory clearing): a secret shown on a screen (the Secret Recovery Phrase of a new wallet, a revealed phrase or key in Security) is cleared when the page is hidden or after a time limit, whichever
// comes first, exactly once; watching stops when the screen closes; and every screen that shows a secret uses the helper. Run: node test/secretClearing.test.mjs
// MUTANT=ignoresHidden|noTimer|firesTwice|neverStops|listenerLeft|phraseScreenUnwatched|revealUnwatched|hostPhraseUnwatched|phraseGateBack run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.join(HERE, '..');
const WEB = path.join(PKG, '..', '..', '..', '..', '..');
const req = createRequire(path.join(WEB, 'package.json'));
const ts = req('typescript');
const m = process.env.MUTANT;
const read = (...p) => fs.readFileSync(path.join(...p), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let helper = read(PKG, 'src', 'security', 'secretClearing.ts');
if (m === 'ignoresHidden') helper = swap(helper, 'if (env.page.hidden) fire();', '');
if (m === 'noTimer') helper = swap(helper, 'const timer = env.setTimer(fire, maxMs);', 'const timer = undefined;');
if (m === 'firesTwice') helper = swap(helper, 'if (done) return;\n    done = true;', '');
if (m === 'neverStops') helper = swap(helper, 'return () => {\n    done = true;\n    stop();\n  };', 'return () => undefined;');
if (m === 'listenerLeft') helper = swap(helper, "env.page.removeEventListener('visibilitychange', onVisibility);\n    env.clearTimer(timer);", 'env.clearTimer(timer);');
const js = ts.transpileModule(helper.replace("import { useEffect } from 'react';", 'const useEffect = () => undefined;').replace("import { usePlatform } from '../platform/platform';", 'const usePlatform = () => undefined;'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', js)(req, mod, mod.exports);
const { watchSecret, SECRET_SHOWN_MAX_MS, NEW_PHRASE_SHOWN_MAX_MS } = mod.exports;

function fakeEnv() {
  const listeners = new Set();
  const timers = new Map();
  let next = 1;
  const env = {
    page: { hidden: false, addEventListener: (_t, l) => listeners.add(l), removeEventListener: (_t, l) => listeners.delete(l) },
    setTimer: (fn, ms) => { const id = next++; timers.set(id, { fn, ms }); return id; },
    clearTimer: (id) => timers.delete(id),
    hide() { env.page.hidden = true; [...listeners].forEach((l) => l()); },
    show() { env.page.hidden = false; [...listeners].forEach((l) => l()); },
    tick() { [...timers.values()].forEach((t) => t.fn()); },
    listeners: () => listeners.size,
    timers: () => timers.size,
    timerMs: () => [...timers.values()].map((t) => t.ms),
  };
  return env;
}

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

await test('the page being hidden clears the secret; coming back does not bring it back', () => {
  const env = fakeEnv(); let cleared = 0;
  watchSecret(() => { cleared += 1; }, 1000, env);
  assert.equal(cleared, 0);
  env.hide();
  assert.equal(cleared, 1);
  env.show();
  assert.equal(cleared, 1);
});

await test('a page that is only shown again (visibility change while visible) clears nothing', () => {
  const env = fakeEnv(); let cleared = 0;
  watchSecret(() => { cleared += 1; }, 1000, env);
  env.show();
  assert.equal(cleared, 0);
});

await test('the time limit clears the secret, with the limit it was given', () => {
  const env = fakeEnv(); let cleared = 0;
  watchSecret(() => { cleared += 1; }, 60_000, env);
  assert.deepEqual(env.timerMs(), [60_000]);
  env.tick();
  assert.equal(cleared, 1);
});

await test('it clears exactly once, whichever comes first, and leaves nothing behind (no listener, no timer)', () => {
  const env = fakeEnv(); let cleared = 0;
  watchSecret(() => { cleared += 1; }, 1000, env);
  env.hide(); env.tick(); env.hide();
  assert.equal(cleared, 1);
  assert.deepEqual([env.listeners(), env.timers()], [0, 0]);
});

await test('an event or timer already on its way when the secret is cleared does not clear it a second time', () => {
  const kept = [];
  const env = { page: { hidden: true, addEventListener: (_t, l) => kept.push(l), removeEventListener: () => undefined }, setTimer: (fn) => { kept.push(fn); return 1; }, clearTimer: () => undefined };
  let cleared = 0;
  watchSecret(() => { cleared += 1; }, 1000, env);
  kept.forEach((fn) => fn());
  kept.forEach((fn) => fn());
  assert.equal(cleared, 1);
});

await test('closing the screen stops the watch: no clearing later, no listener, no timer', () => {
  const env = fakeEnv(); let cleared = 0;
  const stop = watchSecret(() => { cleared += 1; }, 1000, env);
  stop();
  env.hide(); env.tick();
  assert.equal(cleared, 0);
  assert.deepEqual([env.listeners(), env.timers()], [0, 0]);
});

await test('the limits: a revealed secret one minute, the new wallet phrase five (the person is writing it down)', () => {
  assert.equal(SECRET_SHOWN_MAX_MS, 60_000);
  assert.equal(NEW_PHRASE_SHOWN_MAX_MS, 5 * 60_000);
});

// every screen that shows a secret uses the helper
// 2026-10-13: the phrase screen moved out of WalletOnboardingPanel into the shared RecoveryPhraseScreen (used by the extension's onboarding and the web popup's first run).
let phraseScreen = read(PKG, 'src', 'RecoveryPhraseScreen.tsx');
if (m === 'phraseScreenUnwatched') phraseScreen = swap(phraseScreen, 'useSecretClearing(!!phrase,', 'void (!!phrase,');
let reveal = read(PKG, 'src', 'WalletSecuritySection.tsx');
if (m === 'revealUnwatched') reveal = swap(reveal, 'useSecretClearing(!!secret, clear, SECRET_SHOWN_MAX_MS);', '');
let hostPhrase = read(WEB, 'components', 'views', 'BrowserWalletPanel.tsx');
if (m === 'phraseGateBack') hostPhrase = swap(hostPhrase, '{recoveryPhrase ? (', "{phase === 'none' && recoveryPhrase ? (");
if (m === 'hostPhraseUnwatched') hostPhrase = swap(hostPhrase, 'useSecretClearing(!!recoveryPhrase,', 'void (!!recoveryPhrase,');

await test('the new-wallet phrase screens (the shared one and the web wallet page) and the Reveal rows all clear their secret', () => {
  assert.match(phraseScreen, /useSecretClearing\(!!phrase, \(\) => \{ if \(autoHide\) \{ setPhrase\(''\); setPhraseHidden\(true\); \} \}, NEW_PHRASE_SHOWN_MAX_MS\);/);
  assert.match(hostPhrase, /useSecretClearing\(!!recoveryPhrase, \(\) => \{ setRecoveryPhrase\(''\); setSaved\(false\); void refresh\(\); \}, NEW_PHRASE_SHOWN_MAX_MS\);/);
  assert.match(reveal, /useSecretClearing\(!!secret, clear, SECRET_SHOWN_MAX_MS\);/);
});

await test('the web wallet page shows the phrase of a NEW wallet whatever the wallet state (creating unlocks it) and keeps the accounts back until the person continues', () => {
  assert.match(hostPhrase, /\{recoveryPhrase \? \([\s\S]{0,60}<div className=\{card\}>[\s\S]{0,80}Write down your recovery phrase/);
  assert.match(hostPhrase, /\{phase === 'unlocked' && !recoveryPhrase \? \(/);
});

await test('after the phrase is hidden the person can still continue, and is told where to see it again', () => {
  const { readFileSync } = fs;
  assert.match(phraseScreen, /disabled=\{!saved && !phraseHidden\}/);
  assert.match(phraseScreen, /show the phrase again in Security, with your password/);
  assert.ok(readFileSync);
});

let failed = 0;
for (const [status, text] of results) { console.log(status + ' ' + text); if (status === 'FAIL') failed += 1; }
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
