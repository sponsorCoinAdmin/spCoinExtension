/** 'serverKeystore' (the web app's server keystore), 'localVault' (the extension vault), 'injected:<rdns>' (an EIP-6963 wallet), 'hardware:<kind>'. */
export type AuthenticatorId = 'serverKeystore' | 'localVault' | 'browserVault' | 'deviceVault' | `injected:${string}` | `hardware:${string}`;
export interface AuthenticatorCapabilities {
    signMessage: boolean;
    signTypedData: boolean;
    sendTransaction: boolean;
    listAccounts: boolean;
    createAccount: boolean;
    importKey: boolean;
    lock: boolean;
}
export interface AuthenticatorAccount {
    address: string;
    name?: string;
    /** Where the account came from (the Add menu entry that created or connected it), if known. */
    source?: string;
}
export interface AuthenticatorStatus {
    /** Installed / reachable. */
    available: boolean;
    /** Ready to sign without asking for a password first. */
    unlocked: boolean;
}
/** 2026-10-12 (docs/authenticationDesign.txt row 6): what the person is told about a request on the authenticator's own confirmation screen. Optional: an authenticator that has no screen of its own (an injected wallet shows its own) ignores it. */
export interface AuthenticatorDisplay {
    title?: string;
    message?: string;
    contractAddress?: string;
    accounts?: Array<{
        role: string;
        address: string;
        symbol?: string;
        name?: string;
        logoURL?: string;
    }>;
    tokens?: Array<{
        label: string;
        symbol?: string;
        name?: string;
        address?: string;
        logoURL?: string;
    }>;
    amount?: {
        label: string;
        value: string;
    };
}
export interface AuthenticatorTransaction {
    from: string;
    to?: string;
    value?: bigint;
    data?: string;
    chainId: number;
    /** What the confirmation screen shows; see AuthenticatorDisplay. */
    display?: AuthenticatorDisplay;
}
export type AuthenticatorChange = 'lock' | 'unlock' | 'accountsChanged' | 'chainChanged' | 'availability';
/** The one error set every authenticator reports in (foreign errors are translated into these by the adapter). */
export type AuthenticatorErrorCode = 'user_rejected' | 'locked' | 'unauthorized' | 'unsupported' | 'unreachable' | 'wrong_chain';
export declare class AuthenticatorError extends Error {
    readonly code: AuthenticatorErrorCode;
    readonly authenticatorId: string | undefined;
    constructor(code: AuthenticatorErrorCode, message: string, authenticatorId?: string);
}
import type { VaultCapability } from '../vault/vaultCapability';
export interface Authenticator {
    readonly id: AuthenticatorId;
    /** For the account list and the Add menu. */
    readonly label: string;
    readonly icon?: string;
    readonly capabilities: AuthenticatorCapabilities;
    /** 2026-10-11 (docs/authenticationDesign.txt 14.3): present when this authenticator keeps keys itself under a credential; the shared password / delete / backup / security panels drive it. */
    readonly vault?: VaultCapability;
    status(): Promise<AuthenticatorStatus>;
    /** The accounts this authenticator can sign for. */
    accounts(): Promise<AuthenticatorAccount[]>;
    /** Ask the user to connect (remote ones: the wallet's own connect popup). */
    connect?(): Promise<AuthenticatorAccount[]>;
    /** Optional: give up whatever permission connect() was granted (MetaMask: revoke the page's access). Never touches keys or the wallet's account list. */
    disconnect?(): Promise<void>;
    /** Always behind this authenticator's own approval. */
    /** `display` is what the authenticator's own confirmation screen tells the person (optional; a wallet with its own screen ignores it). */
    signMessage(address: string, message: string, display?: AuthenticatorDisplay): Promise<string>;
    signTypedData?(address: string, typedData: unknown): Promise<string>;
    sendTransaction(tx: AuthenticatorTransaction): Promise<{
        hash: string;
    }>;
    /** Lock / unlock / accountsChanged / chainChanged / availability. Returns the unsubscribe function. */
    onChange(listener: (change: AuthenticatorChange) => void): () => void;
}
/** What the wallet knows about an account that matters for choosing its authenticator. */
export interface AccountAuthenticatorRef {
    address: string;
    /** The user's saved choice of active authenticator. */
    activeAuthenticator?: AuthenticatorId;
    /** The source the account came from (the Add menu entry that created or connected it). */
    sourceAuthenticator?: AuthenticatorId;
}
/** Short names for the badge next to an account (Merit Wallet, Extension, MetaMask, Hardware). */
export declare function authenticatorBadge(id: string): string;
