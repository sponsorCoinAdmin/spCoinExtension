import { type Authenticator, type LocalVaultParts, type VaultCapability, type Wallet } from '@sponsorcoin/merit-wallet';
import { ApprovalController, type VaultSessionStore, type VaultStorage } from '@sponsorcoin/merit-wallet/vault';
export interface BrowserChain {
    chainId: number;
    /** The JSON-RPC endpoint this chain is read and written through. */
    rpcUrl: string;
    name?: string;
}
export interface BrowserWalletOptions {
    /** The chains the wallet works on. Required: the wallet never guesses an endpoint. */
    chains: readonly BrowserChain[];
    /** Names this install's browser storage ('<namespace>-vault' in IndexedDB, '<namespace>-session' in sessionStorage), so two wallets on one origin never share keys. Default: the package's shared names. */
    namespace?: string;
    /** Where the ENCRYPTED vault lives. Default: IndexedDB database 'merit-wallet-vault' (a test passes a Map-backed store). */
    storage?: VaultStorage;
    /** Where the unlocked session key lives between page loads. Default: sessionStorage (gone when the tab closes). */
    sessionStore?: VaultSessionStore;
    /** Lock after this long without activity. Default 15 minutes. */
    autoLockMs?: number;
}
export declare const BROWSER_AUTO_LOCK_MS: number;
export interface BrowserOnboarding {
    /** Create a new wallet under `password`; resolves with the Secret Recovery Phrase to show ONCE. */
    createWallet(password: string): Promise<{
        recoveryPhrase: string;
    }>;
    importWallet(recoveryPhrase: string, password: string): Promise<void>;
    restoreBackup(file: string, password: string): Promise<void>;
}
export interface BrowserWallet {
    chains: readonly BrowserChain[];
    vault: VaultCapability;
    parts: LocalVaultParts;
    authenticator: Authenticator;
    wallet: Wallet;
    /** Every request that wants a signature waits here until a screen approves or rejects it. */
    approvals: ApprovalController;
    onboarding: BrowserOnboarding;
    /** Tell the wallet its account list changed (an account was added or removed by something other than the vault's own methods, which announce themselves). */
    announceAccountsChanged(): void;
    /** Come back unlocked after a page reload when the session key is still valid. Safe to call often. */
    restore(): Promise<boolean>;
}
export declare function createBrowserWallet(options: BrowserWalletOptions): BrowserWallet;
