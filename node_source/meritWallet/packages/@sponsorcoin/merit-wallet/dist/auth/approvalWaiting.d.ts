import type { Authenticator } from './authenticator';
export type ApprovalAction = 'connect' | 'sign a message' | 'sign typed data' | 'send a transaction';
export interface ApprovalWaiting {
    id: number;
    authenticatorId: string;
    /** The wallet's name as the person knows it ('MetaMask', 'Merit extension'). */
    label: string;
    action: ApprovalAction;
    startedAt: number;
}
export interface ApprovalWaitingStore {
    getState(): readonly ApprovalWaiting[];
    subscribe(listener: () => void): () => void;
    /** Register one open request; call the returned function when it ends (approved, rejected or failed). */
    begin(entry: Omit<ApprovalWaiting, 'id' | 'startedAt'>): () => void;
}
export declare function createApprovalWaitingStore(now?: () => number): ApprovalWaitingStore;
/** The one default store: the notice component reads it, the hosts wrap their remote authenticators with it. */
export declare const approvalWaiting: ApprovalWaitingStore;
/** The one sentence a person reads while a request is open. */
export declare function approvalWaitingText(pending: readonly ApprovalWaiting[]): string;
/** The same authenticator, with each request that needs the person's decision registered in the store while it is open. Everything else (id, label, capabilities, status, accounts, events) is the authenticator's own. */
export declare function withApprovalNotice(authenticator: Authenticator, store?: ApprovalWaitingStore): Authenticator;
