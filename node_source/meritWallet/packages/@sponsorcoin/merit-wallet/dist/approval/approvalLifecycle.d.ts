import { type MeritApprovalRequest } from './meritApproval';
/** How long a settled request may wait for a message panel before it is cleared anyway. */
export declare const SETTLING_FALLBACK_MS = 60000;
/** True when a request that is settling has had its outcome shown, so it can be cleared now. */
export declare function shouldClearSettled(request: Pick<MeritApprovalRequest, 'phase'> | null | undefined, messagePanelVisible: boolean): boolean;
/** True when `request` is one the lifecycle has not yet seen (a different id from the previous one). */
export declare function isNewApprovalRequest(previousId: number | null, request: Pick<MeritApprovalRequest, 'id'> | null | undefined): boolean;
export interface ApprovalLifecycleHost {
    /** Opens (or raises) this host's wallet window for a new request. */
    openWallet(): void;
    /** Whether this host's message panel is showing right now. */
    messagePanelVisible: boolean;
}
/** Mount once per host. */
export declare function useMeritApprovalLifecycle({ openWallet, messagePanelVisible }: ApprovalLifecycleHost): void;
