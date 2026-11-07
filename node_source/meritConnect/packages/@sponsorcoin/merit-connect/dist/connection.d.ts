import { type TraceFn } from './trace.js';
export type ConnectionState = 'connected' | 'detached' | 'page-silent' | 'no-page' | 'unknown';
export interface ProbeResult {
    /** Pages of the other wallet that answered. */
    reporting: number;
    /** Open pages that could be the other wallet but did NOT answer. */
    candidates: number;
    /** The answering page's wallet is logged on. */
    loggedOn: boolean;
}
export interface ConnectionStatus {
    state: ConnectionState;
    /** state === 'connected' */
    connected: boolean;
    /** A sentence for the person: what is wrong and what to do (or that all is well). */
    reason: string;
    loggedOn: boolean;
    reporting: number;
    candidates: number;
    detached: boolean;
    /** When this status was worked out. */
    at: number;
}
export interface ConnectionMonitorDeps {
    /** One round trip. undefined = it could not be asked. */
    probe(): Promise<ProbeResult | undefined>;
    /** The person's own choice to disconnect (kept by the host). */
    isDetached(): boolean;
    setTimer(fn: () => void, ms: number): unknown;
    clearTimer(handle: unknown): void;
    now(): number;
    /** How the other wallet is called in the sentences (default "Merit web app"). */
    label?: string;
    trace?: TraceFn;
}
export declare const CONNECT_WAIT_MS = 15000;
export declare const CONNECT_POLL_MS = 2000;
export declare function describeConnection(state: ConnectionState, label: string): string;
export declare function createConnectionMonitor(deps: ConnectionMonitorDeps): {
    getSnapshot: () => ConnectionStatus;
    subscribe: (listener: () => void) => () => void;
    refresh: () => Promise<ConnectionStatus>;
    /** The host's own state changed (the person disconnected or connected): re-derive without asking. */
    recompute: () => ConnectionStatus;
    waitForConnected: (timeoutMs?: number, pollMs?: number) => Promise<ConnectionStatus>;
};
export type ConnectionMonitor = ReturnType<typeof createConnectionMonitor>;
