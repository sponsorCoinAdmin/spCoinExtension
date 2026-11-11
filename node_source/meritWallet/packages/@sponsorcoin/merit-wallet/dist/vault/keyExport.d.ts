import { type EncryptedVault } from './vaultCrypto';
export declare const KEY_EXPORT_FORMAT = "merit-wallet-account-key";
export interface KeyExportFile {
    format: typeof KEY_EXPORT_FORMAT;
    version: 1;
    /** The account's address: public, so the person can tell the files apart without opening them. */
    address: string;
    vault: EncryptedVault;
}
/** Encrypt the account's private key with the password. Returns the file name and its text, ready to save. */
export declare function encryptKeyExport(privateKey: string, address: string, password: string): Promise<{
    name: string;
    content: string;
}>;
/** Open a key file with its password. Throws WrongPasswordError for a wrong password, and Error for something that is not a key file. */
export declare function decryptKeyExport(content: string, password: string): Promise<{
    address: string;
    privateKey: string;
}>;
