import type { AccountListGroup } from '@sponsorcoin/spcoin-panels';
import type { AuthenticatorId, AuthenticatorStatus } from '../auth/authenticator';
import { type ConnectHost } from '../auth/connect';
import type { Wallet, WalletAccountEntry, WalletBackendInfo } from './wallet';
/** What the host supplies for the connect operation (it owns the active account) and for the two states that need the host's own screens. */
/** 2026-11-03 (owner request): what kind of host this is, said by the host itself (injected, never sniffed by the component). */
export type ApproverHostPlatform = 'web' | 'extension' | 'android' | 'iphone';
export interface ApproverHost extends Pick<ConnectHost, 'setActiveAccount' | 'clearActiveAccount' | 'setActiveAuthenticator'> {
    /** Where to send the user to install this approver (an extension store page), or undefined when it cannot be installed from here. */
    installUrl?: (approverId: AuthenticatorId) => string | undefined;
    /** Show this approver's unlock screen (a password prompt, the wallet's own popup). Omitted: the group shows no Unlock action. */
    onUnlock?: (approverId: AuthenticatorId) => void;
    /** 2026-10-15: the id of the NATIVE wallet: the Merit wallet this host is (the web app's dev keystore, the extension's vault). Listed first, always connected, never offered Install or Connect. */
    nativeWalletId?: AuthenticatorId;
    /** 2026-11-03: the kind of app this host is. On the web and extension the running app's own "Add Account(s)" opens the Add menu (openAddMenu); on any other host it asks the wallet directly, as every remote wallet does. */
    platform?: ApproverHostPlatform;
    /** Show the Add menu (Add Wallet Authenticator or Account). The component supplies it for web and extension hosts. */
    openAddMenu?: () => void;
    /** 2026-10-15: is this wallet CONNECTED to the app? The host's one definition (the same its wallet list screen shows). undefined: no opinion, the default applies (it holds accounts here, or it is locked and offers Unlock). */
    isConnected?: (approverId: AuthenticatorId) => boolean | undefined;
    /** Open an install page. The component supplies the platform's openUrl when the host gives none. */
    openInstall?: (url: string) => void;
    /** The words for a row's name, symbol and avatar when the host knows more than the approver does (the account profiles). */
    describeAccount?: (address: string) => {
        symbol?: string;
        name?: string;
        iconSrc?: string;
    } | undefined;
}
export interface ApproverGroupsInput {
    backends: WalletBackendInfo[];
    entries: WalletAccountEntry[];
    statuses: Partial<Record<AuthenticatorId, AuthenticatorStatus>>;
    /** The wallet's active account, if any. */
    activeAddress?: string;
    /** The approver of the active account (wallet.backendIdFor(active)). */
    activeApproverId?: AuthenticatorId;
    host: Pick<ApproverHost, 'installUrl' | 'onUnlock' | 'openInstall' | 'describeAccount' | 'nativeWalletId' | 'isConnected'>;
    onConnect: (approverId: AuthenticatorId) => void;
    onDisconnect: (approverId: AuthenticatorId) => void;
    /** Whether a backend can connect an account by asking (remote approvers); keys kept here are chosen from the list instead. */
    canConnect: (approverId: AuthenticatorId) => boolean;
    /** 2026-11-03 (owner request): every group's badge reads "Add Account(s)"; a click calls this with the wallet's id (open its account selection). The native wallet may have no action: return nothing. Omitted: the badges keep their Connected / Connect words. */
    onAddAccounts?: (approverId: AuthenticatorId) => void;
    /** The accounts of a wallet whose accounts belong to another Merit wallet, each connected or disconnected (Authenticator.knownAccounts). That wallet's rows come from here and show a Connect / Disconnect button. */
    known?: Partial<Record<AuthenticatorId, Array<{
        address: string;
        name?: string;
        connected: boolean;
    }>>>;
    /** A row's Connect / Disconnect button: set that account's state in the wallet. */
    onToggleAccount?: (approverId: AuthenticatorId, address: string, connected: boolean) => void;
    /** Whether a wallet can change an account's state (Authenticator.setAccountConnected): only those rows get the button. Omitted: every wallet with known accounts. */
    canToggleAccount?: (approverId: AuthenticatorId) => boolean;
    /** Also list the wallets that are not connected (no accounts here), with their Install / Connect badges. Default false: they are not on the list. */
    showDisconnected?: boolean;
}
/**
 * 2026-11-03 (owner rule): a wallet such as MetaMask keeps ONE label per account, so the name and the symbol travel together as "Name,Symbol". Split at the first comma; a label with no comma is a name only.
 * Either half missing is filled from the public profile (describeAccount), and what is still missing reads N/A: the name is never copied into the symbol.
 */
export declare function splitNameSymbol(label: string | undefined): {
    name?: string;
    symbol?: string;
};
/** Merge host-known accounts with accounts listed by wallet backends, joining duplicate addresses case-insensitively. */
export declare function mergeWalletAccountEntries(...sources: readonly (readonly WalletAccountEntry[])[]): WalletAccountEntry[];
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
