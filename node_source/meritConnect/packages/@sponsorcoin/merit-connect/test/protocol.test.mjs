// File: test/protocol.test.mjs
//
// Row M3 of docs/design/meritConnectDesign.txt (src/protocol.ts, src/loopback.ts): the messages, the version, the error codes and the parsing, and the in-memory transport the other tests use.
// Run: node test/protocol.test.mjs   (after `npm run build`)
import assert from 'node:assert/strict';
import { ERROR, PROTOCOL_VERSION, SUPPORTED_VERSIONS, MeritConnectError, isRid, isAddress, parseRequest, parseReply, parsePush, ok, fail, METHODS, createLoopback, createRelay, createResponder } from '../dist/index.js';

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};
const flush = () => new Promise((r) => setImmediate(r));

await test('the error codes are one table', () => {
  assert.deepEqual(ERROR, { REJECTED: 4001, UNAUTHORIZED: 4100, UNSUPPORTED: 4200, UNAVAILABLE: 4900, VERSION: 4901, INVALID_PARAMS: -32602, TOO_MANY: -32005 });
  const e = new MeritConnectError(4001, 'no');
  assert.equal(e.code, 4001);
  assert.ok(e instanceof Error);
});

await test('request ids: 1 to 64 letters, digits, - and _', () => {
  for (const good of ['a', 'rq-mw4nn6wc-sg0u', 'A_b-9', 'x'.repeat(64)]) assert.equal(isRid(good), true, good);
  for (const bad of ['', 'x'.repeat(65), 'has space', 'a/b', 5, null, undefined]) assert.equal(isRid(bad), false, String(bad));
});

await test('addresses: 0x and 40 hex digits', () => {
  assert.equal(isAddress('0x' + 'aB'.repeat(20)), true);
  for (const bad of ['0x12', 'aB'.repeat(20), '0x' + 'g'.repeat(40), 5]) assert.equal(isAddress(bad), false);
});

await test('a good request parses; params are kept only when present', () => {
  assert.deepEqual(parseRequest({ v: 1, rid: 'a1', method: 'eth_accounts' }), { kind: 'ok', value: { v: 1, rid: 'a1', method: 'eth_accounts' } });
  assert.deepEqual(parseRequest({ v: 1, rid: 'a1', method: 'personal_sign', params: ['x'] }).value.params, ['x']);
});

await test('a request with another version is REFUSED with 4901 that lists the versions spoken', () => {
  const parsed = parseRequest({ v: 2, rid: 'a1', method: 'eth_accounts' });
  assert.equal(parsed.kind, 'refuse');
  assert.equal(parsed.reply.ok, false);
  assert.equal(parsed.reply.error.code, 4901);
  assert.deepEqual(parsed.reply.error.data, { supported: [...SUPPORTED_VERSIONS] });
  assert.equal(parsed.reply.rid, 'a1');
  assert.equal(parseRequest({ rid: 'a1', method: 'x' }).reply.error.code, 4901, 'no version at all');
});

await test('a request that cannot be answered (not an object, no valid id) is DROPPED', () => {
  for (const bad of [null, 'x', 7, [], { v: 1, method: 'eth_accounts' }, { v: 1, rid: 'bad id', method: 'x' }]) assert.equal(parseRequest(bad).kind, 'drop');
});

await test('a request with no method is refused with -32602', () => {
  assert.equal(parseRequest({ v: 1, rid: 'a1' }).reply.error.code, -32602);
  assert.equal(parseRequest({ v: 1, rid: 'a1', method: '' }).reply.error.code, -32602);
});

await test('replies and pushes with another version are dropped, never answered', () => {
  assert.equal(parseReply({ v: 9, rid: 'a1', ok: true }).kind, 'drop');
  assert.equal(parsePush({ v: 9, rid: 'a1', kind: 'selection', accounts: [] }).kind, 'drop');
});

await test('the allow-list holds the five approvals (2026-11-07: merit_requestConnection, the Connect page) and the four reads, and nothing else', () => {
  assert.deepEqual([...METHODS].sort(), ['eth_accounts', 'eth_chainId', 'eth_requestAccounts', 'eth_sendTransaction', 'eth_signTypedData_v4', 'merit_requestConnection', 'merit_syncAccounts', 'personal_sign', 'wallet_revokePermissions']);
});

await test('ok() and fail() build versioned replies', () => {
  assert.deepEqual(ok('a1', 5), { v: PROTOCOL_VERSION, rid: 'a1', ok: true, result: 5 });
  assert.deepEqual(fail('a1', 4900, 'x'), { v: PROTOCOL_VERSION, rid: 'a1', ok: false, error: { code: 4900, message: 'x' } });
});

// ---- the loopback, end to end ----
function wired({ handlers } = {}) {
  const lb = createLoopback();
  const log = [];
  let n = 0;
  const relay = createRelay({
    targets: () => [{ id: 1, origin: 'https://wallet.example', ready: true }],
    send: (id, m) => lb.sendRequest(id, m),
    setTimer: () => 0,
    clearTimer: () => undefined,
    newId: () => 'lb' + ++n,
    now: () => 0,
    trace: (e, d) => log.push([e, d]),
  });
  const responder = createResponder({
    reply: (r) => lb.sendReply(r),
    push: (p) => lb.sendPush(p),
    handlers: handlers ?? { chainId: () => 31337, shared: () => ['0x' + '1'.repeat(40)], setShared: () => undefined, offered: () => [], openSelection: async () => undefined },
  });
  lb.attach({ relay, responder });
  return { lb, relay, responder, log };
}

await test('loopback: a read goes to the responder and its answer comes back', async () => {
  const w = wired();
  const reply = await w.relay.request('eth_chainId', undefined);
  assert.deepEqual(reply, ok(reply.rid, '0x7a69'));
});

await test('loopback: a request in a version the responder does not speak comes back 4901', async () => {
  const w = wired();
  // a requester that speaks version 2 (the relay builds the message itself, so send one by hand through the responder)
  let got;
  const lb = createLoopback();
  const responder = createResponder({ reply: (r) => (got = r), push: () => undefined, handlers: { chainId: () => 1, shared: () => [], setShared: () => undefined, offered: () => [], openSelection: async () => undefined } });
  await responder.handle({ v: 2, rid: 'old1', method: 'eth_chainId' });
  assert.equal(got.error.code, 4901);
  assert.equal(got.rid, 'old1');
  void w; void lb;
});

await test('loopback: an unknown method answers 4200; a malformed message is dropped without an answer', async () => {
  let got;
  const responder = createResponder({ reply: (r) => (got = r), push: () => undefined, handlers: { chainId: () => 1, shared: () => [], setShared: () => undefined, offered: () => [], openSelection: async () => undefined } });
  await responder.handle({ v: 1, rid: 'u1', method: 'eth_sign' });
  assert.equal(got.error.code, 4200);
  got = undefined;
  await responder.handle({ nonsense: true });
  await responder.handle(null);
  assert.equal(got, undefined);
});

await test('loopback: a dropped request is an id with a `request` and `sent` trace and no answer', async () => {
  const w = wired();
  w.lb.drop('request');
  let settled = false;
  void w.relay.request('eth_chainId', undefined, 'rq-drop-1').then(() => (settled = true));
  await flush();
  assert.equal(settled, false);
  const events = w.log.filter(([, d]) => d.rid === 'rq-drop-1').map(([e]) => e);
  assert.deepEqual(events, ['merit-connect:request', 'merit-connect:sent']);
});

await test('loopback: a duplicated reply is taken once', async () => {
  const w = wired();
  w.lb.duplicate('reply');
  const reply = await w.relay.request('eth_chainId', undefined, 'rq-dup-1');
  assert.equal(reply.ok, true);
  await flush();
  const refused = w.log.filter(([e, d]) => e === 'merit-connect:refused' && d.rid === 'rq-dup-1');
  assert.equal(refused.length, 1, 'the second copy is refused');
});

await test('loopback: a reply that comes from the wrong sender is refused and the request keeps waiting', async () => {
  const w = wired();
  w.lb.setSender({ id: 2, origin: 'https://wallet.example' });
  let settled = false;
  void w.relay.request('eth_chainId', undefined, 'rq-mis-1').then(() => (settled = true));
  await flush();
  assert.equal(settled, false);
  assert.ok(w.log.some(([e, d]) => e === 'merit-connect:refused' && d.reason === 'wrong sender'));
  w.lb.setSender({ id: 1, origin: 'https://wallet.example' });
});

await test('loopback: delay holds messages until release', async () => {
  const w = wired();
  w.lb.delay();
  const p = w.relay.request('eth_chainId', undefined);
  await flush();
  assert.equal(w.lb.heldCount(), 1);
  w.lb.release();
  assert.equal((await p).ok, true);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
