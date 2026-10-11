import { VaultSession, type VaultSessionOptions } from './vaultSession';
import { WalletAccounts, type WalletVaultContents } from './walletAccounts';
export type VaultCredentialKind = 'password' | 'pin' | 'biometric';
export interface VaultCredential {
    kind: VaultCredentialKind;
    value: string;
}
export type VaultErrorCode = 'wrong_credential' | 'locked_out' | 'locked' | 'not_set_up' | 'already_set_up' | 'weak_credential' | 'same_credential' | 'invalid_phrase' | 'invalid_key' | 'invalid_backup' | 'unknown_account' | 'unsupported';
/** The one error set every vault reports in. `retryAfterMs` is set for 'locked_out'. */
export declare class VaultError extends Error {
    readonly code: VaultErrorCode;
    readonly retryAfterMs?: number;
    constructor(code: VaultErrorCode, message: string, retryAfterMs?: number);
}
export interface VaultCapabilities {
    create: boolean;
    importPhrase: boolean;
    importKey: boolean;
    backup: boolean;
    changeCredential: boolean;
    delete: boolean;
    revealKey: boolean;
    revealPhrase: boolean;
    biometric: boolean;
}
export interface VaultAccount {
    address: string;
    name: string;
    source: 'generated' | 'imported';
    /** One of Hardhat's published dev keys: may sign only on the local test chain. */
    devOrigin: boolean;
}
export interface VaultCapability {
    /** The words the panels use for "where the keys are kept": 'this device', 'this browser', 'the dev server'. */
    readonly label: string;
    readonly capabilities: VaultCapabilities;
    hasWallet(): Promise<boolean>;
    isUnlocked(): boolean;
    /** Set a new wallet up under the credential. The recovery phrase is returned ONCE, for the "write this down" screen. */
    create(credential: VaultCredential): Promise<{
        recoveryPhrase: string;
        accounts: VaultAccount[];
    }>;
    /** Set a wallet up from an existing recovery phrase (the same derivation as every other vault, so the same phrase gives the same accounts). */
    importPhrase(phrase: string, credential: VaultCredential): Promise<VaultAccount[]>;
    importKey(privateKey: string, name?: string): Promise<VaultAccount>;
    unlock(credential: VaultCredential): Promise<void>;
    lock(): void;
    accounts(): VaultAccount[];
    changeCredential(current: VaultCredential, next: VaultCredential): Promise<void>;
    /** Re-checks the credential, then removes the wallet from this store. Irreversible. */
    deleteWallet(credential: VaultCredential): Promise<void>;
    /** The encrypted vault as a JSON string for a backup file (re-checks the credential; the file is useless without it). */
    exportBackup(credential: VaultCredential): Promise<string>;
    /** Restore a backup into an empty store. */
    importBackup(file: string, credential: VaultCredential): Promise<VaultAccount[]>;
    revealPrivateKey(credential: VaultCredential, address: string): Promise<string>;
    revealRecoveryPhrase(credential: VaultCredential): Promise<string>;
    /** Lock / unlock announcements; returns the unsubscribe function. */
    onChange(listener: () => void): () => void;
}
export declare const MIN_PASSWORD_LENGTH = 8;
export declare const MIN_PIN_LENGTH = 4;
export declare const BACKUP_FORMAT = "merit-vault-backup";
export interface LocalVaultOptions extends VaultSessionOptions {
    label?: string;
}
/** The pieces behind a local vault, for a host that also needs to SIGN with it (the session and the accounts stay inside that host; a UI page only ever gets the capability). */
export interface LocalVaultParts {
    vault: VaultCapability;
    session: VaultSession<WalletVaultContents>;
    accounts: WalletAccounts;
}
/** The whole vault capability over a VaultStorage (ciphertext only): the extension passes chrome.storage, a browser IndexedDB, a test a Map. */
export declare function createLocalVault(options: LocalVaultOptions): VaultCapability;
/** Like createLocalVault, but also returns the session and the accounts (for createVaultAuthenticator). */
export declare function createLocalVaultParts(options: LocalVaultOptions): LocalVaultParts;
