// File: test/webAppRelay.test.mjs
//
// docs/design/remoteWalletSigning.txt step A (src/webAppRelay.ts): the worker's relay to the Merit web app. Only an allow-listed set of calls goes through; a request goes to ONE page (a logged-on one first); an answer counts only from that same tab AND origin, once, before the time limit; a closed tab ends its requests;
// the number of waiting requests is capped; a page that cannot be reached ends the request. Run: node test/webAppRelay.test.mjs
// MUTANT=anyMethod|anyTab|anyOrigin|replay|noTimeout|noCap|firstTarget|closedIgnored must report failures.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
// the extension's TypeScript is the native one (no JS API): the file is compiled with the transform the build uses (oxc, in rolldown)
const { transformSync } = await import('rolldown/experimental');
const m = process.env.MUTANT;
const swap = (text, from, to) => { assert.ok(text.includes(from), 'mutant anchor missing: ' + from); return text.replace(from, to); };

let src = fs.readFileSync(path.join(HERE, '..', 'src', 'webAppRelay.ts'), 'utf8').replace(/\r\n/g, '\n');
if (m === 'anyMethod') src = swap(src, 'if (!REMOTE_METHODS.has(method)) return', 'if (false) return');
if (m === 'anyTab') src = swap(src, 'sender.tabId !== entry.tabId || ', '');
if (m === 'anyOrigin') src = swap(src, ' || sender.origin !== entry.origin', '');
if (m === 'replay') src = swap(src, '    pending.delete(id);\n    deps.clearTimer(entry.timer);', '    deps.clearTimer(entry.timer);');
if (m === 'noTimeout') src = swap(src, 'const timer = deps.setTimer(() => void finish(id, fail(4900, \'The Merit web app did not answer in time.\')), REMOTE_READ_METHODS.includes(method) ? READ_TIMEOUT_MS : APPROVAL_TIMEOUT_MS);', 'const timer = 0;');
if (m === 'noCap') src = swap(src, 'if (pending.size >= MAX_PENDING) return', 'if (false) return');
if (m === 'firstTarget') src = swap(src, 'all.find((t) => t.loggedOn) ?? all[0]', 'all[0]');
if (m === 'closedIgnored') src = swap(src, 'if (entry.tabId === tabId) finish(', 'if (false) finish(');
const code = transformSync('webAppRelay.ts', src, { lang: 'ts', sourceType: 'module', target: 'es2022' }).code.replace(/^export (async function|function|const) /gm, '$1 ');
const { createWebAppRelay, MAX_PENDING, READ_TIMEOUT_MS, APPROVAL_TIMEOUT_MS } = new Function(code + String.fromCharCode(10) + 'return { createWebAppRelay, MAX_PENDING, READ_TIMEOUT_MS, APPROVAL_TIMEOUT_MS };')();

const results = [];
const test = async (name, fn) => { try { await fn(); results.push(['PASS', name]); } catch (e) { results.push(['FAIL', name + ' :: ' + (e && e.message)]); } };

const APP = 'http://localhost:3000';
function fixture({ targets, sendFails = false } = {}) {
  const sent = [];
  const timers = [];
  let n = 0;
  const relay = createWebAppRelay({
    targets: () => targets ?? [{ tabId: 7, origin: APP, loggedOn: true }],
    sendToTab: async (tabId, message) => { if (sendFails) throw new Error('no content script'); sent.push({ tabId, message }); },
    setTimer: (fn, ms) => { timers.push({ fn, ms, cleared: false }); return timers.length - 1; },
    clearTimer: (h) => { if (timers[h]) timers[h].cleared = true; },
    newId: () => 'id' + (++n),
  });
  return { relay, sent, timers };
}
const flush = () => new Promise((r) => setImmediate(r));

await test('only the allow-listed calls are passed on; anything else ends at once with 4200', async () => {
  const f = fixture();
  for (const method of ['eth_sendRawTransaction', 'wallet_addEthereumChain', 'eth_sign', 'merit_reportWalletState', 'personal_ecRecover']) {
    const reply = await f.relay.request(method, []);
    assert.equal(reply.ok, false);
    assert.equal(reply.error.code, 4200);
  }
  assert.equal(f.sent.length, 0);
  assert.equal(f.relay.pendingCount(), 0);
});

await test('with no web app page the request ends with 4900', async () => {
  const f = fixture({ targets: [] });
  const reply = await f.relay.request('eth_accounts', []);
  assert.deepEqual(reply, { ok: false, error: { code: 4900, message: 'The Merit web app is not open. Connect it first.' } });
});

await test('the request goes to ONE page, a logged-on one first, as the merit_remoteRequest event with an id', async () => {
  const f = fixture({ targets: [{ tabId: 3, origin: APP, loggedOn: false }, { tabId: 9, origin: APP, loggedOn: true }] });
  void f.relay.request('personal_sign', ['0xmsg', '0xabc']);
  await flush();
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].tabId, 9);
  assert.deepEqual(f.sent[0].message, { type: 'merit/provider/event', event: 'merit_remoteRequest', data: { id: 'id1', method: 'personal_sign', params: ['0xmsg', '0xabc'] } });
});

await test('the answer from the asked tab and origin resolves the request with the result', async () => {
  const f = fixture();
  const p = f.relay.request('eth_accounts', []);
  await flush();
  assert.equal(f.relay.accept({ tabId: 7, origin: APP }, { id: 'id1', ok: true, result: ['0xabc'] }), true);
  assert.deepEqual(await p, { ok: true, result: ['0xabc'] });
  assert.equal(f.relay.pendingCount(), 0);
});

await test('an answer from another tab is refused and the request keeps waiting', async () => {
  const f = fixture();
  const p = f.relay.request('personal_sign', []);
  await flush();
  assert.equal(f.relay.accept({ tabId: 8, origin: APP }, { id: 'id1', ok: true, result: '0xsig' }), false);
  assert.equal(f.relay.pendingCount(), 1);
  assert.equal(f.relay.accept({ tabId: 7, origin: APP }, { id: 'id1', ok: true, result: '0xreal' }), true);
  assert.deepEqual(await p, { ok: true, result: '0xreal' });
});

await test('an answer from another origin (same tab id) is refused', async () => {
  const f = fixture();
  void f.relay.request('personal_sign', []);
  await flush();
  assert.equal(f.relay.accept({ tabId: 7, origin: 'https://evil.example' }, { id: 'id1', ok: true, result: '0xsig' }), false);
  assert.equal(f.relay.pendingCount(), 1);
});

await test('an answer is taken once: a repeat of the same id is refused', async () => {
  const f = fixture();
  void f.relay.request('eth_accounts', []);
  await flush();
  assert.equal(f.relay.accept({ tabId: 7, origin: APP }, { id: 'id1', ok: true, result: ['0xa'] }), true);
  assert.equal(f.relay.accept({ tabId: 7, origin: APP }, { id: 'id1', ok: true, result: ['0xb'] }), false);
});

await test('an unknown id, a missing id and a non-object answer are refused', async () => {
  const f = fixture();
  void f.relay.request('eth_accounts', []);
  await flush();
  for (const bad of [{ id: 'nope', ok: true }, { ok: true }, null, 'x', 7, { id: 5, ok: true }]) assert.equal(f.relay.accept({ tabId: 7, origin: APP }, bad), false);
  assert.equal(f.relay.pendingCount(), 1);
});

await test('a refusal from the page keeps its code and a bounded message; a bad code becomes 4001', async () => {
  const f = fixture();
  const a = f.relay.request('personal_sign', []);
  const b = f.relay.request('personal_sign', []);
  await flush();
  f.relay.accept({ tabId: 7, origin: APP }, { id: 'id1', ok: false, error: { code: 4001, message: 'User rejected' } });
  f.relay.accept({ tabId: 7, origin: APP }, { id: 'id2', ok: false, error: { code: 'x', message: 'y'.repeat(1000) } });
  assert.deepEqual(await a, { ok: false, error: { code: 4001, message: 'User rejected' } });
  const second = await b;
  assert.equal(second.error.code, 4001);
  assert.equal(second.error.message.length, 300);
});

await test('no answer in time ends the request with 4900 (20 s for a read, 5 min for an approval); a late answer is refused', async () => {
  const f = fixture();
  const read = f.relay.request('eth_chainId', []);
  const sign = f.relay.request('personal_sign', []);
  await flush();
  assert.equal(f.timers[0].ms, READ_TIMEOUT_MS);
  assert.equal(f.timers[1].ms, APPROVAL_TIMEOUT_MS);
  f.timers[0].fn();
  assert.deepEqual(await read, { ok: false, error: { code: 4900, message: 'The Merit web app did not answer in time.' } });
  assert.equal(f.relay.accept({ tabId: 7, origin: APP }, { id: 'id1', ok: true, result: '0x1' }), false);
  assert.equal(f.relay.pendingCount(), 1);
  f.timers[1].fn();
  await sign;
  assert.equal(f.relay.pendingCount(), 0);
});

await test('an answer clears its timer', async () => {
  const f = fixture();
  void f.relay.request('eth_accounts', []);
  await flush();
  f.relay.accept({ tabId: 7, origin: APP }, { id: 'id1', ok: true, result: [] });
  assert.equal(f.timers[0].cleared, true);
});

await test('a closed tab ends its requests with 4900 and leaves the others', async () => {
  const f = fixture({ targets: [{ tabId: 7, origin: APP, loggedOn: true }] });
  const p = f.relay.request('personal_sign', []);
  await flush();
  f.relay.dropTab(99);
  assert.equal(f.relay.pendingCount(), 1);
  f.relay.dropTab(7);
  assert.deepEqual(await p, { ok: false, error: { code: 4900, message: 'The Merit web app page was closed.' } });
});

await test('a page that cannot be reached ends the request with 4900', async () => {
  const f = fixture({ sendFails: true });
  const reply = await f.relay.request('eth_accounts', []);
  assert.deepEqual(reply, { ok: false, error: { code: 4900, message: 'The Merit web app page could not be reached.' } });
  assert.equal(f.relay.pendingCount(), 0);
});

await test('only a few requests wait at once; more end with -32005', async () => {
  const f = fixture();
  for (let i = 0; i < MAX_PENDING; i++) void f.relay.request('personal_sign', []);
  await flush();
  assert.equal(f.relay.pendingCount(), MAX_PENDING);
  const reply = await f.relay.request('personal_sign', []);
  assert.equal(reply.error.code, -32005);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
