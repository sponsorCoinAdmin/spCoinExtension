import type { AccountListGroup } from '@sponsorcoin/spcoin-panels';
import type { AuthenticatorId, AuthenticatorStatus } from '../auth/authenticator';
import { type ConnectHost } from '../auth/connect';
import type { Wallet, WalletAccountEntry, WalletBackendInfo } from './wallet';
/** What the host supplies for the connect operation (it owns the active account) and for the two states that need the host's own screens. */
export interface ApproverHost extends Pick<ConnectHost, 'setActiveAccount' | 'clearActiveAccount' | 'setActiveAuthenticator'> {
    /** Where to send the user to install this approver (an extension store page), or undefined when it cannot be installed from here. */
    installUrl?: (approverId: AuthenticatorId) => string | undefined;
    /** Show this approver's unlock screen (a password prompt, the wallet's own popup). Omitted: the group shows no Unlock action. */
    onUnlock?: (approverId: AuthenticatorId) => void;
    /** Open an install page. Default: window.open in a new tab. */
    openInstall?: (url: string) => void;
    /** The words for a row's name, symbol and avatar when the host knows more than the approver does (the account profiles). */
    describeAccount?: (address: string) => {
        symbol?: string;
        name?: string;
        iconSrc?: string;
    } | undefined;
    /** The title of an approver's group when the host words it differently from the approver's own label ('Merit Wallet' for the extension's vault). */
    groupLabel?: (backend: WalletBackendInfo) => string | undefined;
}
export interface ApproverGroupsInput {
    backends: WalletBackendInfo[];
    entries: WalletAccountEntry[];
    statuses: Partial<Record<AuthenticatorId, AuthenticatorStatus>>;
    /** The wallet's active account, if any. */
    activeAddress?: string;
    /** The approver of the active account (wallet.backendIdFor(active)). */
    activeApproverId?: AuthenticatorId;
    host: Pick<ApproverHost, 'installUrl' | 'onUnlock' | 'openInstall' | 'describeAccount' | 'groupLabel'>;
    onConnect: (approverId: AuthenticatorId) => void;
    onDisconnect: (approverId: AuthenticatorId) => void;
    /** Whether a backend can connect an account by asking (remote approvers); keys kept here are chosen from the list instead. */
    canConnect: (approverId: AuthenticatorId) => boolean;
}
/** The groups for the shared account list. Pure: the statuses and the entries are read by the caller. */
export declare function buildApproverGroups(input: ApproverGroupsInput): AccountListGroup[];
/** The words a failed connect is reported in. */
export declare function connectNoticeText(error: unknown): string;
export interface ApproverController {
    /** Connect an account (or, with no address, ask the approver: its own account picker). Reports a failure through `onNotice` and never changes the active account then. */
    connect(approverId: AuthenticatorId, address?: string): Promise<boolean>;
    disconnect(approverId?: AuthenticatorId): Promise<void>;
}
/** The connect / disconnect operations of one wallet, wired to the host, with failures reported as text. */
export declare function createApproverController(wallet: Wallet, host: ApproverHost, onNotice: (text: string) => void, getActiveAddress: () => string | undefined): ApproverController;
