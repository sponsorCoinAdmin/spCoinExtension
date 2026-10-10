export type ApprovalKind = 'sign' | 'transaction' | 'connect';
export interface ApprovalRequestInfo {
    id: string;
    kind: ApprovalKind;
    /** Who is asking: a web page origin, or 'wallet' for the wallet's own UI. */
    origin: string;
    /** One line the UI shows to the user. */
    summary: string;
    /** Structured details for the UI (never includes a key). */
    details?: Record<string, unknown>;
    createdAt: number;
}
export declare class ApprovalRejectedError extends Error {
    constructor(reason?: string);
}
export declare class ApprovalController {
    private readonly now;
    private pending;
    private listeners;
    private counter;
    constructor(now?: () => number);
    /**
     * Queue a request. The returned promise settles only after the user decides: approve runs `run` (the signing or sending) and resolves with its
     * result, or rejects with its error; reject rejects with ApprovalRejectedError. `run` is not called before approval.
     */
    request<T>(info: Omit<ApprovalRequestInfo, 'id' | 'createdAt'>, run: () => Promise<T>): Promise<T>;
    list(): ApprovalRequestInfo[];
    /** Approve: run the work. Returns once the work has finished (success or failure is also delivered to the original caller). */
    approve(id: string): Promise<void>;
    reject(id: string, reason?: string): void;
    /** Reject everything pending (the wallet locked, or the host is shutting down). */
    rejectAll(reason?: string): void;
    onChange(listener: () => void): () => void;
    private take;
    private emit;
}
