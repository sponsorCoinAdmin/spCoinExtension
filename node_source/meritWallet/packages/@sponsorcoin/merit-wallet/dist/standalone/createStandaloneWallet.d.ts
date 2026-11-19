import type { Authenticator } from '../auth/authenticator';
import { ApprovalController } from '../vault/approvals';
import { type LocalVaultParts, type VaultCapability } from '../vault/vaultCapability';
import type { VaultSessionStore, VaultStorage } from '../vault/vaultSession';
import { type Wallet } from '../wallet/wallet';
import type { TestAccountsApi } from '../TestAccountsSection';
export interface StandaloneChain {
    chainId: number;
    /** The JSON-RPC endpoint this chain is read and written through. */
    rpcUrl: string;
    name?: string;
}
export interface StandaloneWalletOptions {
    /** The chains the wallet works on. Required: the wallet never guesses an endpoint. */
    chains: readonly StandaloneChain[];
    /** Names this install's browser storage ('<namespace>-vault' in IndexedDB, '<namespace>-session' in sessionStorage), so two wallets on one origin never share keys. Default: the package's shared names. */
    namespace?: string;
    /** Where the ENCRYPTED vault lives. Default: IndexedDB database 'merit-wallet-vault' (a test passes a Map-backed store). */
    storage?: VaultStorage;
    /** Where the unlocked session key lives between page loads. Default: sessionStorage (gone when the tab closes). */
    sessionStore?: VaultSessionStore;
    /** Lock after this long without activity. Default 15 minutes. */
    autoLockMs?: number;
}
export declare const STANDALONE_AUTO_LOCK_MS: number;
export interface StandaloneOnboarding {
    /** Create a new wallet under `password`; resolves with the Secret Recovery Phrase to show ONCE. */
    createWallet(password: string): Promise<{
        recoveryPhrase: string;
    }>;
    importWallet(recoveryPhrase: string, password: string): Promise<void>;
    restoreBackup(file: string, password: string): Promise<void>;
}
export interface StandaloneWallet {
    chains: readonly StandaloneChain[];
    vault: VaultCapability;
    parts: LocalVaultParts;
    authenticator: Authenticator;
    wallet: Wallet;
    /** Every request that wants a signature waits here until a screen approves or rejects it. */
    approvals: ApprovalController;
    onboarding: StandaloneOnboarding;
    /** The Config tab's Test Accounts section over this vault: loads Hardhat's 20 published test accounts (imported, devOrigin: they sign only on chain 31337) and removes them again. For development: their keys are public. */
    testAccounts: TestAccountsApi;
    /** Come back unlocked after a page reload when the session key is still valid. Safe to call often. */
    restore(): Promise<boolean>;
}
export declare function createStandaloneWallet(options: StandaloneWalletOptions): StandaloneWallet;
