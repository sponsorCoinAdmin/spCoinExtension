// File: examples/loopback.mjs
//
// A complete example that needs no browser: a wallet that HOLDS accounts (the responder) and a wallet that ASKS for them (the client), connected through the in-memory loopback. It is the shape every host takes; only the
// transport changes (the Chrome extension and the web page adapters are in src/transports.ts).
// Run: node examples/loopback.mjs   (after `npm run build`)
import { createLoopback, createRelay, createResponder, createMeritConnect } from '../dist/index.js';

const MINE = ['0x' + 'a'.repeat(40), '0x' + 'b'.repeat(40), '0x' + 'c'.repeat(40)];
const log = (event, detail) => console.log(event.padEnd(34), JSON.stringify(detail));

// ---- the wallet that holds the accounts (for example the Merit web app) ----
const state = { shared: [], selection: undefined };
const lb = createLoopback({ sender: { id: 1, origin: 'https://wallet.example' } });
let n = 0;
const relay = createRelay({
  targets: () => [{ id: 1, origin: 'https://wallet.example', ready: true }],
  send: (id, message) => lb.sendRequest(id, message),
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (handle) => clearTimeout(handle),
  newId: () => 'rq-example-' + ++n,
  now: () => Date.now(),
  trace: log,
  // the requester's host stores every accepted change to the shared list
  onSelection: (change) => console.log('   (the requester stores)'.padEnd(34), JSON.stringify(change)),
});
const responder = createResponder({
  reply: (reply) => lb.sendReply(reply),
  push: (push) => lb.sendPush(push),
  trace: log,
  handlers: {
    chainId: () => 31337,
    shared: () => state.shared,
    setShared: (accounts) => (state.shared = accounts),
    offered: () => MINE,
    // the wallet opens ITS OWN account selector; the person's choices arrive as onChange calls
    openSelection: (selection) => new Promise((resolve) => (state.selection = { ...selection, close: resolve })),
  },
});
lb.attach({ relay, responder });

// ---- the wallet that asks (for example the Merit extension) ----
let copy = [];
const connect = createMeritConnect({
  WEB_APP: {
    request: (method, params, rid) => relay.request(method, params, rid),
    link: () => ({ connected: true, loggedOn: true, detached: false }),
    subscribeLink: () => () => undefined,
    getShared: () => copy,
    setShared: (accounts) => (copy = [...accounts]),
    newRid: () => 'rq-client-' + ++n,
    setTimer: (fn, ms) => setTimeout(fn, ms),
    clearTimer: (handle) => clearTimeout(handle),
    now: () => Date.now(),
    trace: log,
  },
});

const asking = connect.requestAccounts('WEB_APP');
await new Promise((r) => setTimeout(r, 20));
console.log('\nthe person connects the first account in the holding wallet...');
state.selection.onChange([MINE[0]]);
console.log('the asking wallet got:', await asking, '\n');

console.log('the person connects another account (pushed to the asking wallet while the selection is open)...');
state.selection.onChange([MINE[0], MINE[1]]);
await new Promise((r) => setTimeout(r, 20));
console.log('the person closes the selector...');
state.selection.close();
await new Promise((r) => setTimeout(r, 20));

console.log('\nthe asking wallet\'s copy was made stale by hand; the handshake corrects it from the authority:');
copy = ['0x' + '1'.repeat(40)];
console.log(await connect.handshake('WEB_APP', { force: true }));
console.log('\nwho is connected:', await connect.fetchMeritConnections('WEB_APP', { refresh: false }));
await connect.revoke('WEB_APP');
console.log('after revoke, the holding wallet shares:', state.shared, '| the asking wallet keeps:', copy);
