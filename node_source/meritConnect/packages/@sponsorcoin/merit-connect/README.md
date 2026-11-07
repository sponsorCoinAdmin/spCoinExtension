# @sponsorcoin/merit-connect

The protocol one Merit wallet uses to ask another Merit wallet who is connected, for its accounts, and for signatures. Zero dependencies: no React, no `window`, no `chrome`. The transport (Chrome extension messaging, a web page, the in-memory loopback) is injected.

Design, contract, error codes and the build rows: `docs/design/meritConnectDesign.txt` of the web app repo.

Status (2026-11-06): in use. The Merit Chrome extension and the Merit web app both run on it (the extension's worker relay and side-panel authenticator, the web app's responder). The protocol is version 1; the API below is the one `0.x` will keep stable. See `CHANGELOG.md`.

Build: `npm run build` (tsc, output in `dist/`, which is tracked like the other packages). Test: `npm test` (builds, runs the five test files and the mutation check: every mutant, a deliberately broken rule in a copy of the build, must be caught). Live: `test/live/meritConnect.live.cjs` runs the real extension and the real web app in a real Chromium (its header lists what it needs). Example: `node examples/loopback.mjs`, a complete holder and asker over the in-memory loopback.

## The calls

```ts
import { createMeritConnect } from '@sponsorcoin/merit-connect';

const connect = createMeritConnect({ WEB_APP: { request, link, subscribeLink, getShared, setShared, newRid, setTimer, clearTimer, now, trace } });

await connect.fetchMeritConnections('WEB_APP'); // { side, connected, loggedOn, detached, shared }
await connect.requestAccounts('WEB_APP');       // opens the other wallet's account selector
await connect.handshake('WEB_APP');             // pulls the other wallet's shared list, keeps it
await connect.revoke('WEB_APP');                // disconnects from that wallet's accounts
```

`side` is `'EXT'` or `'WEB_APP'`: the wallet being asked. The other wallet is the authority for its own shared list; the copy a wallet keeps is corrected by a pull (`handshake`), never by an unasked push.

## The halves

| Piece | Where it runs | What it does |
| --- | --- | --- |
| `createRelay` | the requester's hub (the extension's worker) | sends a request to ONE page, takes an answer only from that page and origin, once, in time; opens a selection session; takes pushes only while it is open |
| `createResponder` | the wallet that holds the accounts (the web page) | answers reads, runs the account selection, refuses what is not allow-listed, checks that a signing account is shared |
| `createMeritConnect` | the wallet that asks | the standard calls above, over one `request` function |
| `createLoopback` | tests | wires a relay to a responder in memory; can drop, duplicate, delay and mislabel messages |
| `createWorkerHub`, `createPanelRequest`, `attachWebPageResponder` | the Chrome extension and the web page | the adapters (`src/transports.ts`): the worker's relay wired to the tabs, the side panel's request over the worker, the page's responder wired to its provider |

## Writing your own transport

The cores never touch a browser API. A host supplies the channel and says who the SENDER is as its own platform knows it (the browser's tab and origin, never the message's own words):

- the requester's hub needs `targets()` (the pages it can ask), `send(targetId, message)`, timers, an id source and `now()`; it hands every incoming reply to `relay.accept(sender, payload)` and every selection push to `relay.acceptPush(sender, payload)`;
- the responder needs `reply(reply)` and `push(push)` to send, `handlers` (what the wallet knows and does), and is fed requests with `responder.handle(data)`;
- the client calls need one `request(method, params, rid)` function that resolves with a reply.

`test/transports.test.mjs` is a complete worked example with plain objects standing in for the Chrome APIs.

## The protocol in short

A message carries `v` (the version, 1) and `rid` (the request id, 1 to 64 letters, digits, `-` and `_`). Methods: `eth_chainId`, `eth_accounts`, `wallet_revokePermissions` (reads, 20 s), `eth_requestAccounts`, `personal_sign`, `eth_signTypedData_v4`, `eth_sendTransaction` (approvals, 5 min). Errors: 4001 rejected, 4100 not authorised, 4200 unsupported, 4900 unavailable, 4901 version not supported, -32602 invalid params, -32005 too many pending. The full contract, the authority and sync rules and the security rules: `docs/design/meritConnectDesign.txt`.

## The connection monitor

`createConnectionMonitor` is a plain store (`subscribe`, `getSnapshot`; it drops into `useSyncExternalStore`) that says whether the other wallet is connected and, when it is not, WHY in a sentence a person can act on:

| state | meaning | reason shown |
| --- | --- | --- |
| `connected` | a page answers and the person has not disconnected it | |
| `detached` | the person disconnected it on purpose (that choice wins) | "You disconnected ... Press Connect to use it again." |
| `page-silent` | a page is open but does not answer (a reloaded extension leaves its content script dead) | "... Reload that page (F5) and try again." |
| `no-page` | no page is open | "... Open it, or press Connect to open it." |
| `unknown` | the probe itself could not be asked | "... Reload the extension and try again." |

The host supplies one probe, `{ reporting, candidates, loggedOn }` (how many pages answered, how many pages that could be it are open and did NOT, whether the answering one is logged on). `waitForConnected(timeoutMs)` resolves as soon as it connects (asking again every 2 s, so a page the person reloads meanwhile is noticed) or at the limit with the current reason.

## Trace

Every step calls the host's trace function with `merit-connect:<event>` and a detail that carries the request id (`rid`): `request`, `sent`, `received`, `answered`, `failed`, `refused` (with the reason), `selection.open`, `selection.change`, `selection.push`, `selection.close`, `handshake`, `revoke`. A request that was dropped is an id with no later event; a mismatched one is a `refused` event that names the sender.
