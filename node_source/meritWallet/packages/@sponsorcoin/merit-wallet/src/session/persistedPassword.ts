// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/session/persistedPassword.ts
//
// docs/meritMigration.txt row 21. The "Persisted" password mode, written once for every host: the wallet password is kept ENCRYPTED so an unlocked session survives a reload (or a browser restart) until the idle time limit ends, the way
// MetaMask keeps its session until the auto-lock timer expires. This was the web app's components/wallet/lib/meritConnect/persistedPasswordStorage.ts; the extension had nothing, so the Persisted option in its Config tab did nothing.
// The rules are here (AES-GCM with a non-extractable key, a fresh 12-byte iv for every write, the time limit clamped to one minute .. 24 hours, a blob that does not decrypt is deleted, every failure is swallowed so a broken store only means
// "not persisted"). WHERE the key and the blob live is the host's: the web keeps the key in IndexedDB and the blob in localStorage; the extension can supply chrome.storage.session.
import { clampPersistedPasswordTimeoutHours } from '../walletConfig';

export interface PersistedPasswordBlob {
  ivB64: string;
  ciphertextB64: string;
}

/** What a host supplies. The blob store must forget the blob after `ttlMs` (the web's localStorage cache does; a host without expiry can store the expiry itself and answer null once it has passed). */
export interface PersistedPasswordBackend {
  /** The AES-GCM key for this wallet, created (non-extractable, encrypt and decrypt) the first time. */
  getOrCreateKey(): Promise<CryptoKey>;
  readBlob(): PersistedPasswordBlob | null | Promise<PersistedPasswordBlob | null>;
  writeBlob(blob: PersistedPasswordBlob, ttlMs: number): void | Promise<void>;
  deleteBlob(): void | Promise<void>;
}

export interface PersistedPasswordStore {
  /** Encrypt and keep the password for `timeoutHours` (clamped). Never throws. */
  persist(password: string, timeoutHours: number): Promise<void>;
  /** Push the expiry of what is kept back out to a full time limit from now (the wallet was used). A no-op when nothing is kept. Never throws. */
  touch(timeoutHours: number): Promise<void>;
  /** The kept password, or null when nothing is kept, it expired, or it can no longer be decrypted (then it is deleted). */
  restore(): Promise<string | null>;
  /** Forget it now. */
  clear(): Promise<void>;
}

function bufToB64(buf: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(buf)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

const HOUR_MS = 3_600_000;

export function createPersistedPasswordStore(backend: PersistedPasswordBackend, cryptoImpl: Crypto = globalThis.crypto): PersistedPasswordStore {
  return {
    async persist(password, timeoutHours) {
      try {
        const key = await backend.getOrCreateKey();
        const iv = cryptoImpl.getRandomValues(new Uint8Array(12));
        const ciphertext = await cryptoImpl.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(password));
        await backend.writeBlob({ ivB64: bufToB64(iv.buffer as ArrayBuffer), ciphertextB64: bufToB64(ciphertext) }, clampPersistedPasswordTimeoutHours(timeoutHours) * HOUR_MS);
      } catch {
        // storage or crypto unavailable: simply not persisted
      }
    },
    async touch(timeoutHours) {
      try {
        const existing = await backend.readBlob();
        if (!existing) return;
        await backend.writeBlob(existing, clampPersistedPasswordTimeoutHours(timeoutHours) * HOUR_MS);
      } catch {
        // nothing to extend
      }
    },
    async restore() {
      const blob = await backend.readBlob();
      if (!blob) return null;
      try {
        const key = await backend.getOrCreateKey();
        const plaintext = await cryptoImpl.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(blob.ivB64)) }, key, b64ToBuf(blob.ciphertextB64));
        return new TextDecoder().decode(plaintext);
      } catch {
        // the key is gone or the blob is damaged: it can never decrypt, so drop it
        await backend.deleteBlob();
        return null;
      }
    },
    async clear() {
      await backend.deleteBlob();
    },
  };
}
