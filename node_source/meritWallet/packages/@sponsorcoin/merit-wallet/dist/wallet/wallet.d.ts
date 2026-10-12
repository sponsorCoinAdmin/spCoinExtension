import { type AccountAuthenticatorRef, type Authenticator, type AuthenticatorAccount, type AuthenticatorId } from '../auth/authenticator';
import { type AuthenticatorRegistry } from '../auth/resolve';
import type { VaultCapability } from '../vault/vaultCapability';
/** Where each account's chosen backend is remembered (the web app: localStorage; the extension: chrome.storage; tests: a Map). Synchronous reads, as the saved choice is small. */
export interface ActiveAuthenticatorStore {
    get(address: string): AuthenticatorId | undefined;
    set(address: string, id: AuthenticatorId | undefined): void;
}
export declare function createMemoryActiveAuthenticatorStore(initial?: Record<string, AuthenticatorId>): ActiveAuthenticatorStore;
/** The screens and actions a backend may or may not support. */
export type WalletFeature = 'createWallet' | 'importPhrase' | 'importKey' | 'addAccount' | 'backup' | 'changeCredential' | 'deleteWallet' | 'revealKey' | 'revealPhrase' | 'biometric' | 'signTypedData' | 'lock';
export declare const WALLET_FEATURES: readonly WalletFeature[];
export type WalletFeatures = Record<WalletFeature, boolean>;
/** What one backend supports, from its own capability flags (the vault flags when it keeps keys, the signing flags always). */
export declare function featuresOf(authenticator: Authenticator): WalletFeatures;
export interface WalletBackendInfo {
    id: AuthenticatorId;
    label: string;
    /** The short name for the badge next to an account. */
    badge: string;
    /** The wallet's one name, the same everywhere (walletName: "Merit Wallet (Extension)", "MetaMask"). */
    name: string;
    /** True when this backend keeps the keys itself (it has the vault capability). */
    keepsKeys: boolean;
    /** The words the panels use for where its keys live ('this device', 'this browser', 'the dev server'); empty for a signing-only backend. */
    where: string;
    features: WalletFeatures;
}
export interface WalletAccountEntry extends AuthenticatorAccount {
    /** The backend that signs for this account: the saved choice, else the backend the account was listed by, else the app default. */
    authenticatorId: AuthenticatorId;
    badge: string;
    /** Every backend that lists this address (more than one when an account is held twice). */
    backends: AuthenticatorId[];
}
export interface Wallet {
    readonly registry: AuthenticatorRegistry;
    register(authenticator: Authenticator): () => void;
    unregister(id: string): void;
    backends(): WalletBackendInfo[];
    backend(id: string): WalletBackendInfo | undefined;
    /** The id of the backend that signs for `address` (its saved choice, else the app default), or undefined. Does not check that the backend is reachable; the chain plays no part. */
    backendIdFor(address: string): AuthenticatorId | undefined;
    /** The backend that signs for an account (throws a specific AuthenticatorError; never asks another backend). */
    authenticatorFor(account: {
        address: string;
        sourceAuthenticator?: AuthenticatorId;
    }): Promise<Authenticator>;
    /** Save (or clear, with undefined) the account's active backend. */
    setActiveAuthenticator(address: string, id: AuthenticatorId | undefined): void;
    getActiveAuthenticator(address: string): AuthenticatorId | undefined;
    /** Every backend's accounts, each address once. A backend that fails to list is skipped, never fatal. */
    accounts(): Promise<WalletAccountEntry[]>;
    /** Whether the backend for `address` supports the feature; without an address, whether ANY backend does. */
    can(feature: WalletFeature, address?: string): boolean;
    /** The vault of the backend for `address`, or undefined (a signing-only backend, or nothing registered). */
    vaultFor(address: string): VaultCapability | undefined;
    /** The first key-keeping backend that already has a wallet: what the lock screen and the Config tab drive. */
    primaryVault(): Promise<{
        authenticator: Authenticator;
        vault: VaultCapability;
    } | undefined>;
    /** Registry changes, saved-choice changes and every backend's own lock / unlock / accountsChanged announcements. Returns the unsubscribe function. */
    onChange(listener: () => void): () => void;
}
export interface CreateWalletOptions {
    /** Rule 3 of the resolver: the app's default backend for an account that has neither a saved choice nor a source. */
    appDefault: (account: AccountAuthenticatorRef) => AuthenticatorId | undefined;
    store?: ActiveAuthenticatorStore;
    registry?: AuthenticatorRegistry;
}
export declare function createWallet(options: CreateWalletOptions): Wallet;
