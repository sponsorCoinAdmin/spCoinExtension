import { type Reply } from './protocol.js';
import { type RelayDeps, type RelayTarget, type SelectionChange } from './relay.js';
import { type ResponderHandlers } from './responder.js';
import type { RequestFn } from './client.js';
import { type TraceFn } from './trace.js';
/** The wire names. They are part of the protocol's wire format for this host pair; a new host defines its own. */
export declare const PAGE_EVENT = "merit_remoteRequest";
export declare const PAGE_REPLY_METHOD = "merit_remoteResponse";
export declare const PAGE_PUSH_METHOD = "merit_remoteSelection";
export declare const PROVIDER_EVENT_TYPE = "merit/provider/event";
export declare const PANEL_REQUEST_TYPE = "merit/web/request";
export interface TabsLike {
    sendMessage(tabId: number, message: unknown): Promise<unknown> | void;
}
export interface RuntimeLike {
    sendMessage(message: unknown): Promise<unknown>;
}
export interface PageProviderLike {
    request(args: {
        method: string;
        params?: unknown;
    }): Promise<unknown>;
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
export declare function createWorkerHub(options: WorkerHubOptions): {
    relay: {
        request: (method: string, params: unknown, requestedRid?: string) => Promise<Reply>;
        accept: (sender: import("./relay.js").Sender, payload: unknown) => boolean;
        acceptPush: (sender: import("./relay.js").Sender, payload: unknown) => boolean;
        dropTarget: (targetId: number | string) => void;
        pendingCount: () => number;
        sessionCount: () => number;
    };
    /** A provider call from a page: its answer (merit_remoteResponse) or a push to the selection (merit_remoteSelection). */
    handlePageCall(method: string, params: unknown, sender: PageSender): boolean | undefined;
    /** A message from the side panel. Returns undefined when it is not a protocol request. The panel's own checks (who may send) are the worker's. */
    handlePanelMessage(message: unknown): Promise<Reply> | undefined;
    /** A tab closed: its requests end now and its selections close. */
    dropTab: (tabId: number) => void;
};
export type WorkerHub = ReturnType<typeof createWorkerHub>;
/** The side panel's side: `RequestFn` over the worker. Always resolves with a Reply; a worker that does not answer properly is 4900. */
export declare function createPanelRequest(runtime: RuntimeLike): RequestFn;
export interface WebPageResponderOptions {
    provider: PageProviderLike;
    handlers: ResponderHandlers;
    trace?: TraceFn;
}
/** The web page's side: listen for the extension's requests, answer them through the provider, push selection changes the same way. Returns the function that stops listening. */
export declare function attachWebPageResponder(options: WebPageResponderOptions): () => void;
