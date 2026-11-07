# Changelog

## Unreleased

- Opening a selection is a SYNC: `eth_requestAccounts` carries the list of accounts the caller wants connected; the remote sets exactly those that exist on it to connected before the selector opens and leaves every other account disconnected. A caller that sends no list changes nothing. 3 tests, 1 more mutant, 1 live check.
- Connection monitor (`createConnectionMonitor`, `describeConnection`): one subscribable store for the link, with the reason it is not connected (`detached`, `page-silent`, `no-page`, `unknown`) and `waitForConnected`. 15 tests, 6 more mutants.

## 0.0.1 (2026-11-06)

First version, protocol version 1.

- Messages, version check and parsing (`protocol`): one error table including 4901 (version not supported).
- Requester hub (`createRelay`): one page per request, an answer only from the page and origin asked, once, in time; selection sessions that stay open for pushes; every drop traced with its reason.
- Responder (`createResponder`): the account selection (starts from what the requester holds, the first change answers, later changes are pushed, a close ends it), revoke, the shared-account check on every signature, one request at a time.
- Standard calls (`createMeritConnect`): `fetchMeritConnections`, `requestAccounts`, `handshake` (pulled, waits for the link, keeps the stored copy on failure), `revoke`, `onConnectionChange`.
- Adapters for the Chrome extension and the web page (`createWorkerHub`, `createPanelRequest`, `attachWebPageResponder`), and the in-memory `createLoopback`.
- One trace channel, `merit-connect:<event>`, with the request id on every line.
- 74 unit tests, 17 adapter and chain tests, 26 mutants (all caught), and a live end-to-end test (`test/live`).
