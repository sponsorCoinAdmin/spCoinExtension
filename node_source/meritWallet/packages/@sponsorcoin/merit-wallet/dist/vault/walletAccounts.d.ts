import { type HDAccount, type PrivateKeyAccount } from 'viem/accounts';
import { VaultSession } from './vaultSession';
export type WalletAccountSource = 'generated' | 'imported';
export interface HdKeyring {
    mnemonic: string;
    /** How many accounts are derived so far (indexes 0 .. count-1). */
    count: number;
    devOrigin?: boolean;
}
export interface ImportedKey {
    privateKey: `0x${string}`;
    address: `0x${string}`;
    devOrigin?: boolean;
}
export interface WalletVaultContents {
    version: 1;
    hd?: HdKeyring;
    imported: ImportedKey[];
    /** Display names, by lower-case address. */
    names: Record<string, string>;
    /** Lower-case address of the active account, if one was chosen. */
    active?: string;
}
export interface WalletAccountRecord {
    address: `0x${string}`;
    name: string;
    source: WalletAccountSource;
    devOrigin: boolean;
    /** Derivation index for a generated account. */
    index?: number;
}
export declare class WalletAccountError extends Error {
    constructor(message: string);
}
export declare const HARDHAT_DEV_MNEMONIC = "test test test test test test test test test test test junk";
export declare function emptyWalletContents(): WalletVaultContents;
/** Normalise: trim, lower-case, single spaces. */
export declare function normalizeMnemonic(mnemonic: string): string;
/** BIP39 check: 12, 15, 18, 21 or 24 English words, each in the list, with a valid checksum. */
export declare function isValidMnemonic(mnemonic: string): Promise<boolean>;
/** Is this one of Hardhat's 20 published dev addresses (their keys are public, so they must never sign on a real chain)? */
export declare function isHardhatDevAddress(address: string): boolean;
/**
 * Set the wallet up: a new Secret Recovery Phrase (or the one given, to import a wallet), the first account derived, the vault created under
 * `password` and left unlocked. Returns the phrase so the UI can show it ONCE for backup: it is not returned by anything else; reveal it
 * later only through WalletAccounts.revealMnemonic (which asks for the password again).
 */
export declare function createWallet(session: VaultSession<WalletVaultContents>, password: string, options?: {
    mnemonic?: string;
}): Promise<{
    address: `0x${string}`;
    mnemonic: string;
}>;
export declare class WalletAccounts {
    private readonly session;
    constructor(session: VaultSession<WalletVaultContents>);
    private contents;
    list(): WalletAccountRecord[];
    activeAddress(): `0x${string}` | undefined;
    setActive(address: string): Promise<void>;
    /** Derive the next account from the Secret Recovery Phrase. */
    addDerived(name?: string): Promise<WalletAccountRecord>;
    /** Import an account by private key. A key whose address is already in the wallet is refused. */
    importPrivateKey(privateKey: string, name?: string): Promise<WalletAccountRecord>;
    /** Remove an imported account. Derived accounts cannot be removed (they come back from the Secret Recovery Phrase), as in MetaMask. */
    remove(address: string): Promise<void>;
    rename(address: string, name: string): Promise<void>;
    /** The Secret Recovery Phrase, only after the password is checked again (MetaMask asks for it every time). */
    revealMnemonic(password: string): Promise<string>;
    /** How many of Hardhat's standard test accounts are in this wallet, however they got here. */
    hardhatTestAccountStatus(): {
        loaded: number;
        total: number;
    };
    /**
     * Add the standard Hardhat test accounts that are missing, as IMPORTED accounts (they never become part of the wallet's own phrase),
     * marked devOrigin so they can sign only on the local chain. Names are "Hardhat 0" to "Hardhat 19". One vault update for all of them.
     */
    loadHardhatTestAccounts(): Promise<{
        added: number;
        alreadyPresent: number;
        total: number;
    }>;
    /**
     * Remove the standard Hardhat test accounts that were imported. A test account that is part of the wallet's OWN phrase (the wallet was made from
     * Hardhat's phrase) cannot be removed, and is reported in `kept`. If the active account goes, the active choice resets.
     */
    unloadHardhatTestAccounts(): Promise<{
        removed: number;
        kept: number;
    }>;
    /** The private key of one account, only after the password is checked again (MetaMask: Account details -> Show private key). */
    revealPrivateKey(password: string, address: string): Promise<`0x${string}`>;
    /**
     * The viem account that can sign for `address`. For use INSIDE the host that owns the vault (the signing step); the result holds a key and
     * must never be returned to a UI page or logged.
     */
    getSigningAccount(address: string): {
        account: HDAccount | PrivateKeyAccount;
        devOrigin: boolean;
    };
}
