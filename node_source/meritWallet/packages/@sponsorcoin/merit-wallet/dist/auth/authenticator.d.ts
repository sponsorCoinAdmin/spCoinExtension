/** 'serverKeystore' (the web app's server keystore), 'localVault' (the extension vault), 'injected:<rdns>' (an EIP-6963 wallet), 'hardware:<kind>'. */
export type AuthenticatorId = 'serverKeystore' | 'localVault' | `injected:${string}` | `hardware:${string}`;
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
export interface AuthenticatorTransaction {
    from: string;
    to?: string;
    value?: bigint;
    data?: string;
    chainId: number;
}
export type AuthenticatorChange = 'lock' | 'unlock' | 'accountsChanged' | 'chainChanged' | 'availability';
/** The one error set every authenticator reports in (foreign errors are translated into these by the adapter). */
export type AuthenticatorErrorCode = 'user_rejected' | 'locked' | 'unauthorized' | 'unsupported' | 'unreachable' | 'wrong_chain';
export declare class AuthenticatorError extends Error {
    readonly code: AuthenticatorErrorCode;
    readonly authenticatorId: string | undefined;
    constructor(code: AuthenticatorErrorCode, message: string, authenticatorId?: string);
}
export interface Authenticator {
    readonly id: AuthenticatorId;
    /** For the account list and the Add menu. */
    readonly label: string;
    readonly icon?: string;
    readonly capabilities: AuthenticatorCapabilities;
    status(): Promise<AuthenticatorStatus>;
    /** The accounts this authenticator can sign for. */
    accounts(): Promise<AuthenticatorAccount[]>;
    /** Ask the user to connect (remote ones: the wallet's own connect popup). */
    connect?(): Promise<AuthenticatorAccount[]>;
    /** Optional: give up whatever permission connect() was granted (MetaMask: revoke the page's access). Never touches keys or the wallet's account list. */
    disconnect?(): Promise<void>;
    /** Always behind this authenticator's own approval. */
    signMessage(address: string, message: string): Promise<string>;
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
