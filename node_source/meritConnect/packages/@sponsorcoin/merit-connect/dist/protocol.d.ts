/** The protocol version this build speaks. A message with another version is answered 4901 (requests) or dropped and traced (replies, pushes). */
export declare const PROTOCOL_VERSION = 1;
export declare const SUPPORTED_VERSIONS: readonly number[];
/** The wallet being ASKED: the Merit Chrome extension's wallet or the Merit web app's wallet. */
export type Side = 'EXT' | 'WEB_APP';
/** One table of error codes, the same everywhere (MetaMask's codes where they mean the same). */
export declare const ERROR: {
    /** The person rejected or closed the request. */
    readonly REJECTED: 4001;
    /** Not authorised: the account is not shared, or the sender is not the page the request went to. */
    readonly UNAUTHORIZED: 4100;
    /** The method is not one this protocol carries. */
    readonly UNSUPPORTED: 4200;
    /** The other wallet is unreachable, closed, or did not answer in time. */
    readonly UNAVAILABLE: 4900;
    /** The protocol version is not supported; the error's `data` lists the versions the answerer speaks. */
    readonly VERSION: 4901;
    readonly INVALID_PARAMS: -32602;
    /** Too many requests are waiting on the other wallet. */
    readonly TOO_MANY: -32005;
};
export type ErrorCode = (typeof ERROR)[keyof typeof ERROR];
export interface ProtocolError {
    code: number;
    message: string;
    data?: unknown;
}
export interface Request {
    v: number;
    rid: string;
    method: string;
    params?: unknown;
}
export type Reply = {
    v: number;
    rid: string;
    ok: true;
    result: unknown;
} | {
    v: number;
    rid: string;
    ok: false;
    error: ProtocolError;
};
/** A change to the shared list, pushed while the selection the requester asked for is open. */
export interface SelectionPush {
    v: number;
    rid: string;
    kind: 'selection';
    accounts?: string[];
    closed?: true;
}
/** The link report: a wallet says it is here and whether it is logged on; `at` is the time of the person's latest connect / disconnect choice (the newer wins). */
export interface StateReport {
    v: number;
    kind: 'state';
    side: Side;
    loggedOn: boolean;
    detached: boolean;
    at: number;
}
/** Answered from what the responder already knows: nobody is asked (time limit READ_TIMEOUT_MS). wallet_revokePermissions only ever REDUCES what is shared, so it needs no person either. */
export declare const READ_METHODS: readonly string[];
/** The person approves in the wallet that holds the key (time limit APPROVAL_TIMEOUT_MS). */
export declare const APPROVAL_METHODS: readonly string[];
export declare const METHODS: ReadonlySet<string>;
export declare const READ_TIMEOUT_MS = 20000;
export declare const APPROVAL_TIMEOUT_MS = 300000;
/** How long a selection stays open to pushes after the responder's first answer. */
export declare const SELECTION_SESSION_MS = 300000;
export declare const MAX_PENDING = 8;
export declare const MAX_SHARED = 200;
export declare const isRid: (value: unknown) => value is string;
export declare const isAddress: (value: unknown) => value is string;
export declare const ok: (rid: string, result: unknown) => Reply;
export declare const fail: (rid: string, code: number, message: string, data?: unknown) => Reply;
/** An error with a protocol code: what a host throws to refuse, and what the client throws when the other wallet refused. */
export declare class MeritConnectError extends Error {
    readonly code: number;
    readonly data?: unknown;
    constructor(code: number, message: string, data?: unknown);
}
/** What a received object is: a good value, something to drop without an answer (it cannot be answered), or something to refuse with a reply. */
export type Parsed<T> = {
    kind: 'ok';
    value: T;
} | {
    kind: 'drop';
    reason: string;
} | {
    kind: 'refuse';
    reply: Reply;
    reason: string;
};
export declare function parseRequest(data: unknown): Parsed<Request>;
export declare function parseReply(data: unknown): Parsed<Reply>;
export declare function parsePush(data: unknown): Parsed<SelectionPush>;
