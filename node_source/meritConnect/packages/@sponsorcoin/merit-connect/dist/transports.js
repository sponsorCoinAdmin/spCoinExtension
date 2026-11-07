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
import { ERROR, fail, parseReply } from './protocol.js';
import { createRelay } from './relay.js';
import { createResponder } from './responder.js';
import { createTrace } from './trace.js';
/** The wire names. They are part of the protocol's wire format for this host pair; a new host defines its own. */
export const PAGE_EVENT = 'merit_remoteRequest';
export const PAGE_REPLY_METHOD = 'merit_remoteResponse';
export const PAGE_PUSH_METHOD = 'merit_remoteSelection';
export const PROVIDER_EVENT_TYPE = 'merit/provider/event';
export const PANEL_REQUEST_TYPE = 'merit/web/request';
/** The timers every host has, reached without depending on browser or Node typings. */
const hostTimers = globalThis;
/** A unique request id without depending on browser typings. */
function randomId() {
    const webCrypto = globalThis.crypto;
    return webCrypto?.randomUUID ? webCrypto.randomUUID() : `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
/**
 * The extension worker's side: the relay wired to the tabs, the page's calls routed back to it, and the panel's requests answered. `handlePageCall` returns undefined for a method that is not the protocol's, so the worker's
 * own method table goes on to handle it.
 */
export function createWorkerHub(options) {
    const relay = createRelay({
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
        handlePageCall(method, params, sender) {
            if (method !== PAGE_REPLY_METHOD && method !== PAGE_PUSH_METHOD)
                return undefined;
            const who = { id: sender.tabId, origin: sender.origin };
            const payload = Array.isArray(params) ? params[0] : undefined;
            return method === PAGE_REPLY_METHOD ? relay.accept(who, payload) : relay.acceptPush(who, payload);
        },
        /** A message from the side panel. Returns undefined when it is not a protocol request. The panel's own checks (who may send) are the worker's. */
        handlePanelMessage(message) {
            const m = message;
            if (!m || m.type !== PANEL_REQUEST_TYPE)
                return undefined;
            return relay.request(typeof m.method === 'string' ? m.method : '', m.params, typeof m.rid === 'string' ? m.rid : undefined);
        },
        /** A tab closed: its requests end now and its selections close. */
        dropTab: (tabId) => relay.dropTarget(tabId),
    };
}
/** The side panel's side: `RequestFn` over the worker. Always resolves with a Reply; a worker that does not answer properly is 4900. */
export function createPanelRequest(runtime) {
    return async (method, params, rid) => {
        try {
            const answer = await runtime.sendMessage({ type: PANEL_REQUEST_TYPE, method, params, rid });
            const parsed = parseReply(answer);
            return parsed.kind === 'ok' ? parsed.value : fail(rid, ERROR.UNAVAILABLE, 'The worker did not answer.');
        }
        catch (error) {
            return fail(rid, ERROR.UNAVAILABLE, error instanceof Error ? error.message : 'The worker could not be reached.');
        }
    };
}
/** The web page's side: listen for the extension's requests, answer them through the provider, push selection changes the same way. Returns the function that stops listening. */
export function attachWebPageResponder(options) {
    const trace = createTrace(options.trace);
    const post = (method, payload) => {
        // the worker says whether it took the message: a message it dropped shows in this page's own trace too
        options.provider.request({ method, params: [payload] }).then((taken) => trace('posted', { rid: payload.rid, method, taken }), (error) => trace('failed', { rid: payload.rid, method, reason: error instanceof Error ? error.message : String(error) }));
    };
    const responder = createResponder({
        reply: (reply) => post(PAGE_REPLY_METHOD, reply),
        push: (push) => post(PAGE_PUSH_METHOD, push),
        handlers: options.handlers,
        trace: options.trace,
    });
    const listener = (data) => void responder.handle(data);
    options.provider.on?.(PAGE_EVENT, listener);
    return () => options.provider.removeListener?.(PAGE_EVENT, listener);
}
