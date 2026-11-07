import { type Reply, type Request } from './protocol.js';
import { type TraceFn } from './trace.js';
/** A page that reported in and can be asked. */
export interface RelayTarget {
    id: number | string;
    origin: string;
    /** Preferred when it is logged on (the first target is used when none is). */
    ready: boolean;
}
/** What the transport knows about whoever sent a message: the BROWSER's word, never the message's. */
export interface Sender {
    id?: number | string;
    origin?: string;
}
/** A change to the shared list that the relay accepted (the host stores it). */
export type SelectionChange = {
    rid: string;
    accounts: string[];
} | {
    rid: string;
    closed: true;
};
export interface RelayDeps {
    targets(): RelayTarget[];
    send(targetId: number | string, message: Request): Promise<unknown> | void;
    setTimer(fn: () => void, ms: number): unknown;
    clearTimer(handle: unknown): void;
    newId(): string;
    now(): number;
    trace?: TraceFn;
    /** A change to the shared list, taken from the page the selection went to while the selection is open. */
    onSelection?(change: SelectionChange): void;
}
export declare function createRelay(deps: RelayDeps): {
    request: (method: string, params: unknown, requestedRid?: string) => Promise<Reply>;
    accept: (sender: Sender, payload: unknown) => boolean;
    acceptPush: (sender: Sender, payload: unknown) => boolean;
    dropTarget: (targetId: number | string) => void;
    pendingCount: () => number;
    sessionCount: () => number;
};
export type Relay = ReturnType<typeof createRelay>;
