// File: test/accountStates.test.mjs
//
// Row M15 of docs/design/meritConnectDesign.txt (src/client.ts): the caller's list of the remote's accounts, each CONNECTED or DISCONNECTED. The owner's rules (2026-11-06):
//   - the caller's connected accounts are set connected on the remote; every other account there stays disconnected;
//   - when the CALLER changes an account's state the account STAYS in its list and only the state changes;
//   - when the REMOTE disconnects an account it is REMOVED from the caller's list (the remote owns the accounts); when the remote connects one it is ADDED.
// The tests run the caller against a real responder through the loopback, so what the remote really holds is checked, not assumed.
// Run: node test/accountStates.test.mjs   (after `npm run build`)
import assert from 'node:assert/strict';
import { createLoopback, createRelay, createResponder, createMeritConnect } from '../dist/index.js';

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

const addr = (c) => '0x' + c.repeat(40);
const A = addr('a');
const B = addr('b');
const C = addr('c');
const D = addr('d');

/** A caller (with a list that keeps disconnected accounts, unless keepsList is false) wired to a real remote. */
function world({ remoteShared = [], remoteHas = [A, B, C], callerConnected = [], callerDisconnected = [], keepsList = true, linkUp = true } = {}) {
  const lb = createLoopback({ sender: { id: 1, origin: 'https://wallet.example' } });
  const remote = { shared: [...remoteShared], selections: [], synced: [] };
  let n = 0;
  const relay = createRelay({
    targets: () => [{ id: 1, origin: 'https://wallet.example', ready: true }],
    send: (id, m) => lb.sendRequest(id, m),
    setTimer: () => 0,
    clearTimer: () => undefined,
    newId: () => 'r' + ++n,
    now: () => 0,
  });
  const responder = createResponder({
    reply: (r) => lb.sendReply(r),
    push: (p) => lb.sendPush(p),
    handlers: {
      chainId: () => 1,
      shared: () => remote.shared,
      setShared: (a) => {
        remote.shared = [...a];
        remote.synced.push([...a]);
      },
      offered: () => remoteHas,
      openSelection: (s) => new Promise((resolve) => remote.selections.push({ ...s, close: resolve })),
    },
  });
  lb.attach({ relay, responder });
  const local = { connected: [...callerConnected], disconnected: [...callerDisconnected], link: linkUp, gapClock: 0, notices: [] };
  let k = 0;
  const config = {
    request: (method, params, rid) => relay.request(method, params, rid),
    link: () => ({ connected: local.link, loggedOn: true, detached: false }),
    subscribeLink: () => () => undefined,
    getShared: () => local.connected,
    setShared: (a) => {
      local.connected = [...a];
      if (local.onSet) local.onSet();
    },
    newRid: () => 'c' + ++k,
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (h) => clearTimeout(h),
    now: () => (local.gapClock += 10_000),
    notify: (m, a) => local.notices.push(m + '|' + a.join(',')),
  };
  if (keepsList) {
    config.getDisconnected = () => local.disconnected;
    config.setDisconnected = (a) => {
      local.disconnected = [...a];
    };
  }
  const mc = createMeritConnect({ WEB_APP: config });
  return { mc, local, remote, relay, lb };
}

await test('the caller\'s connected accounts are set connected on the remote when it opens the selection; every other remote account stays disconnected', async () => {
  const w = world({ remoteShared: [C], callerConnected: [A, B] });
  void w.mc.requestAccounts('WEB_APP');
  await flush();
  assert.deepEqual(w.remote.shared, [A, B], 'C was connected on the remote but is not in the caller list: disconnected');
});

await test('the caller DISCONNECTS an account: it STAYS in the caller list as disconnected, and the remote is told', async () => {
  const w = world({ remoteShared: [A, B], callerConnected: [A, B] });
  await w.mc.setAccountConnected('WEB_APP', A, false);
  assert.deepEqual(w.local.connected, [B]);
  assert.deepEqual(w.local.disconnected, [A]);
  assert.deepEqual(w.remote.shared, [B], 'the remote no longer has it connected');
  assert.deepEqual(await w.mc.listAccounts('WEB_APP'), [{ address: B, connected: true }, { address: A, connected: false }]);
});

await test('the caller CONNECTS an account: the remote connects it, the caller lists it as connected, and it leaves the disconnected list', async () => {
  const w = world({ remoteShared: [B], callerConnected: [B], callerDisconnected: [A] });
  await w.mc.setAccountConnected('WEB_APP', A, true);
  assert.deepEqual(w.remote.shared, [B, A]);
  assert.deepEqual(w.local.connected, [B, A]);
  assert.deepEqual(w.local.disconnected, []);
});

await test('the caller cannot connect an account the remote does not have (4100), and nothing changes', async () => {
  const w = world({ remoteShared: [B], callerConnected: [B], callerDisconnected: [D] });
  await assert.rejects(() => w.mc.setAccountConnected('WEB_APP', D, true), (e) => e.code === 4100);
  assert.deepEqual(w.local.connected, [B]);
  assert.deepEqual(w.local.disconnected, [D]);
  assert.deepEqual(w.remote.shared, [B]);
});

await test('the caller cannot connect an account while the remote is not connected (4900), and nothing changes', async () => {
  const w = world({ callerConnected: [], callerDisconnected: [A], linkUp: false });
  await assert.rejects(() => w.mc.setAccountConnected('WEB_APP', A, true), (e) => e.code === 4900);
  assert.deepEqual(w.local.disconnected, [A]);
});

await test('REMOTE DISCONNECTS an account: the handshake REMOVES it from the caller list (it does not become "disconnected"), the caller\'s own disconnected accounts stay', async () => {
  const w = world({ remoteShared: [A, B], callerConnected: [A, B], callerDisconnected: [C] });
  await w.mc.handshake('WEB_APP');
  w.remote.shared = [B];
  const r = await w.mc.handshake('WEB_APP');
  assert.deepEqual(r.shared, [B]);
  assert.match(w.local.notices[0], /Disconnected by Remote/);
  assert.deepEqual(w.local.connected, [B], 'A was disconnected by the remote: gone from the caller');
  assert.deepEqual(w.local.disconnected, [C], 'C is the caller\'s own disconnected account: it stays listed');
});

await test('REMOTE CONNECTS an account: the handshake ADDS it to the caller list as connected', async () => {
  const w = world({ remoteShared: [A, B], callerConnected: [A] });
  await w.mc.handshake('WEB_APP');
  w.remote.shared = [A, B];
  await w.mc.handshake('WEB_APP');
  assert.deepEqual(w.local.connected, [A, B]);
});

await test('THE CALLER\'S DISCONNECT WINS: an account the caller disconnected while the remote was away is disconnected on the remote at the next handshake', async () => {
  const w = world({ remoteShared: [A, B], callerConnected: [B], callerDisconnected: [A], linkUp: false });
  // the caller changed A while away (kept, disconnected); now the link is back and the remote still has A connected
  w.local.link = true;
  await w.mc.handshake('WEB_APP');
  assert.deepEqual(w.remote.shared, [B], 'the remote was told');
  assert.deepEqual(w.local.disconnected, [A], 'and the account is still listed here, disconnected');
  assert.deepEqual(w.local.connected, [B]);
});

await test('THE LIVE RACE: the list reload that the change itself causes does not pull the account back (the remote has not heard of the change yet)', async () => {
  const w = world({ remoteShared: [A, B], callerConnected: [A, B] });
  await w.mc.handshake('WEB_APP');
  w.remote.synced.length = 0;
  w.local.onSet = () => void w.mc.handshake('WEB_APP');
  await w.mc.setAccountConnected('WEB_APP', A, false);
  await flush();
  assert.deepEqual(w.local.connected, [B]);
  assert.deepEqual(w.local.disconnected, [A]);
  assert.deepEqual(w.remote.shared, [B]);
  assert.equal(w.remote.synced.length, 1, 'the reload did not ask the remote again while the change was being sent');
  w.local.onSet = () => void w.mc.handshake('WEB_APP');
  await w.mc.setAccountConnected('WEB_APP', A, true);
  await flush();
  assert.deepEqual([...w.local.connected].sort(), [A, B].sort());
  assert.deepEqual(w.local.disconnected, []);
  assert.deepEqual([...w.remote.shared].sort(), [A, B].sort(), 'connecting is not undone by the reload either');
});

await test('a disconnect made while the remote is away only changes the caller list; nothing is sent', async () => {
  const w = world({ remoteShared: [A], callerConnected: [A], linkUp: false });
  await w.mc.setAccountConnected('WEB_APP', A, false);
  assert.deepEqual(w.local.disconnected, [A]);
  assert.deepEqual(w.remote.shared, [A], 'the remote was not reachable and still has it');
});

await test('the wallet-level Disconnect KEEPS the caller accounts connected (persisted) while the REMOTE disconnects all of its accounts', async () => {
  const w = world({ remoteShared: [A, B], callerConnected: [A, B], callerDisconnected: [C] });
  await w.mc.revoke('WEB_APP');
  assert.deepEqual(w.local.connected, [A, B]);
  assert.deepEqual(w.local.disconnected, [C]);
  assert.deepEqual(w.remote.shared, []);
});

await test('RECONNECT: the caller re-sends its connected list and the remote is back as it was; the caller own disconnected accounts stay disconnected', async () => {
  const w = world({ remoteShared: [A, B], callerConnected: [A, B], callerDisconnected: [C] });
  await w.mc.handshake('WEB_APP'); // the client is settled: only the revoke can make the next handshake a re-send
  await w.mc.revoke('WEB_APP');
  assert.deepEqual(w.remote.shared, []);
  const r = await w.mc.handshake('WEB_APP');
  assert.deepEqual(w.remote.shared, [A, B]);
  assert.deepEqual(r.shared, [A, B]);
  assert.deepEqual(w.local.notices, []);
});

await test('RECONNECT: an account the remote does not have is REMOVED from the caller and the person is told', async () => {
  const w = world({ remoteShared: [A], remoteHas: [A, B], callerConnected: [A, D], callerDisconnected: [C] });
  await w.mc.revoke('WEB_APP');
  await w.mc.handshake('WEB_APP');
  assert.deepEqual(w.local.connected, [A]);
  assert.deepEqual(w.remote.shared, [A]);
  assert.deepEqual(w.local.disconnected, [C]);
  assert.equal(w.local.notices.length, 1);
  assert.match(w.local.notices[0], /Account Does not Exist on Merit \(Web App\)\nRemoved from Local/);
});

await test('the selector reopened later: the caller connected list (not the disconnected ones) is what the remote connects', async () => {
  const w = world({ remoteShared: [], callerConnected: [B], callerDisconnected: [A] });
  void w.mc.requestAccounts('WEB_APP');
  await flush();
  assert.deepEqual(w.remote.shared, [B]);
  assert.deepEqual(w.remote.selections[0].start, [B]);
});

await test('an account the person connects in the remote selector leaves the caller\'s disconnected list when the answer arrives', async () => {
  const w = world({ callerConnected: [B], callerDisconnected: [A] });
  const p = w.mc.requestAccounts('WEB_APP');
  await flush();
  w.remote.selections[0].onChange([B, A]);
  await p;
  assert.deepEqual(w.local.connected, [B, A]);
  assert.deepEqual(w.local.disconnected, []);
});

await test('a host that keeps no disconnected list: a disconnect REMOVES the account (the earlier behaviour)', async () => {
  const w = world({ remoteShared: [A, B], callerConnected: [A, B], keepsList: false });
  await w.mc.setAccountConnected('WEB_APP', A, false);
  assert.deepEqual(w.local.connected, [B]);
  assert.deepEqual(await w.mc.listAccounts('WEB_APP'), [{ address: B, connected: true }]);
  await w.mc.revoke('WEB_APP');
  assert.deepEqual(w.local.connected, [B]);
});

await test('addresses are validated', async () => {
  const w = world();
  await assert.rejects(() => w.mc.setAccountConnected('WEB_APP', 'nope', true), (e) => e.code === -32602);
});

for (const [k, v] of results) console.log(k + '  ' + v);
const failed = results.filter((r) => r[0] === 'FAIL').length;
console.log(failed ? `\n${failed} FAILED` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
void D;
