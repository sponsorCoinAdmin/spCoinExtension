// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/vault/keyExport.ts
//
// 2026-11-10 (docs/design/removeAccountPlan.txt row 13, owner go): the private key of an account as an ENCRYPTED file the person keeps before removing the account. The file is the wallet's own vault format (PBKDF2-SHA256 /
// AES-256-GCM, vaultCrypto.ts) and its key is the wallet password the person typed, so the file alone is useless, and the key is never written out as plain text (never in a mail or a clipboard).
import { createEncryptedVault, unlockEncryptedVault, type EncryptedVault } from './vaultCrypto';

export const KEY_EXPORT_FORMAT = 'merit-wallet-account-key';

export interface KeyExportFile {
  format: typeof KEY_EXPORT_FORMAT;
  version: 1;
  /** The account's address: public, so the person can tell the files apart without opening them. */
  address: string;
  vault: EncryptedVault;
}

/** Encrypt the account's private key with the password. Returns the file name and its text, ready to save. */
export async function encryptKeyExport(privateKey: string, address: string, password: string): Promise<{ name: string; content: string }> {
  if (!password) throw new Error('A password is required to protect the key file.');
  const { vault } = await createEncryptedVault({ address, privateKey }, password);
  const file: KeyExportFile = { format: KEY_EXPORT_FORMAT, version: 1, address, vault };
  return { name: `merit-account-${address.slice(0, 8)}-key.json`, content: JSON.stringify(file, null, 2) };
}

/** Open a key file with its password. Throws WrongPasswordError for a wrong password, and Error for something that is not a key file. */
export async function decryptKeyExport(content: string, password: string): Promise<{ address: string; privateKey: string }> {
  let file: Partial<KeyExportFile>;
  try {
    file = JSON.parse(content) as Partial<KeyExportFile>;
  } catch {
    throw new Error('This is not a Merit account key file.');
  }
  if (file.format !== KEY_EXPORT_FORMAT || !file.vault) throw new Error('This is not a Merit account key file.');
  const { data } = await unlockEncryptedVault<{ address: string; privateKey: string }>(file.vault, password);
  return data;
}
