// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/vault/vaultCrypto.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, E1) -- the wallet vault's encryption, written the MetaMask way: the password is stretched with
// PBKDF2-HMAC-SHA256 (600,000 iterations, MetaMask's current setting) into an AES-256-GCM key, and the whole vault contents are one authenticated
// ciphertext. WebCrypto only, so it runs unchanged in a browser page, an extension service worker, and Node. No ethers (the extension's lint
// forbids it) and no scrypt (too slow in a worker; the server-side keystore-v3 format is a different, older store).
//
// Format (EncryptedVault, version 1):
//   { version: 1, algorithm: 'pbkdf2-sha256/aes-256-gcm', iterations, salt, iv, data }   (salt, iv, data are base64)
// A wrong password and a tampered blob both fail GCM authentication; the two cannot be told apart and both surface as WrongPasswordError.
//
// The derived key can be kept in memory for the length of an unlocked session (MetaMask does the same) so the vault can be re-encrypted after a
// change without asking for the password again: deriveVaultKey returns it as a non-extractable CryptoKey.

export const VAULT_VERSION = 1;
export const VAULT_ALGORITHM = 'pbkdf2-sha256/aes-256-gcm';
/** MetaMask's current PBKDF2 iteration count for its vault. */
export const DEFAULT_PBKDF2_ITERATIONS = 600_000;

export interface EncryptedVault {
  version: number;
  algorithm: string;
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Incorrect password.');
    this.name = 'WrongPasswordError';
  }
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function subtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) throw new Error('WebCrypto (crypto.subtle) is not available in this environment.');
  return c.subtle;
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  (globalThis as { crypto: Crypto }).crypto.getRandomValues(out);
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Stretch the password into the vault's AES-256-GCM key (non-extractable). */
export async function deriveVaultKey(
  password: string,
  salt: Uint8Array,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS,
  extractable = false,
): Promise<CryptoKey> {
  const base = await subtle().importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt `data` (any JSON value) with an already derived key. */
export async function encryptWithKey(data: unknown, key: CryptoKey, salt: Uint8Array, iterations: number): Promise<EncryptedVault> {
  const iv = randomBytes(12);
  const cipher = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, enc.encode(JSON.stringify(data))));
  return { version: VAULT_VERSION, algorithm: VAULT_ALGORITHM, iterations, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(cipher) };
}

/** Decrypt a vault with an already derived key. Throws WrongPasswordError when authentication fails. */
export async function decryptWithKey<T = unknown>(vault: EncryptedVault, key: CryptoKey): Promise<T> {
  assertSupported(vault);
  try {
    const plain = await subtle().decrypt({ name: 'AES-GCM', iv: fromBase64(vault.iv) as BufferSource }, key, fromBase64(vault.data) as BufferSource);
    return JSON.parse(dec.decode(plain)) as T;
  } catch {
    throw new WrongPasswordError();
  }
}

function assertSupported(vault: EncryptedVault): void {
  if (!vault || typeof vault !== 'object') throw new Error('Vault is missing or malformed.');
  // Refuse a vault newer than this build understands rather than misreading it.
  if (vault.version !== VAULT_VERSION) throw new Error(`Unsupported vault version ${String(vault.version)} (this build reads version ${VAULT_VERSION}).`);
  if (vault.algorithm !== VAULT_ALGORITHM) throw new Error(`Unsupported vault algorithm ${String(vault.algorithm)}.`);
}

/** Create a new encrypted vault: fresh salt and iv, key derived from the password. Returns the vault and the key (to keep for the session). */
export async function createEncryptedVault(
  data: unknown,
  password: string,
  iterations: number = DEFAULT_PBKDF2_ITERATIONS,
  extractableKey = false,
): Promise<{ vault: EncryptedVault; key: CryptoKey; salt: Uint8Array }> {
  if (!password) throw new Error('A non-empty password is required.');
  const salt = randomBytes(16);
  const key = await deriveVaultKey(password, salt, iterations, extractableKey);
  return { vault: await encryptWithKey(data, key, salt, iterations), key, salt };
}

/** Unlock: derive the key from the password and the vault's own salt, decrypt. Returns the data and the key. */
export async function unlockEncryptedVault<T = unknown>(
  vault: EncryptedVault,
  password: string,
  extractableKey = false,
): Promise<{ data: T; key: CryptoKey; salt: Uint8Array }> {
  assertSupported(vault);
  const salt = fromBase64(vault.salt);
  const key = await deriveVaultKey(password, salt, vault.iterations, extractableKey);
  return { data: await decryptWithKey<T>(vault, key), key, salt };
}
