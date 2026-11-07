// File: src/transports.ts
//
// 2026-11-06 (docs/design/meritConnectDesign.txt, row M7): the adapters. Each is small glue that only MOVES messages between a host's own channel and the cores; the rules stay in the cores (relay, responder, client). The host
// channels are described by structural types (TabsLike, RuntimeLike, PageProviderLike), so this package depends on no browser typings and a test can pass plain objects.
//
// The Merit Chrome extension and the Merit web app speak through the extension's content script:
//   worker -> page   chrome.tabs.sendMessage(tab, { type: 'merit/provider/event', event: 'merit_remoteRequest', data: <Request> })   the page's provider emits the event
//   page -> worker   provider.request({ method: 'merit_remoteResponse', params: [<Reply>] })   and   { method: 'merit_remoteSelection', params: [<SelectionPush>] }
//                    (the worker's sender is the tab and origin THE BROWSER reports; the message's own words are never used for identity)
//   panel -> worker  chrome.runtime.sendMessage({ type: 'merit/web/request', method, params, rid })   the answer is a <Reply>
import { ERROR, fail, parseReply, type Reply } from './protocol.js';
import { createRelay, type Relay, type RelayDeps, type RelayTarget, type SelectionChange } from './relay.js';
import { createResponder, type ResponderHandlers } from './responder.js';
import type { RequestFn } from './client.js';
import { createTrace, type TraceFn } from './trace.js';

/** The wire names. They are part of the protocol's wire format for this host pair; a new host defines its own. */
export const PAGE_EVENT = 'merit_remoteRequest';
export const PAGE_REPLY_METHOD = 'merit_remoteResponse';
export const PAGE_PUSH_METHOD = 'merit_remoteSelection';
export const PROVIDER_EVENT_TYPE = 'merit/provider/event';
export const PANEL_REQUEST_TYPE = 'merit/web/request';

/** The timers every host has, reached without depending on browser or Node typings. */
const hostTimers = globalThis as unknown as { setTimeout(fn: () => void, ms: number): unknown; clearTimeout(handle: unknown): void };

/** A unique request id without depending on browser typings. */
function randomId(): string {
  const webCrypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return webCrypto?.randomUUID ? webCrypto.randomUUID() : `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface TabsLike {
  sendMessage(tabId: number, message: unknown): Promise<unknown> | void;
}

export interface RuntimeLike {
  sendMessage(message: unknown): Promise<unknown>;
}

export interface PageProviderLike {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, listener: (data: unknown) => void): void;
  removeListener?(event: string, listener: (data: unknown) => void): void;
}

/** What the worker's browser says about a page's call. */
export interface PageSender {
  tabId?: number;
  origin?: string;
}

export interface WorkerHubOptions {
  tabs: TabsLike;
  /** The pages that reported in (the worker's table of web app tabs). */
  targets(): RelayTarget[];
  /** A change to the shared list taken from the page the selection went to (the worker stores it). */
  onSelection(change: SelectionChange): void;
  trace?: TraceFn;
  setTimer?: RelayDeps['setTimer'];
  clearTimer?: RelayDeps['clearTimer'];
  newId?: () => string;
  now?: () => number;
}

/**
 * The extension worker's side: the relay wired to the tabs, the page's calls routed back to it, and the panel's requests answered. `handlePageCall` returns undefined for a method that is not the protocol's, so the worker's
 * own method table goes on to handle it.
 */
export function createWorkerHub(options: WorkerHubOptions) {
  const relay: Relay = createRelay({
    targets: options.targets,
    send: (tabId, message) => options.tabs.sendMessage(Number(tabId), { type: PROVIDER_EVENT_TYPE, event: PAGE_EVENT, data: message }),
    setTimer: options.setTimer ?? ((fn, ms) => hostTimers.setTimeout(fn, ms)),
    clearTimer: options.clearTimer ?? ((handle) => hostTimers.clearTimeout(handle)),
    newId: options.newId ?? randomId,
    now: options.now ?? (() => Date.now()),
    trace: options.trace,
    onSelection: options.onSelection,
  });
  return {
    relay,
    /** A provider call from a page: its answer (merit_remoteResponse) or a push to the selection (merit_remoteSelection). */
    handlePageCall(method: string, params: unknown, sender: PageSender): boolean | undefined {
      if (method !== PAGE_REPLY_METHOD && method !== PAGE_PUSH_METHOD) return undefined;
      const who = { id: sender.tabId, origin: sender.origin };
      const payload = Array.isArray(params) ? params[0] : undefined;
      return method === PAGE_REPLY_METHOD ? relay.accept(who, payload) : relay.acceptPush(who, payload);
    },
    /** A message from the side panel. Returns undefined when it is not a protocol request. The panel's own checks (who may send) are the worker's. */
    handlePanelMessage(message: unknown): Promise<Reply> | undefined {
      const m = message as { type?: unknown; method?: unknown; params?: unknown; rid?: unknown } | null;
      if (!m || m.type !== PANEL_REQUEST_TYPE) return undefined;
      return relay.request(typeof m.method === 'string' ? m.method : '', m.params, typeof m.rid === 'string' ? m.rid : undefined);
    },
    /** A tab closed: its requests end now and its selections close. */
    dropTab: (tabId: number) => relay.dropTarget(tabId),
  };
}

export type WorkerHub = ReturnType<typeof createWorkerHub>;

/** The side panel's side: `RequestFn` over the worker. Always resolves with a Reply; a worker that does not answer properly is 4900. */
export function createPanelRequest(runtime: RuntimeLike): RequestFn {
  return async (method, params, rid) => {
    try {
      const answer = await runtime.sendMessage({ type: PANEL_REQUEST_TYPE, method, params, rid });
      const parsed = parseReply(answer);
      return parsed.kind === 'ok' ? parsed.value : fail(rid, ERROR.UNAVAILABLE, 'The worker did not answer.');
    } catch (error) {
      return fail(rid, ERROR.UNAVAILABLE, error instanceof Error ? error.message : 'The worker could not be reached.');
    }
  };
}

export interface WebPageResponderOptions {
  provider: PageProviderLike;
  handlers: ResponderHandlers;
  trace?: TraceFn;
}

/** The web page's side: listen for the extension's requests, answer them through the provider, push selection changes the same way. Returns the function that stops listening. */
export function attachWebPageResponder(options: WebPageResponderOptions): () => void {
  const trace = createTrace(options.trace);
  const post = (method: string, payload: { rid: string }) => {
    // the worker says whether it took the message: a message it dropped shows in this page's own trace too
    options.provider.request({ method, params: [payload] }).then(
      (taken) => trace('posted', { rid: payload.rid, method, taken }),
      (error: unknown) => trace('failed', { rid: payload.rid, method, reason: error instanceof Error ? error.message : String(error) }),
    );
  };
  const responder = createResponder({
    reply: (reply) => post(PAGE_REPLY_METHOD, reply),
    push: (push) => post(PAGE_PUSH_METHOD, push),
    handlers: options.handlers,
    trace: options.trace,
  });
  const listener = (data: unknown) => void responder.handle(data);
  options.provider.on?.(PAGE_EVENT, listener);
  return () => options.provider.removeListener?.(PAGE_EVENT, listener);
}
