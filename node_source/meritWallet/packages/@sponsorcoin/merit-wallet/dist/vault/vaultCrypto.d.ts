export declare const VAULT_VERSION = 1;
export declare const VAULT_ALGORITHM = "pbkdf2-sha256/aes-256-gcm";
/** MetaMask's current PBKDF2 iteration count for its vault. */
export declare const DEFAULT_PBKDF2_ITERATIONS = 600000;
export interface EncryptedVault {
    version: number;
    algorithm: string;
    iterations: number;
    salt: string;
    iv: string;
    data: string;
}
export declare class WrongPasswordError extends Error {
    constructor();
}
export declare function toBase64(bytes: Uint8Array): string;
export declare function fromBase64(b64: string): Uint8Array;
/** Stretch the password into the vault's AES-256-GCM key (non-extractable). */
export declare function deriveVaultKey(password: string, salt: Uint8Array, iterations?: number, extractable?: boolean): Promise<CryptoKey>;
/** Encrypt `data` (any JSON value) with an already derived key. */
export declare function encryptWithKey(data: unknown, key: CryptoKey, salt: Uint8Array, iterations: number): Promise<EncryptedVault>;
/** Decrypt a vault with an already derived key. Throws WrongPasswordError when authentication fails. */
export declare function decryptWithKey<T = unknown>(vault: EncryptedVault, key: CryptoKey): Promise<T>;
/** Create a new encrypted vault: fresh salt and iv, key derived from the password. Returns the vault and the key (to keep for the session). */
export declare function createEncryptedVault(data: unknown, password: string, iterations?: number, extractableKey?: boolean): Promise<{
    vault: EncryptedVault;
    key: CryptoKey;
    salt: Uint8Array;
}>;
/** Unlock: derive the key from the password and the vault's own salt, decrypt. Returns the data and the key. */
export declare function unlockEncryptedVault<T = unknown>(vault: EncryptedVault, password: string, extractableKey?: boolean): Promise<{
    data: T;
    key: CryptoKey;
    salt: Uint8Array;
}>;
