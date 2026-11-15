// File: test/connection.test.mjs
//
// Row M13 of docs/design/meritConnectDesign.txt (src/connection.ts): the connection monitor. Every state and its reason, one probe at a time, subscribers told only when something changed, the person's disconnect wins, and waitForConnected
// (resolves at once when connected, notices a page that comes back while it waits, gives up with the CURRENT reason). The failing case of 2026-11-06 is a test: a page is open but silent (a reloaded extension left it a dead content script).
// Run: node test/connection.test.mjs   (after `npm run build`)
import assert from 'node:assert/strict';
import { createConnectionMonitor, describeConnection, CONNECT_WAIT_MS, CONNECT_POLL_MS } from '../dist/index.js';

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
  for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
};

function fixture({ probe } = {}) {
  const timers = [];
  const traces = [];
  const state = { probe: probe ?? { reporting: 1, candidates: 0, loggedOn: true }, probes: 0, detached: false, fail: false, clock: 1000, gate: undefined };
  const monitor = createConnectionMonitor({
    probe: async () => {
      state.probes++;
      if (state.gate) await state.gate;
      if (state.fail) throw new Error('worker not answering');
      return state.probe === 'none' ? undefined : { ...state.probe };
    },
    isDetached: () => state.detached,
    setTimer: (fn, ms) => (timers.push({ fn, ms, cleared: false }), timers.length - 1),
    clearTimer: (h) => {
      if (timers[h]) timers[h].cleared = true;
    },
    now: () => state.clock,
    trace: (e, d) => traces.push([e, d]),
  });
  return { monitor, state, timers, traces };
}

await test('before the first probe the state is unknown, not "no page"', () => {
  const f = fixture();
  assert.equal(f.monitor.getSnapshot().state, 'unknown');
  assert.equal(f.monitor.getSnapshot().connected, false);
});

await test('a page that answers: connected, with the logged-on flag', async () => {
  const f = fixture();
  const s = await f.monitor.refresh();
  assert.equal(s.state, 'connected');
  assert.equal(s.connected, true);
  assert.equal(s.loggedOn, true);
  assert.equal(s.reporting, 1);
});

await test('a page that answers but is not logged on is STILL connected (the link never depended on login)', async () => {
  const f = fixture({ probe: { reporting: 1, candidates: 0, loggedOn: false } });
  const s = await f.monitor.refresh();
  assert.equal(s.connected, true);
  assert.equal(s.loggedOn, false);
});

await test('THE LIVE CASE: a page is open but silent (dead content script) -> page-silent, and the reason says to reload it', async () => {
  const f = fixture({ probe: { reporting: 0, candidates: 1, loggedOn: false } });
  const s = await f.monitor.refresh();
  assert.equal(s.state, 'page-silent');
  assert.equal(s.connected, false);
  assert.match(s.reason, /Reload that page/);
});

await test('no page open at all -> no-page, and the reason says to open it', async () => {
  const f = fixture({ probe: { reporting: 0, candidates: 0, loggedOn: false } });
  const s = await f.monitor.refresh();
  assert.equal(s.state, 'no-page');
  assert.match(s.reason, /Open it/);
});

await test('a probe that cannot be asked (undefined, or it throws) -> unknown, traced with the failure', async () => {
  const f = fixture({ probe: 'none' });
  assert.equal((await f.monitor.refresh()).state, 'unknown');
  const g = fixture();
  g.state.fail = true;
  assert.equal((await g.monitor.refresh()).state, 'unknown');
  assert.match(g.traces.find(([e]) => e === 'merit-connect:link.probe')[1].failed, /not answering/);
});

await test("the person's disconnect WINS over a page that answers", async () => {
  const f = fixture();
  f.state.detached = true;
  const s = await f.monitor.refresh();
  assert.equal(s.state, 'detached');
  assert.equal(s.connected, false);
  assert.match(s.reason, /You disconnected/);
});

await test('recompute re-derives when the host changes its own state (detach, attach) without asking', async () => {
  const f = fixture();
  await f.monitor.refresh();
  const probesBefore = f.state.probes;
  f.state.detached = true;
  assert.equal(f.monitor.recompute().state, 'detached');
  f.state.detached = false;
  assert.equal(f.monitor.recompute().state, 'connected');
  assert.equal(f.state.probes, probesBefore, 'no new probe');
});

await test('subscribers are told ONLY when something changed', async () => {
  const f = fixture();
  let calls = 0;
  const off = f.monitor.subscribe(() => calls++);
  await f.monitor.refresh();
  assert.equal(calls, 1);
  await f.monitor.refresh();
  await f.monitor.refresh();
  assert.equal(calls, 1, 'same answer, no notification');
  f.state.probe = { reporting: 0, candidates: 1, loggedOn: false };
  await f.monitor.refresh();
  assert.equal(calls, 2);
  off();
  f.state.probe = { reporting: 0, candidates: 0, loggedOn: false };
  await f.monitor.refresh();
  assert.equal(calls, 2, 'unsubscribed');
});

await test('every change is traced as `link` with from, to and the reason', async () => {
  const f = fixture();
  await f.monitor.refresh();
  const link = f.traces.find(([e]) => e === 'merit-connect:link');
  assert.deepEqual([link[1].from, link[1].to], ['unknown', 'connected']);
  assert.ok(link[1].reason);
});

await test('callers that arrive while a probe runs share ONE probe', async () => {
  const f = fixture();
  let open;
  f.state.gate = new Promise((r) => (open = r));
  const a = f.monitor.refresh();
  const b = f.monitor.refresh();
  open();
  await Promise.all([a, b]);
  assert.equal(f.state.probes, 1);
});

await test('waitForConnected resolves AT ONCE when already connected, without a timer left running', async () => {
  const f = fixture();
  await f.monitor.refresh();
  const s = await f.monitor.waitForConnected();
  assert.equal(s.connected, true);
  assert.ok(f.timers.every((t) => t.cleared));
});

await test('waitForConnected notices a page that comes back while it waits (the person reloaded it)', async () => {
  const f = fixture({ probe: { reporting: 0, candidates: 1, loggedOn: false } });
  const p = f.monitor.waitForConnected();
  await flush();
  assert.equal(f.monitor.getSnapshot().state, 'page-silent');
  f.state.probe = { reporting: 1, candidates: 0, loggedOn: true };
  const poll = f.timers.find((t) => t.ms === CONNECT_POLL_MS && !t.cleared);
  assert.ok(poll, 'it asks again by itself');
  poll.fn();
  const s = await p;
  assert.equal(s.connected, true);
  assert.ok(f.timers.every((t) => t.cleared), 'every timer is cleaned up');
});

await test('waitForConnected gives up at the limit with the CURRENT reason', async () => {
  const f = fixture({ probe: { reporting: 0, candidates: 1, loggedOn: false } });
  const p = f.monitor.waitForConnected();
  await flush();
  const limit = f.timers.find((t) => t.ms === CONNECT_WAIT_MS);
  assert.ok(limit);
  limit.fn();
  const s = await p;
  assert.equal(s.connected, false);
  assert.equal(s.state, 'page-silent');
  assert.match(s.reason, /Reload that page/);
  assert.ok(f.timers.every((t) => t.cleared));
});

await test('the reason names the other wallet by the host\'s label', () => {
  assert.match(describeConnection('no-page', 'Merit (EXT)'), /No Merit \(EXT\) page is open/);
  assert.match(describeConnection('page-silent', 'Merit web app'), /Merit web app page is open but is not answering/);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
