import { type Authenticator } from './authenticator';
export type ApprovalAction = 'connect' | 'sign a message' | 'sign typed data' | 'send a transaction';
export interface ApprovalWaiting {
    id: number;
    authenticatorId: string;
    /** The wallet's name as the person knows it ('MetaMask', 'Merit extension'). */
    label: string;
    action: ApprovalAction;
    startedAt: number;
    /** True for a wallet whose own approval screen is on this page: it is tracked for its outcome only and never shown as "waiting". */
    silent?: boolean;
}
/** How the last request ended, when it ended in a refusal or a failure (shown for a few seconds, then gone). */
export interface ApprovalOutcome {
    id: number;
    authenticatorId: string;
    label: string;
    action: ApprovalAction;
    text: string;
    at: number;
}
export interface ApprovalWaitingStore {
    getState(): readonly ApprovalWaiting[];
    subscribe(listener: () => void): () => void;
    /** The last refusal or failure, for a few seconds after it happened; undefined otherwise. */
    getOutcome(): ApprovalOutcome | undefined;
    /** Register one open request; call the returned function when it ends: with nothing when it was approved, with the error when it was refused or failed. */
    begin(entry: Omit<ApprovalWaiting, 'id' | 'startedAt'>): (error?: unknown) => void;
}
/** How long the "did not approve" line stays. */
export declare const APPROVAL_OUTCOME_MS = 10000;
export declare function createApprovalWaitingStore(now?: () => number, outcomeMs?: number): ApprovalWaitingStore;
/** The one default store: the notice component reads it, the hosts wrap their remote authenticators with it. */
export declare const approvalWaiting: ApprovalWaitingStore;
/** The one sentence for a request that was refused or failed: the wallet's name and its own words. */
export declare function outcomeText(label: string, error: unknown): string;
/** The one sentence a person reads while a request is open (a wallet whose own screen is on this page is not listed). */
export declare function approvalWaitingText(all: readonly ApprovalWaiting[]): string;
/** The same authenticator, with each request that needs the person's decision registered in the store while it is open. Everything else (id, label, capabilities, status, accounts, events) is the authenticator's own. */
export declare function withApprovalNotice(authenticator: Authenticator, store?: ApprovalWaitingStore, options?: {
    showWaiting?: boolean;
}): Authenticator;
