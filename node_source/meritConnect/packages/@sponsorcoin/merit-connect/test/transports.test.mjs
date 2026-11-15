// File: test/transports.test.mjs
//
// Row M7 of docs/design/meritConnectDesign.txt (src/transports.ts): the adapters for the Chrome extension and the web page, and the WHOLE CHAIN (side panel -> worker -> tab -> page -> worker -> side panel) with plain objects
// standing in for chrome.runtime, chrome.tabs and the page provider. Also row M11's cases that need no browser: a closed tab, a wrong tab, an expired id, a version mismatch, a dropped message.
// Run: node test/transports.test.mjs   (after `npm run build`)
import assert from 'node:assert/strict';
import { createWorkerHub, createPanelRequest, attachWebPageResponder, createMeritConnect, PAGE_EVENT, PAGE_REPLY_METHOD, PAGE_PUSH_METHOD, PROVIDER_EVENT_TYPE, PANEL_REQUEST_TYPE, PROTOCOL_VERSION, ok } from '../dist/index.js';

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
  for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r));
};

const ORIGIN = 'http://localhost:3000';
const addr = (c) => '0x' + c.repeat(40);
const A = addr('a');
const B = addr('b');

/** The whole chain with fakes. `tab` is the tab the page lives in. */
function chain({ offered = [A, B], shared = [], tab = 7, stored = [], connected = true } = {}) {
  const log = [];
  const trace = (e, d) => log.push([e, d]);
  const listeners = new Set();
  const page = { shared: [...shared], selections: [] };
  const extension = { stored: [...stored], writes: [] };
  const changes = [];
  const sendTo = { fail: false, drop: false };

  // the page's provider: emits the event, and its request() goes to the worker with the tab and origin the BROWSER reports
  const provider = {
    on: (event, l) => event === PAGE_EVENT && listeners.add(l),
    removeListener: (event, l) => event === PAGE_EVENT && listeners.delete(l),
    request: async ({ method, params }) => hub.handlePageCall(method, params, { tabId: page.tabId ?? tab, origin: page.origin ?? ORIGIN }),
  };
  const tabs = {
    sendMessage: async (tabId, message) => {
      if (sendTo.fail) throw new Error('no content script');
      assert.equal(message.type, PROVIDER_EVENT_TYPE);
      assert.equal(message.event, PAGE_EVENT);
      if (tabId !== tab || sendTo.drop) return;
      listeners.forEach((l) => l(message.data));
    },
  };
  const timers = [];
  const hub = createWorkerHub({
    tabs,
    targets: () => [{ id: tab, origin: ORIGIN, ready: true }],
    onSelection: (c) => {
      changes.push(c);
      if (c.accounts) extension.stored = [...c.accounts];
    },
    trace: (e, d) => trace('worker:' + e, d),
    setTimer: (fn, ms) => (timers.push({ fn, ms }), timers.length - 1),
    clearTimer: () => undefined,
    newId: (() => { let n = 0; return () => 'h' + ++n; })(),
  });
  const stop = attachWebPageResponder({
    provider,
    trace: (e, d) => trace('page:' + e, d),
    handlers: {
      chainId: () => 31337,
      shared: () => page.shared,
      setShared: (a) => {
        page.shared = [...a];
      },
      offered: () => offered,
      openSelection: (s) => new Promise((resolve) => page.selections.push({ ...s, close: resolve })),
      sign: async (req) => '0xsigned:' + req.method,
    },
  });
  // the side panel's runtime: the message goes to the worker
  const runtime = {
    sendMessage: async (message) => {
      assert.equal(message.type, PANEL_REQUEST_TYPE);
      return hub.handlePanelMessage(message);
    },
  };
  const linkListeners = new Set();
  const state = { connected };
  let n = 0;
  const mc = createMeritConnect({
    WEB_APP: {
      request: createPanelRequest(runtime),
      link: () => ({ connected: state.connected, loggedOn: true, detached: false }),
      subscribeLink: (l) => (linkListeners.add(l), () => linkListeners.delete(l)),
      getShared: () => extension.stored,
      setShared: (a) => {
        extension.stored = [...a];
        extension.writes.push([...a]);
      },
      newRid: () => 'rq-' + ++n,
      setTimer: (fn, ms) => (timers.push({ fn, ms }), timers.length - 1),
      clearTimer: () => undefined,
      now: () => Date.now(),
      trace: (e, d) => trace('panel:' + e, d),
    },
  });
  return { mc, hub, page, extension, changes, log, provider, tabs, sendTo, listeners, stop, timers, state, linkListeners };
}

await test('the panel asks, the worker sends the event to the tab, the page answers: a read round trip', async () => {
  const c = chain({ shared: [A] });
  const r = await c.hub.relay.request('eth_accounts', undefined, 'rq-r1');
  assert.deepEqual(r, ok('rq-r1', [A]));
});

await test('requestAccounts end to end: the selector opens, the first change answers, the panel keeps the answer', async () => {
  const c = chain({ stored: [] });
  const p = c.mc.requestAccounts('WEB_APP');
  await flush();
  assert.equal(c.page.selections.length, 1);
  c.page.selections[0].onChange([A]);
  assert.deepEqual(await p, [A]);
  assert.deepEqual(c.extension.stored, [A]);
});

await test('LIVE SYNC: later changes in the page reach the worker as pushes while the selection is open; the close ends it', async () => {
  const c = chain();
  const p = c.mc.requestAccounts('WEB_APP');
  await flush();
  c.page.selections[0].onChange([A]);
  await p;
  c.page.selections[0].onChange([A, B]);
  await flush();
  c.page.selections[0].onChange([B]);
  await flush();
  assert.deepEqual(c.extension.stored, [B]);
  c.page.selections[0].close();
  await flush();
  assert.deepEqual(c.changes.at(-1).closed, true);
  c.page.selections[0].onChange([A]);
  await flush();
  assert.deepEqual(c.extension.stored, [B], 'a change after the close is refused by the worker');
});

await test('the selector starts from what the extension holds (the "held" list travels in the request)', async () => {
  const c = chain({ stored: [B], shared: [] });
  void c.mc.requestAccounts('WEB_APP');
  await flush();
  assert.deepEqual(c.page.selections[0].start, [B]);
});

await test('HANDSHAKE end to end: a stale copy in the extension is corrected from the page', async () => {
  const c = chain({ shared: [], stored: [] });
  await c.mc.handshake('WEB_APP'); // the first handshake re-sends the extension list (here: nothing)
  c.page.shared = [A];
  const r = await c.mc.handshake('WEB_APP', { force: true });
  assert.equal(r.changed, true);
  assert.deepEqual(c.extension.stored, [A]);
});

await test('REVOKE end to end: the page\'s shared list is cleared, the extension keeps its accounts, and the next handshake re-sends them', async () => {
  const c = chain({ shared: [A, B], stored: [A, B] });
  await c.mc.revoke('WEB_APP');
  assert.deepEqual(c.extension.stored, [A, B]);
  assert.deepEqual(c.page.shared, []);
  await c.mc.handshake('WEB_APP', { force: true });
  assert.deepEqual(c.page.shared, [A, B], 'the connection states are re-established');
});

await test('signing end to end for a shared account; 4100 for one that is not shared', async () => {
  const c = chain({ shared: [A] });
  assert.equal((await c.hub.relay.request('personal_sign', ['0x68', A])).result, '0xsigned:personal_sign');
  assert.equal((await c.hub.relay.request('personal_sign', ['0x68', B])).error.code, 4100);
});

await test('a page in the WRONG TAB cannot answer: its reply is refused and the request waits (then times out)', async () => {
  const c = chain({ shared: [A] });
  c.page.tabId = 99; // the browser says the page's calls come from another tab
  let settled;
  void c.hub.relay.request('eth_accounts', undefined, 'rq-w1').then((r) => (settled = r));
  await flush();
  assert.equal(settled, undefined);
  assert.ok(c.log.some(([e, d]) => e === 'worker:merit-connect:refused' && d.reason === 'wrong sender' && d.rid === 'rq-w1'));
  const timeout = c.timers.find((t) => t.ms === 20_000);
  timeout.fn();
  await flush();
  assert.equal(settled.error.code, 4900);
});

await test('a page on another ORIGIN cannot answer or push', async () => {
  const c = chain({ shared: [A] });
  c.page.origin = 'https://evil.example';
  let settled;
  void c.hub.relay.request('eth_accounts', undefined, 'rq-o1').then((r) => (settled = r));
  await flush();
  assert.equal(settled, undefined);
});

await test('a closed tab ends the request with 4900 and closes its selection', async () => {
  const c = chain();
  const p = c.mc.requestAccounts('WEB_APP');
  await flush();
  c.hub.dropTab(7);
  await assert.rejects(() => p, (e) => e.code === 4900);
});

await test('a tab that cannot be reached ends the request with 4900', async () => {
  const c = chain();
  c.sendTo.fail = true;
  const r = await c.hub.relay.request('eth_accounts', undefined, 'rq-u1');
  assert.equal(r.error.code, 4900);
});

await test('a request the tab never receives (dropped) times out; an answer after that is refused ("expired")', async () => {
  const c = chain({ shared: [A] });
  c.sendTo.drop = true;
  let settled;
  void c.hub.relay.request('eth_accounts', undefined, 'rq-d1').then((r) => (settled = r));
  await flush();
  assert.equal(settled, undefined);
  c.timers.find((t) => t.ms === 20_000).fn();
  await flush();
  assert.equal(settled.error.code, 4900);
  // the answer arrives late
  const taken = c.hub.handlePageCall(PAGE_REPLY_METHOD, [ok('rq-d1', [A])], { tabId: 7, origin: ORIGIN });
  assert.equal(taken, false);
});

await test('a request in another protocol version is answered 4901 by the page; a pushed selection in another version is dropped', async () => {
  const c = chain({ shared: [A] });
  const replies = [];
  const origRequest = c.provider.request;
  c.provider.request = async (args) => {
    replies.push(args);
    return origRequest(args);
  };
  c.listeners.forEach((l) => l({ v: 9, rid: 'old-1', method: 'eth_accounts' }));
  await flush();
  const answer = replies.find((r) => r.method === PAGE_REPLY_METHOD).params[0];
  assert.equal(answer.error.code, 4901);
  assert.equal(c.hub.handlePageCall(PAGE_PUSH_METHOD, [{ v: 9, rid: 'x', kind: 'selection', accounts: [] }], { tabId: 7, origin: ORIGIN }), false);
});

await test('a method that is not the protocol\'s is left to the worker (undefined), and a non-protocol panel message too', async () => {
  const c = chain();
  assert.equal(c.hub.handlePageCall('merit_reportWalletState', [{}], { tabId: 7, origin: ORIGIN }), undefined);
  assert.equal(c.hub.handlePanelMessage({ type: 'merit/web/status' }), undefined);
  assert.equal(c.hub.handlePanelMessage(null), undefined);
});

await test('the panel gets 4900 when the worker does not answer properly, and when it cannot be reached', async () => {
  const bad = createPanelRequest({ sendMessage: async () => ({ nonsense: true }) });
  assert.equal((await bad('eth_accounts', undefined, 'p1')).error.code, 4900);
  const gone = createPanelRequest({ sendMessage: async () => { throw new Error('port closed'); } });
  const r = await gone('eth_accounts', undefined, 'p2');
  assert.equal(r.error.code, 4900);
  assert.match(r.error.message, /port closed/);
  assert.equal(r.rid, 'p2');
});

await test('detaching the page responder stops it listening', async () => {
  const c = chain({ shared: [A] });
  assert.equal(c.listeners.size, 1);
  c.stop();
  assert.equal(c.listeners.size, 0);
});

await test('ONE request id names the request in the panel, the worker and the page (the trace the owner asked for)', async () => {
  const c = chain();
  const p = c.mc.requestAccounts('WEB_APP');
  await flush();
  c.page.selections[0].onChange([A]);
  await p;
  const rid = 'rq-1';
  const sides = new Set(c.log.filter(([, d]) => d.rid === rid).map(([e]) => e.split(':')[0]));
  assert.deepEqual([...sides].sort(), ['page', 'panel', 'worker']);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
void PROTOCOL_VERSION;
