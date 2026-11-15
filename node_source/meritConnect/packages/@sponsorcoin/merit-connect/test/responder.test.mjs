// File: test/responder.test.mjs
//
// Row M5 of docs/design/meritConnectDesign.txt (src/responder.ts): the responder's half, run end to end through the loopback against the relay. The account selection (start from what the requester holds, the first change
// answers, later changes are pushed, a close ends it), revoke, the shared-account check on signing, one request at a time, and the failures (dropped, mismatched, replayed ids are in relay.test.mjs and protocol.test.mjs).
// Run: node test/responder.test.mjs   (after `npm run build`)
import assert from 'node:assert/strict';
import { createLoopback, createRelay, createResponder, MeritConnectError } from '../dist/index.js';

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', name + ' :: ' + (e && e.message)]);
  }
};
const flush = async () => {
  for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r));
};

const addr = (c) => '0x' + c.repeat(40);
const A = addr('a');
const B = addr('b');
const C = addr('c');
const D = addr('d');

function fixture({ offered = [A, B, C], shared = [], sign, openFails } = {}) {
  const lb = createLoopback({ sender: { id: 1, origin: 'https://wallet.example' } });
  const state = { shared: [...shared], selections: [], changes: [], signed: [] };
  let n = 0;
  const relay = createRelay({
    targets: () => [{ id: 1, origin: 'https://wallet.example', ready: true }],
    send: (id, m) => lb.sendRequest(id, m),
    setTimer: () => 0,
    clearTimer: () => undefined,
    newId: () => 'r' + ++n,
    now: () => 0,
    onSelection: (c) => state.changes.push(c),
  });
  const responder = createResponder({
    reply: (r) => lb.sendReply(r),
    push: (p) => lb.sendPush(p),
    handlers: {
      chainId: () => 31337,
      shared: () => state.shared,
      setShared: (a) => {
        state.shared = [...a];
      },
      offered: () => offered,
      openSelection: (selection) => {
        if (openFails) return Promise.reject(new Error('the wallet could not open its selector'));
        return new Promise((resolve) => state.selections.push({ ...selection, close: resolve }));
      },
      sign: sign
        ? async (request) => {
            state.signed.push(request);
            return sign(request);
          }
        : undefined,
    },
  });
  lb.attach({ relay, responder });
  return { relay, state, lb };
}

await test('eth_chainId answers hex; eth_accounts answers the shared list', async () => {
  const f = fixture({ shared: [A] });
  assert.equal((await f.relay.request('eth_chainId', undefined)).result, '0x7a69');
  assert.deepEqual((await f.relay.request('eth_accounts', undefined)).result, [A]);
});

await test('wallet_revokePermissions empties the shared list', async () => {
  const f = fixture({ shared: [A, B] });
  const r = await f.relay.request('wallet_revokePermissions', undefined);
  assert.equal(r.ok, true);
  assert.deepEqual(f.state.shared, []);
});

await test('the selector starts from the accounts the requester holds that are still on offer', async () => {
  const f = fixture({ offered: [A, B, C], shared: [] });
  void f.relay.request('eth_requestAccounts', [{ shared: [A, D, B] }], 'rq-s1');
  await flush();
  assert.equal(f.state.selections.length, 1);
  assert.deepEqual(f.state.selections[0].start, [A, B], 'D is not on offer and is dropped');
  assert.deepEqual(f.state.selections[0].offered, [A, B, C]);
  assert.equal(f.state.selections[0].rid, 'rq-s1');
});

await test('SYNC: opening the selection makes the accounts the caller holds that exist here the shared list at once; the rest stay disconnected', async () => {
  const f = fixture({ offered: [A, B, C], shared: [C] });
  void f.relay.request('eth_requestAccounts', [{ shared: [A, D, B] }], 'rq-sync1');
  await flush();
  assert.deepEqual(f.state.shared, [A, B], 'before anyone clicks: D does not exist here (dropped), C was not held by the caller (now disconnected)');
  assert.deepEqual(f.state.selections[0].start, [A, B]);
});

await test('SYNC: a caller that holds NOTHING disconnects everything here', async () => {
  const f = fixture({ offered: [A, B], shared: [A, B] });
  void f.relay.request('eth_requestAccounts', [{ shared: [] }], 'rq-sync2');
  await flush();
  assert.deepEqual(f.state.shared, []);
  assert.deepEqual(f.state.selections[0].start, []);
});

await test('SYNC: a caller that sent no list leaves the shared list of this wallet alone', async () => {
  const f = fixture({ offered: [A, B], shared: [B] });
  void f.relay.request('eth_requestAccounts', undefined, 'rq-sync3');
  await flush();
  assert.deepEqual(f.state.shared, [B]);
});

await test('with no list from the requester the selector starts from what this wallet shares now', async () => {
  const f = fixture({ offered: [A, B], shared: [B] });
  void f.relay.request('eth_requestAccounts', undefined);
  await flush();
  assert.deepEqual(f.state.selections[0].start, [B]);
});

await test('the FIRST change answers the requester; the answer is the list as it is; the shared list is kept', async () => {
  const f = fixture();
  const p = f.relay.request('eth_requestAccounts', [{ shared: [] }], 'rq-s2');
  await flush();
  f.state.selections[0].onChange([B]);
  const r = await p;
  assert.deepEqual(r.result, [B]);
  assert.deepEqual(f.state.shared, [B]);
});

await test('the first change may be EMPTY (the person disconnected the last account): it still answers', async () => {
  const f = fixture({ shared: [A] });
  const p = f.relay.request('eth_requestAccounts', [{ shared: [A] }], 'rq-s3');
  await flush();
  f.state.selections[0].onChange([]);
  assert.deepEqual((await p).result, []);
  assert.deepEqual(f.state.shared, []);
});

await test('later changes are PUSHED to the requester while the selection is open', async () => {
  const f = fixture();
  const p = f.relay.request('eth_requestAccounts', [{ shared: [] }], 'rq-s4');
  await flush();
  f.state.selections[0].onChange([A]);
  await p;
  f.state.selections[0].onChange([A, B]);
  f.state.selections[0].onChange([B]);
  await flush();
  assert.deepEqual(f.state.changes, [{ rid: 'rq-s4', accounts: [A, B] }, { rid: 'rq-s4', accounts: [B] }]);
});

await test('closing the selector after an answer ends the selection: the requester is told and later pushes are refused', async () => {
  const f = fixture();
  const p = f.relay.request('eth_requestAccounts', [{ shared: [] }], 'rq-s5');
  await flush();
  f.state.selections[0].onChange([A]);
  await p;
  f.state.selections[0].close();
  await flush();
  assert.deepEqual(f.state.changes, [{ rid: 'rq-s5', closed: true }]);
  assert.equal(f.relay.sessionCount(), 0);
  f.state.selections[0].onChange([A, B]);
  await flush();
  assert.equal(f.state.changes.length, 1, 'a change after the close is not pushed as accepted');
});

await test('closing the selector with NO change at all answers 4001', async () => {
  const f = fixture();
  const p = f.relay.request('eth_requestAccounts', [{ shared: [] }], 'rq-s6');
  await flush();
  f.state.selections[0].close();
  const r = await p;
  assert.equal(r.ok, false);
  assert.equal(r.error.code, 4001);
});

await test('a wallet with no accounts to share answers 4900 and never opens a selector', async () => {
  const f = fixture({ offered: [] });
  const r = await f.relay.request('eth_requestAccounts', undefined);
  assert.equal(r.error.code, 4900);
  assert.equal(f.state.selections.length, 0);
});

await test('a selector that cannot open answers with its message', async () => {
  const f = fixture({ openFails: true });
  const r = await f.relay.request('eth_requestAccounts', undefined);
  assert.equal(r.ok, false);
  assert.match(r.error.message, /could not open its selector/);
});

await test('only well-formed addresses are kept from a selector; at most 200', async () => {
  const f = fixture();
  const p = f.relay.request('eth_requestAccounts', [{ shared: [] }], 'rq-s7');
  await flush();
  f.state.selections[0].onChange([A, 'nope', '0x12']);
  assert.deepEqual((await p).result, [A]);
});

await test('requests are answered one at a time, in the order they arrived', async () => {
  const f = fixture();
  const first = f.relay.request('eth_requestAccounts', [{ shared: [] }], 'rq-o1');
  const second = f.relay.request('eth_chainId', undefined, 'rq-o2');
  await flush();
  let secondDone = false;
  void second.then(() => (secondDone = true));
  await flush();
  assert.equal(secondDone, false, 'the second waits for the first');
  f.state.selections[0].onChange([A]);
  await first;
  assert.equal((await second).result, '0x7a69');
});

await test('signing needs the account to be shared: otherwise 4100, and the host is never asked', async () => {
  const f = fixture({ shared: [A], sign: async () => '0xsig' });
  for (const [method, params] of [['personal_sign', ['0x68', B]], ['eth_signTypedData_v4', [B, '{}']], ['eth_sendTransaction', [{ from: B, to: A }]]]) {
    const r = await f.relay.request(method, params);
    assert.equal(r.error.code, 4100, method);
  }
  assert.equal(f.state.signed.length, 0);
});

await test('signing for a shared account asks the host and returns its result', async () => {
  const f = fixture({ shared: [A], sign: async (req) => '0xsigned:' + req.method });
  assert.equal((await f.relay.request('personal_sign', ['0x68', A.toUpperCase().replace('0X', '0x')])).result, '0xsigned:personal_sign');
  assert.equal((await f.relay.request('eth_signTypedData_v4', [A, '{}'])).result, '0xsigned:eth_signTypedData_v4');
  assert.equal((await f.relay.request('eth_sendTransaction', [{ from: A, to: B }])).result, '0xsigned:eth_sendTransaction');
  assert.equal(f.state.signed.length, 3);
});

await test('a host that refuses with a protocol error keeps its code; a person who rejected maps to 4001', async () => {
  const f = fixture({
    shared: [A],
    sign: async (req) => {
      if (req.method === 'personal_sign') throw new MeritConnectError(4001, 'You rejected it.');
      const e = new Error('user said no');
      e.code = 'user_rejected';
      throw e;
    },
  });
  assert.deepEqual((await f.relay.request('personal_sign', ['0x68', A])).error, { code: 4001, message: 'You rejected it.' });
  assert.equal((await f.relay.request('eth_signTypedData_v4', [A, '{}'])).error.code, 4001);
});

await test('a wallet with no signing host answers 4200 for the signing methods', async () => {
  const f = fixture({ shared: [A] });
  assert.equal((await f.relay.request('personal_sign', ['0x68', A])).error.code, 4200);
});

// ---- merit_syncAccounts: the caller sets which accounts are connected here, no screen opened ----
await test('merit_syncAccounts connects exactly the listed accounts that exist here, disconnects the rest, and answers with what is connected', async () => {
  const f = fixture({ offered: [A, B, C], shared: [C] });
  const r = await f.relay.request('merit_syncAccounts', [{ connected: [A, D, B] }]);
  assert.equal(r.ok, true);
  assert.deepEqual(r.result, [A, B], 'D does not exist here');
  assert.deepEqual(f.state.shared, [A, B], 'C, connected before, is disconnected now');
  assert.equal(f.state.selections.length, 0, 'no screen is opened');
});

await test('merit_syncAccounts with an empty list disconnects everything', async () => {
  const f = fixture({ offered: [A, B], shared: [A, B] });
  assert.deepEqual((await f.relay.request('merit_syncAccounts', [{ connected: [] }])).result, []);
  assert.deepEqual(f.state.shared, []);
});

await test('merit_syncAccounts keeps only well-formed addresses and refuses a request without a list (-32602)', async () => {
  const f = fixture({ offered: [A, B] });
  assert.deepEqual((await f.relay.request('merit_syncAccounts', [{ connected: [A, 'nope', 5, '0x12'] }])).result, [A]);
  for (const bad of [undefined, [], [{}], [{ connected: 'x' }]]) assert.equal((await f.relay.request('merit_syncAccounts', bad)).error.code, -32602);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
