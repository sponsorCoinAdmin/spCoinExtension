// File: test/relay.test.mjs
//
// Row M4 of docs/design/meritConnectDesign.txt (src/relay.ts): the requester's hub. Every case of the extension's webAppRelay test (the rules it moved from) plus the selection sessions and the one trace channel.
// Run: node test/relay.test.mjs   (after `npm run build`)
import assert from 'node:assert/strict';
import { createRelay, MAX_PENDING, READ_TIMEOUT_MS, APPROVAL_TIMEOUT_MS, SELECTION_SESSION_MS, PROTOCOL_VERSION } from '../dist/index.js';

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};

const APP = 'http://localhost:3000';
function fixture({ targets, sendFails = false } = {}) {
  const sent = [];
  const timers = [];
  const changes = [];
  const traces = [];
  const clock = { t: 1000 };
  let n = 0;
  const relay = createRelay({
    targets: () => targets ?? [{ id: 7, origin: APP, ready: true }],
    send: async (id, message) => {
      if (sendFails) throw new Error('no content script');
      sent.push({ id, message });
    },
    setTimer: (fn, ms) => {
      timers.push({ fn, ms, cleared: false });
      return timers.length - 1;
    },
    clearTimer: (h) => {
      if (timers[h]) timers[h].cleared = true;
    },
    newId: () => 'id' + ++n,
    now: () => clock.t,
    trace: (event, detail) => traces.push([event, detail]),
    onSelection: (c) => changes.push(c),
  });
  return { relay, sent, timers, changes, traces, clock };
}
const flush = () => new Promise((r) => setImmediate(r));
const reply = (rid, result) => ({ v: PROTOCOL_VERSION, rid, ok: true, result });
const refusal = (rid, error) => ({ v: PROTOCOL_VERSION, rid, ok: false, error });
const FROM = { id: 7, origin: APP };

await test('only the allow-listed calls are passed on; anything else ends at once with 4200', async () => {
  const f = fixture();
  for (const method of ['eth_sendRawTransaction', 'wallet_addEthereumChain', 'eth_sign', 'merit_reportWalletState', 'personal_ecRecover']) {
    const r = await f.relay.request(method, []);
    assert.equal(r.ok, false);
    assert.equal(r.error.code, 4200);
  }
  assert.equal(f.sent.length, 0);
  assert.equal(f.relay.pendingCount(), 0);
});

await test('with no page the request ends with 4900', async () => {
  const f = fixture({ targets: [] });
  const r = await f.relay.request('eth_accounts', []);
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 4900);
});

await test('the request goes to ONE page, a ready one first, as a versioned message with its id', async () => {
  const f = fixture({ targets: [{ id: 3, origin: APP, ready: false }, { id: 9, origin: APP, ready: true }] });
  void f.relay.request('personal_sign', ['0xmsg', '0xabc']);
  await flush();
  assert.equal(f.sent.length, 1);
  assert.equal(f.sent[0].id, 9);
  assert.deepEqual(f.sent[0].message, { v: PROTOCOL_VERSION, rid: 'id1', method: 'personal_sign', params: ['0xmsg', '0xabc'] });
});

await test("the caller's own request id is used, so one id names the request on every side", async () => {
  const f = fixture();
  void f.relay.request('eth_accounts', undefined, 'rq-mine-1');
  await flush();
  assert.equal(f.sent[0].message.rid, 'rq-mine-1');
  void f.relay.request('eth_accounts', undefined, 'rq-mine-1');
  await flush();
  assert.equal(f.sent[1].message.rid, 'id1', 'a duplicate id is not reused while the first waits');
  void f.relay.request('eth_accounts', undefined, 'bad id!');
  await flush();
  assert.equal(f.sent[2].message.rid, 'id2', 'an invalid id is replaced');
});

await test('the answer from the asked page and origin resolves the request with the result', async () => {
  const f = fixture();
  const p = f.relay.request('eth_accounts', []);
  await flush();
  assert.equal(f.relay.accept(FROM, reply('id1', ['0xabc'])), true);
  assert.deepEqual(await p, reply('id1', ['0xabc']));
  assert.equal(f.relay.pendingCount(), 0);
});

await test('an answer from another page is refused and the request keeps waiting', async () => {
  const f = fixture();
  const p = f.relay.request('personal_sign', []);
  await flush();
  assert.equal(f.relay.accept({ id: 8, origin: APP }, reply('id1', '0xsig')), false);
  assert.equal(f.relay.pendingCount(), 1);
  assert.equal(f.relay.accept(FROM, reply('id1', '0xreal')), true);
  assert.deepEqual(await p, reply('id1', '0xreal'));
});

await test('an answer from another origin (same page id) is refused, and the refusal is traced with its reason', async () => {
  const f = fixture();
  void f.relay.request('personal_sign', []);
  await flush();
  assert.equal(f.relay.accept({ id: 7, origin: 'https://evil.example' }, reply('id1', '0xsig')), false);
  assert.equal(f.relay.pendingCount(), 1);
  const refused = f.traces.find(([e]) => e === 'merit-connect:refused');
  assert.equal(refused[1].reason, 'wrong sender');
  assert.equal(refused[1].rid, 'id1');
});

await test('an answer is taken once: a repeat of the same id is refused', async () => {
  const f = fixture();
  void f.relay.request('eth_accounts', []);
  await flush();
  assert.equal(f.relay.accept(FROM, reply('id1', ['0xa'])), true);
  assert.equal(f.relay.accept(FROM, reply('id1', ['0xb'])), false);
});

await test('an unknown id, a missing id, a wrong version and a non-object answer are refused', async () => {
  const f = fixture();
  void f.relay.request('eth_accounts', []);
  await flush();
  for (const bad of [reply('nope', 1), { v: 1, ok: true }, null, 'x', 7, { v: 1, rid: 5, ok: true }, { v: 99, rid: 'id1', ok: true, result: [] }]) assert.equal(f.relay.accept(FROM, bad), false);
  assert.equal(f.relay.pendingCount(), 1);
});

await test('a refusal from the page keeps its code and a bounded message; a bad code becomes 4001', async () => {
  const f = fixture();
  const a = f.relay.request('personal_sign', []);
  const b = f.relay.request('personal_sign', []);
  await flush();
  f.relay.accept(FROM, refusal('id1', { code: 4001, message: 'User rejected' }));
  f.relay.accept(FROM, refusal('id2', { code: 'x', message: 'y'.repeat(1000) }));
  assert.deepEqual((await a).error, { code: 4001, message: 'User rejected' });
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
  assert.equal((await read).error.code, 4900);
  assert.equal(f.relay.accept(FROM, reply('id1', '0x1')), false);
  assert.equal(f.relay.pendingCount(), 1);
  f.timers[1].fn();
  await sign;
  assert.equal(f.relay.pendingCount(), 0);
});

await test('an answer clears its timer', async () => {
  const f = fixture();
  void f.relay.request('eth_accounts', []);
  await flush();
  f.relay.accept(FROM, reply('id1', []));
  assert.equal(f.timers[0].cleared, true);
});

await test('a closed page ends its requests with 4900 and leaves the others', async () => {
  const f = fixture();
  const p = f.relay.request('personal_sign', []);
  await flush();
  f.relay.dropTarget(99);
  assert.equal(f.relay.pendingCount(), 1);
  f.relay.dropTarget(7);
  assert.equal((await p).error.code, 4900);
});

await test('a page that cannot be reached ends the request with 4900', async () => {
  const f = fixture({ sendFails: true });
  const r = await f.relay.request('eth_accounts', []);
  assert.equal(r.error.code, 4900);
  assert.equal(f.relay.pendingCount(), 0);
});

await test('only a few requests wait at once; more end with -32005', async () => {
  const f = fixture();
  for (let i = 0; i < MAX_PENDING; i++) void f.relay.request('personal_sign', []);
  await flush();
  assert.equal(f.relay.pendingCount(), MAX_PENDING);
  const r = await f.relay.request('personal_sign', []);
  assert.equal(r.error.code, -32005);
});

// ---- selection sessions (new) ----
const A = '0x' + 'a'.repeat(40);
const B = '0x' + 'b'.repeat(40);
const push = (rid, extra) => ({ v: PROTOCOL_VERSION, rid, kind: 'selection', ...extra });
async function openSession(f) {
  const p = f.relay.request('eth_requestAccounts', [{ shared: [] }], 'rq-sel-1');
  await flush();
  f.relay.accept(FROM, reply('rq-sel-1', [A]));
  await p;
}

await test('a selection answered by the page opens a session; pushes from that page are taken and handed to the host', async () => {
  const f = fixture();
  await openSession(f);
  assert.equal(f.relay.sessionCount(), 1);
  assert.equal(f.relay.acceptPush(FROM, push('rq-sel-1', { accounts: [A, B] })), true);
  assert.deepEqual(f.changes, [{ rid: 'rq-sel-1', accounts: [A, B] }]);
});

await test('no session for a read, or for a refused selection', async () => {
  const f = fixture();
  const p = f.relay.request('eth_accounts', undefined, 'rq-read-1');
  await flush();
  f.relay.accept(FROM, reply('rq-read-1', [A]));
  await p;
  const q = f.relay.request('eth_requestAccounts', undefined, 'rq-sel-2');
  await flush();
  f.relay.accept(FROM, refusal('rq-sel-2', { code: 4001, message: 'closed' }));
  await q;
  assert.equal(f.relay.sessionCount(), 0);
  assert.equal(f.relay.acceptPush(FROM, push('rq-read-1', { accounts: [A] })), false);
  assert.equal(f.relay.acceptPush(FROM, push('rq-sel-2', { accounts: [A] })), false);
  assert.deepEqual(f.changes, []);
});

await test('a push from another page or origin, or for an unknown id, is refused', async () => {
  const f = fixture();
  await openSession(f);
  assert.equal(f.relay.acceptPush({ id: 8, origin: APP }, push('rq-sel-1', { accounts: [B] })), false);
  assert.equal(f.relay.acceptPush({ id: 7, origin: 'https://evil.example' }, push('rq-sel-1', { accounts: [B] })), false);
  assert.equal(f.relay.acceptPush(FROM, push('rq-other', { accounts: [B] })), false);
  assert.deepEqual(f.changes, []);
});

await test('only well-formed addresses are taken, at most 200, and a malformed push is dropped', async () => {
  const f = fixture();
  await openSession(f);
  const many = Array.from({ length: 300 }, (_, i) => '0x' + i.toString(16).padStart(40, '0'));
  assert.equal(f.relay.acceptPush(FROM, push('rq-sel-1', { accounts: [A, 'nope', 5, '0x12'] })), true);
  assert.deepEqual(f.changes[0].accounts, [A]);
  assert.equal(f.relay.acceptPush(FROM, push('rq-sel-1', { accounts: many })), true);
  assert.equal(f.changes[1].accounts.length, 200);
  for (const bad of [null, 'x', { v: 1, rid: 'rq-sel-1' }, { v: 1, rid: 'rq-sel-1', kind: 'other', accounts: [] }, { v: 7, rid: 'rq-sel-1', kind: 'selection', accounts: [] }]) assert.equal(f.relay.acceptPush(FROM, bad), false);
});

await test('the responder closing the selection ends the session; later pushes are refused', async () => {
  const f = fixture();
  await openSession(f);
  assert.equal(f.relay.acceptPush(FROM, push('rq-sel-1', { closed: true })), true);
  assert.deepEqual(f.changes, [{ rid: 'rq-sel-1', closed: true }]);
  assert.equal(f.relay.sessionCount(), 0);
  assert.equal(f.relay.acceptPush(FROM, push('rq-sel-1', { accounts: [B] })), false);
});

await test('a session ends at its time limit: a late push is refused', async () => {
  const f = fixture();
  await openSession(f);
  f.clock.t += SELECTION_SESSION_MS - 1;
  assert.equal(f.relay.acceptPush(FROM, push('rq-sel-1', { accounts: [A] })), true);
  f.clock.t += 2;
  assert.equal(f.relay.acceptPush(FROM, push('rq-sel-1', { accounts: [B] })), false);
  assert.equal(f.relay.sessionCount(), 0);
});

await test('a closed page closes its sessions too', async () => {
  const f = fixture();
  await openSession(f);
  f.relay.dropTarget(7);
  assert.equal(f.relay.sessionCount(), 0);
  assert.equal(f.relay.acceptPush(FROM, push('rq-sel-1', { accounts: [A] })), false);
});

await test('every step is traced with its id: request, sent, answered, selection.open, selection.change', async () => {
  const f = fixture();
  await openSession(f);
  f.relay.acceptPush(FROM, push('rq-sel-1', { accounts: [A] }));
  const events = f.traces.map(([e]) => e);
  for (const e of ['merit-connect:request', 'merit-connect:sent', 'merit-connect:answered', 'merit-connect:selection.open', 'merit-connect:selection.change']) assert.ok(events.includes(e), 'missing ' + e);
  assert.ok(f.traces.every(([, d]) => d.rid === 'rq-sel-1' || d.rid === undefined));
});

await test('a trace sink that throws never breaks a request', async () => {
  const relay = createRelay({
    targets: () => [{ id: 7, origin: APP, ready: true }],
    send: async () => undefined,
    setTimer: () => 0,
    clearTimer: () => undefined,
    newId: () => 'x1',
    now: () => 0,
    trace: () => {
      throw new Error('log sink broke');
    },
  });
  const p = relay.request('eth_accounts', []);
  await flush();
  assert.equal(relay.accept(FROM, reply('x1', [])), true);
  assert.equal((await p).ok, true);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
