// File: test/walletAuthenticators.test.mjs
//
// Tests for the wallet connection store (src/auth/walletAuthenticators.ts): every wallet's connected state comes from its own probe, never from anything saved.
// Run: node test/walletAuthenticators.test.mjs   MUTANT=savedWins|noTicket|noTimeout|unknownIsFalse run against deliberately broken copies and must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const ts = req('typescript');
let src = fs.readFileSync(path.join(HERE, '..', 'src', 'auth', 'walletAuthenticators.ts'), 'utf8').replace(/\r\n/g, '\n');
const swap = (text, from, to) => {
  assert.ok(text.includes(from), 'mutant anchor missing: ' + from);
  return text.replace(from, to);
};
const m = process.env.MUTANT;
// a slow older answer overwrites a newer one
if (m === 'noTicket') src = swap(src, 'if (ticket.get(id) !== mine) return;', '');
// a probe that never answers keeps the wallet "checking" forever
if (m === 'noTimeout') src = swap(src, 'const timer = setTimeout(() => resolve(false), ms);', 'const timer = setTimeout(() => undefined, ms);');
// a wallet with no probe reads "not connected" instead of "no opinion"
if (m === 'unknownIsFalse') src = swap(src, 'if (!probes.has(id)) return undefined;', '');
// a throwing probe reads connected
if (m === 'savedWins') src = swap(src, '() => { clearTimeout(timer); resolve(false); },\n    );', '() => { clearTimeout(timer); resolve(true); },\n    );');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { createWalletConnections, authenticatorProbe } = mod.exports;

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};
const tick = () => new Promise((r) => setTimeout(r, 0));

await test('a wallet that is absent reads disconnected', async () => {
  const c = createWalletConnections({ probes: { mm: { check: () => false } } });
  await c.refresh();
  assert.equal(c.isConnected('mm'), false);
  assert.equal(c.get().mm, 'disconnected');
});

await test('a wallet that answers reads connected', async () => {
  const c = createWalletConnections({ probes: { mm: { check: async () => true } } });
  await c.refresh();
  assert.equal(c.isConnected('mm'), true);
});

await test('a wallet with no probe has no opinion', async () => {
  const c = createWalletConnections({ probes: {} });
  await c.refresh();
  assert.equal(c.isConnected('vault'), undefined);
});

await test('a probe that throws reads disconnected', async () => {
  const c = createWalletConnections({ probes: { mm: { check: () => { throw new Error('boom'); } } } }).refresh;
  const store = createWalletConnections({ probes: { mm: { check: async () => { throw new Error('boom'); } } } });
  await store.refresh();
  assert.equal(store.isConnected('mm'), false);
  void c;
});

await test('a probe that never answers reads disconnected after the timeout', async () => {
  const c = createWalletConnections({ timeoutMs: 20, probes: { mm: { check: () => new Promise(() => undefined) } } });
  await c.refresh();
  assert.equal(c.isConnected('mm'), false);
});

await test('a wallet is "checking" (not connected) until its first answer', async () => {
  let release;
  const c = createWalletConnections({ probes: { mm: { check: () => new Promise((r) => { release = r; }) } } });
  const done = c.refresh();
  assert.equal(c.get().mm, 'checking');
  assert.equal(c.isConnected('mm'), false);
  release(true);
  await done;
  assert.equal(c.isConnected('mm'), true);
});

await test('a wallet with an answer keeps it while it is asked again (no flicker)', async () => {
  let answer = true;
  let release;
  const c = createWalletConnections({ probes: { mm: { check: () => (answer ? true : new Promise((r) => { release = r; })) } } });
  await c.refresh();
  answer = false;
  const again = c.refresh();
  assert.equal(c.get().mm, 'connected');
  release(false);
  await again;
  assert.equal(c.get().mm, 'disconnected');
});

await test('a slow older answer does not overwrite a newer one', async () => {
  const releases = [];
  const c = createWalletConnections({ probes: { mm: { check: () => new Promise((r) => releases.push(r)) } } });
  const first = c.refresh('mm');
  const second = c.refresh('mm');
  releases[1](true); // the newer answer arrives first
  await second;
  releases[0](false); // the older one arrives late
  await first;
  assert.equal(c.isConnected('mm'), true);
});

await test("a wallet's own event asks again and listeners hear the change", async () => {
  let connected = false;
  let fire = () => undefined;
  const c = createWalletConnections({ probes: { mm: { check: () => connected, subscribe: (refresh) => { fire = refresh; return () => undefined; } } } });
  let heard = 0;
  c.subscribe(() => heard++);
  c.start();
  await tick();
  await tick();
  assert.equal(c.isConnected('mm'), false);
  connected = true;
  fire();
  await tick();
  await tick();
  assert.equal(c.isConnected('mm'), true);
  assert.ok(heard >= 2);
});

await test('the page coming back to focus asks every wallet again', async () => {
  let connected = false;
  let focus = () => undefined;
  const c = createWalletConnections({ onFocus: (refresh) => { focus = refresh; return () => undefined; }, probes: { mm: { check: () => connected } } });
  c.start();
  await tick();
  await tick();
  connected = true;
  focus();
  await tick();
  await tick();
  assert.equal(c.isConnected('mm'), true);
});

await test('a wallet registered later is asked at once and listened to', async () => {
  const c = createWalletConnections({ probes: {} });
  c.start();
  c.register('ledger', { check: () => true });
  await tick();
  await tick();
  assert.equal(c.isConnected('ledger'), true);
});

await test('authenticatorProbe: connected only when available and sharing an account', async () => {
  const mk = (status) => ({ status: async () => status, onChange: () => () => undefined });
  assert.equal(await authenticatorProbe(() => mk({ available: false, unlocked: false })).check(), false);
  assert.equal(await authenticatorProbe(() => mk({ available: true, unlocked: false })).check(), false);
  assert.equal(await authenticatorProbe(() => mk({ available: true, unlocked: true })).check(), true);
  assert.equal(await authenticatorProbe(() => undefined).check(), false);
});

for (const [verdict, name] of results) console.log(verdict + '  ' + name);
const failed = results.filter(([v]) => v === 'FAIL').length;
console.log(failed ? `${failed} FAILED` : `${results.length} passed`);
process.exit(failed ? 1 : 0);
