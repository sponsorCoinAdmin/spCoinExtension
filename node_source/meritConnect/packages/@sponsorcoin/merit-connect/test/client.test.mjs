// File: test/client.test.mjs
//
// Row M6 of docs/design/meritConnectDesign.txt (src/client.ts): the standard calls. The handshake (a stale copy is corrected from the other wallet; a link that reads "not connected" is waited for; a failed or timed-out
// handshake keeps the stored copy), requestAccounts, revoke (clears first, tells the other wallet after) and fetchMeritConnections. The cases are the ones that went wrong in the live apps on 2026-11-06.
// Run: node test/client.test.mjs   (after `npm run build`)
import assert from 'node:assert/strict';
import { createMeritConnect, ok, fail, MeritConnectError, LINK_WAIT_MS, HANDSHAKE_MS, HANDSHAKE_MIN_GAP_MS } from '../dist/index.js';

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
const STALE = addr('1');

function fixture({ connected = true, stored = [], answer } = {}) {
  const calls = [];
  const timers = [];
  const listeners = new Set();
  const traces = [];
  const notices = [];
  const clock = { t: 100_000 };
  const state = { stored: [...stored], connected, loggedOn: true, detached: false, sets: [] };
  let n = 0;
  const mc = createMeritConnect({
    WEB_APP: {
      request: (method, params, rid) => {
        calls.push({ method, params, rid });
        return answer ? answer(method, params, rid) : Promise.resolve(ok(rid, [A]));
      },
      link: () => ({ connected: state.connected, loggedOn: state.loggedOn, detached: state.detached }),
      subscribeLink: (l) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
      getShared: () => state.stored,
      setShared: (a) => {
        state.stored = [...a];
        state.sets.push([...a]);
      },
      newRid: () => 'c' + ++n,
      setTimer: (fn, ms) => {
        timers.push({ fn, ms, cleared: false });
        return timers.length - 1;
      },
      clearTimer: (h) => {
        if (timers[h]) timers[h].cleared = true;
      },
      now: () => clock.t,
      trace: (e, d) => traces.push([e, d]),
      notify: (m, a) => notices.push(m + '|' + a.join(',')),
    },
  });
  const linkUp = () => {
    state.connected = true;
    listeners.forEach((l) => l());
  };
  return { mc, state, calls, timers, traces, notices, clock, linkUp, listeners };
}

/** A client that already made its first handshake (the re-send after a start): the next ones PULL. The stored copy, the calls and the clock are put back as they were. */
async function synced(f, stored) {
  await f.mc.handshake('WEB_APP');
  f.state.stored = [...stored];
  f.calls.length = 0;
  f.state.sets.length = 0;
  f.traces.length = 0;
  f.notices.length = 0;
  f.clock.t += HANDSHAKE_MIN_GAP_MS + 1;
}

await test('the handshake corrects a STALE copy from the other wallet (the live bug: 0x1111 in the extension, the web app shared 0xaaaa)', async () => {
  const f = fixture({});
  await synced(f, [STALE]);
  const r = await f.mc.handshake('WEB_APP');
  assert.deepEqual(r, { changed: true, shared: [A] });
  assert.deepEqual(f.state.stored, [A]);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].method, 'eth_accounts');
});

await test('a copy that already matches (case ignored) is not rewritten', async () => {
  const f = fixture({});
  await synced(f, [A.toUpperCase().replace('0X', '0x')]);
  const r = await f.mc.handshake('WEB_APP');
  assert.equal(r.changed, false);
  assert.deepEqual(f.state.sets, []);
});

await test('a link that reads "not connected" is WAITED for; when it comes up the handshake runs (the live race on first load)', async () => {
  const f = fixture({ connected: false, stored: [STALE] });
  const p = f.mc.handshake('WEB_APP');
  await flush();
  assert.equal(f.calls.length, 0, 'nothing is asked while the link is down');
  assert.equal(f.timers[0].ms, LINK_WAIT_MS);
  f.linkUp();
  const r = await p;
  assert.equal(f.calls[0].method, 'merit_syncAccounts', 'the first handshake RE-SENDS this wallet list');
  assert.equal(r.changed, true, 'the other wallet has only A: STALE does not exist there');
  assert.deepEqual(f.state.stored, []);
  assert.equal(f.listeners.size, 1, 'the wait unsubscribes (the one left is the client own link watch)');
  assert.equal(f.timers[0].cleared, true);
});

await test('a link that never comes up: the wait ends, nothing is asked, the stored copy is KEPT', async () => {
  const f = fixture({ connected: false, stored: [STALE] });
  const p = f.mc.handshake('WEB_APP');
  await flush();
  f.timers[0].fn();
  const r = await p;
  assert.deepEqual(r, { changed: false, shared: [STALE], skipped: 'other wallet not connected' });
  assert.equal(f.calls.length, 0);
  assert.deepEqual(f.state.stored, [STALE]);
  assert.equal(f.listeners.size, 1, 'only the client own link watch is left');
});

await test('a handshake asked a moment ago is skipped; force asks again; later it asks again', async () => {
  const f = fixture({ stored: [A] });
  await f.mc.handshake('WEB_APP');
  const again = await f.mc.handshake('WEB_APP');
  assert.equal(again.skipped, 'asked a moment ago');
  assert.equal(f.calls.length, 1);
  await f.mc.handshake('WEB_APP', { force: true });
  assert.equal(f.calls.length, 2);
  f.clock.t += HANDSHAKE_MIN_GAP_MS + 1;
  await f.mc.handshake('WEB_APP');
  assert.equal(f.calls.length, 3);
});

await test('a refused handshake keeps the stored copy and says why', async () => {
  const f = fixture({ stored: [STALE], answer: (m, p, rid) => Promise.resolve(fail(rid, 4900, 'The other wallet is not open.')) });
  const r = await f.mc.handshake('WEB_APP');
  assert.deepEqual(r, { changed: false, shared: [STALE], skipped: 'failed' });
  assert.deepEqual(f.state.stored, [STALE]);
  const t = f.traces.find(([e]) => e === 'merit-connect:handshake');
  assert.match(t[1].failed, /not open/);
});

await test('a handshake that never answers times out and KEEPS the stored copy', async () => {
  const f = fixture({ stored: [STALE], answer: () => new Promise(() => undefined) });
  const p = f.mc.handshake('WEB_APP');
  await flush();
  const timer = f.timers.find((t) => t.ms === HANDSHAKE_MS);
  assert.ok(timer, 'the answer has a time limit');
  timer.fn();
  const r = await p;
  assert.equal(r.skipped, 'failed');
  assert.deepEqual(f.state.stored, [STALE]);
});

await test('only well-formed addresses are kept from the other wallet', async () => {
  const f = fixture({ stored: [], answer: (m, p, rid) => Promise.resolve(ok(rid, [A, 'nope', 5, '0x12'])) });
  const r = await f.mc.handshake('WEB_APP');
  assert.deepEqual(r.shared, [A]);
});

await test('requestAccounts sends the accounts held now, keeps the answer, and returns it', async () => {
  const f = fixture({ stored: [STALE], answer: (m, p, rid) => Promise.resolve(ok(rid, [A, B])) });
  const accounts = await f.mc.requestAccounts('WEB_APP');
  assert.deepEqual(accounts, [A, B]);
  assert.equal(f.calls[0].method, 'eth_requestAccounts');
  assert.deepEqual(f.calls[0].params, [{ shared: [STALE] }]);
  assert.deepEqual(f.state.stored, [A, B]);
});

await test('requestAccounts throws the other wallet\'s refusal with its code, and keeps the copy', async () => {
  const f = fixture({ stored: [A], answer: (m, p, rid) => Promise.resolve(fail(rid, 4001, 'You closed the account selector.')) });
  await assert.rejects(() => f.mc.requestAccounts('WEB_APP'), (e) => e instanceof MeritConnectError && e.code === 4001);
  assert.deepEqual(f.state.stored, [A]);
});

await test('revoke KEEPS this wallet connected accounts (persisted) and tells the other wallet, which disconnects all of its own', async () => {
  const f = fixture({ stored: [A, B], answer: (m, p, rid) => Promise.resolve(ok(rid, null)) });
  await f.mc.revoke('WEB_APP');
  assert.deepEqual(f.state.stored, [A, B]);
  assert.equal(f.calls[0].method, 'wallet_revokePermissions');
});

await test('revoke keeps the accounts when the other wallet is away too', async () => {
  const f = fixture({ stored: [A], answer: () => Promise.reject(new Error('port closed')) });
  await f.mc.revoke('WEB_APP');
  assert.deepEqual(f.state.stored, [A]);
  const t = f.traces.find(([e]) => e === 'merit-connect:revoke');
  assert.match(t[1].failed, /port closed/);
});

await test('fetchMeritConnections reports the link and the shared list; it hands-shakes when the link is up', async () => {
  const f = fixture({});
  await synced(f, [STALE]);
  const c = await f.mc.fetchMeritConnections('WEB_APP');
  assert.deepEqual(c, { side: 'WEB_APP', connected: true, loggedOn: true, detached: false, shared: [A] });
});

await test('fetchMeritConnections with refresh:false never asks; with the link down it never asks and says so', async () => {
  const f = fixture({ stored: [STALE] });
  assert.deepEqual((await f.mc.fetchMeritConnections('WEB_APP', { refresh: false })).shared, [STALE]);
  const g = fixture({ connected: false, stored: [STALE] });
  const c = await g.mc.fetchMeritConnections('WEB_APP');
  assert.equal(c.connected, false);
  assert.deepEqual(c.shared, [STALE]);
  assert.equal(g.calls.length + f.calls.length, 0);
});

await test('a side this host has no connection to throws 4900', async () => {
  const f = fixture();
  await assert.rejects(() => f.mc.fetchMeritConnections('EXT'), (e) => e instanceof MeritConnectError && e.code === 4900);
  assert.throws(() => f.mc.onConnectionChange('EXT', () => undefined), (e) => e.code === 4900);
});

await test('onConnectionChange hands the host the link subscription', async () => {
  const f = fixture();
  let hits = 0;
  const off = f.mc.onConnectionChange('WEB_APP', () => hits++);
  f.linkUp();
  assert.equal(hits, 1);
  off();
  f.linkUp();
  assert.equal(hits, 1);
});

await test('RECONNECT: the first handshake after a revoke RE-SENDS the connected list; what the other wallet has comes back connected, what it lacks is removed here with the notice', async () => {
  const f = fixture({ stored: [A, B], answer: (m, p, rid) => Promise.resolve(ok(rid, m === 'merit_syncAccounts' ? [A] : null)) });
  await f.mc.revoke('WEB_APP');
  f.calls.length = 0;
  const r = await f.mc.handshake('WEB_APP');
  assert.equal(f.calls[0].method, 'merit_syncAccounts');
  assert.deepEqual(f.calls[0].params, [{ connected: [A, B] }]);
  assert.deepEqual(r.shared, [A]);
  assert.deepEqual(f.state.stored, [A]);
  assert.equal(f.notices.length, 1);
  assert.equal(f.notices[0], 'Account Does not Exist on Merit (Web App)\nRemoved from Local|' + B);
});

await test('a link that went down is re-established the same way; the handshake after that PULLS again', async () => {
  const f = fixture({ stored: [A], answer: (m, p, rid) => Promise.resolve(ok(rid, [A])) });
  await f.mc.handshake('WEB_APP');
  f.state.connected = false;
  f.listeners.forEach((l) => l());
  f.state.connected = true;
  f.clock.t += HANDSHAKE_MIN_GAP_MS + 1;
  f.calls.length = 0;
  await f.mc.handshake('WEB_APP');
  assert.equal(f.calls[0].method, 'merit_syncAccounts');
  f.clock.t += HANDSHAKE_MIN_GAP_MS + 1;
  await f.mc.handshake('WEB_APP');
  assert.equal(f.calls[1].method, 'eth_accounts');
});

await test('an account the other wallet DISCONNECTS while the link is up is removed here with the notice "Disconnected by Remote"', async () => {
  const f = fixture({ answer: (m, p, rid) => Promise.resolve(ok(rid, [A])) });
  await synced(f, [A, B]);
  await f.mc.handshake('WEB_APP');
  assert.deepEqual(f.state.stored, [A]);
  assert.equal(f.notices.length, 1);
  assert.equal(f.notices[0], 'Disconnected by Remote\nMerit (Web App)|' + B);
});

await test('nothing removed, nothing said', async () => {
  const f = fixture({ stored: [A], answer: (m, p, rid) => Promise.resolve(ok(rid, [A])) });
  await f.mc.handshake('WEB_APP');
  assert.deepEqual(f.notices, []);
});

await test('forgetAccount (2026-11-08, removeAccountPlan X3): the other wallet is told to disconnect it, then it is gone from the shared list here; the other wallet keeps the account', async () => {
  const f = fixture({ stored: [A, B], answer: (m, p, rid) => Promise.resolve(ok(rid, m === 'merit_syncAccounts' ? p[0].connected : [A, B])) });
  await f.mc.forgetAccount('WEB_APP', B);
  assert.deepEqual(f.state.stored, [A]);
  const sync = f.calls.find((c) => c.method === 'merit_syncAccounts');
  assert.ok(sync, 'the other wallet was told');
  assert.deepEqual(sync.params[0].connected, [A], 'it is asked to keep only A connected');
});

await test('forgetAccount refuses while the other wallet is not reachable (it would bring the account back at the next handshake) and changes nothing', async () => {
  const f = fixture({ connected: false, stored: [A, B] });
  const p = f.mc.forgetAccount('WEB_APP', B);
  await flush();
  f.timers[0].fn();
  await assert.rejects(p, (e) => e instanceof MeritConnectError && /not connected/.test(e.message));
  assert.deepEqual(f.state.stored, [A, B]);
  assert.equal(f.calls.length, 0);
});

await test('forgetAccount rejects something that is not an address', async () => {
  const f = fixture({ stored: [A] });
  await assert.rejects(() => f.mc.forgetAccount('WEB_APP', 'nope'), (e) => e instanceof MeritConnectError);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
