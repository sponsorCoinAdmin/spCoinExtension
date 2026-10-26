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
/** 2026-10-12 (docs/design/accountAuthDesign.txt row 6): what the person is told about a request on the authenticator's own confirmation screen. Optional: an authenticator that has no screen of its own (an injected wallet shows its own) ignores it. */
export interface AuthenticatorDisplay {
    title?: string;
    message?: string;
    contractAddress?: string;
    accounts?: {
        role: string;
        address: string;
        symbol?: string;
        name?: string;
        logoURL?: string;
    }[];
    tokens?: {
        label: string;
        symbol?: string;
        name?: string;
        address?: string;
        logoURL?: string;
    }[];
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
    /** 2026-10-15 (docs/design/spcoinPackagesDesign.txt 8.5.8): the wallet's own name, the same everywhere it is seen ("Merit Wallet (Extension)", "MetaMask", "Ledger (Hardware)"). The authenticator SUPPLIES it, so a new wallet needs no edit in the package;
     *  walletName(id) below is only the fallback for an authenticator that gives none. */
    readonly displayName?: string;
    /** The short name next to an account ("Extension", "MetaMask", "Hardware"). Supplied the same way; authenticatorBadge(id) is the fallback. */
    readonly badge?: string;
    readonly icon?: string;
    readonly capabilities: AuthenticatorCapabilities;
    /** 2026-10-11 (docs/design/accountAuthDesign.txt 14.3): present when this authenticator keeps keys itself under a credential; the shared password / delete / backup / security panels drive it. */
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
/** Where a Merit wallet runs. A vault reports it; a signing-only wallet (MetaMask, a hardware device) has none. */
export type WalletPlatform = 'web' | 'extension' | 'android' | 'iphone';
/**
 * 2026-10-12 (docs/design/accountAuthDesign.txt section 18 section 3): the ONE name of a wallet, the same everywhere it is seen: the product and, in brackets, where it runs. "Merit Wallet (Web)" is the browser vault, "Merit (Extension)" the extension's vault (the
 * web page that connects to the extension sees the same wallet, so it has the same name), "Merit Wallet (Android)" / "(I-Phone)" the phone apps, "Merit Wallet (Web Dev Server)" the development keystore of the developer pages, "MetaMask", and a hardware
 * wallet by its own name. A vault's own platform (when it reports one) decides the bracket for the Merit wallets that run in more than one place. Group headers show it in capitals (the header style does that), sentences show it as written here.
 * 2026-10-26 (owner request) — the extension's own name dropped "Wallet" ("Merit Wallet (Extension)" -> "Merit (Extension)"), matching serverKeystore's existing "Merit (Web App)" shape — both now read "Merit (<where>)" the same way.
 */
export declare function walletName(id: string, platform?: WalletPlatform): string;
/** The name of this authenticator: the one it supplies, else the fallback table. The component asks this and never switches on the id. */
export declare const authenticatorName: (authenticator: Pick<Authenticator, "id" | "displayName" | "vault">) => string;
/** The short name of this authenticator: the one it supplies, else the fallback table. */
export declare const authenticatorBadgeOf: (authenticator: Pick<Authenticator, "id" | "badge">) => string;
/** Short names for the badge next to an account (Merit Wallet, Extension, MetaMask, Hardware). FALLBACK ONLY, see authenticatorBadgeOf. */
export declare function authenticatorBadge(id: string): string;
