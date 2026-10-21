// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/session/persistedPassword.ts
//
// docs/meritMigration.txt row 21. The "Persisted" password mode, written once for every host: the wallet password is kept ENCRYPTED so an unlocked session survives a reload (or a browser restart) until the idle time limit ends, the way
// MetaMask keeps its session until the auto-lock timer expires. This was the web app's components/wallet/lib/meritConnect/persistedPasswordStorage.ts; the extension had nothing, so the Persisted option in its Config tab did nothing.
// The rules are here (AES-GCM with a non-extractable key, a fresh 12-byte iv for every write, the time limit clamped to one minute .. 24 hours, a blob that does not decrypt is deleted, every failure is swallowed so a broken store only means
// "not persisted"). WHERE the key and the blob live is the host's: the web keeps the key in IndexedDB and the blob in localStorage; the extension can supply chrome.storage.session.
import { clampPersistedPasswordTimeoutHours } from '../walletConfig';
function bufToB64(buf) {
    let binary = '';
    for (const byte of new Uint8Array(buf))
        binary += String.fromCharCode(byte);
    return btoa(binary);
}
function b64ToBuf(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++)
        bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}
const HOUR_MS = 3600000;
export function createPersistedPasswordStore(backend, cryptoImpl = globalThis.crypto) {
    return {
        async persist(password, timeoutHours) {
            try {
                const key = await backend.getOrCreateKey();
                const iv = cryptoImpl.getRandomValues(new Uint8Array(12));
                const ciphertext = await cryptoImpl.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(password));
                await backend.writeBlob({ ivB64: bufToB64(iv.buffer), ciphertextB64: bufToB64(ciphertext) }, clampPersistedPasswordTimeoutHours(timeoutHours) * HOUR_MS);
            }
            catch {
                // storage or crypto unavailable: simply not persisted
            }
        },
        async touch(timeoutHours) {
            try {
                const existing = await backend.readBlob();
                if (!existing)
                    return;
                await backend.writeBlob(existing, clampPersistedPasswordTimeoutHours(timeoutHours) * HOUR_MS);
            }
            catch {
                // nothing to extend
            }
        },
        async restore() {
            const blob = await backend.readBlob();
            if (!blob)
                return null;
            try {
                const key = await backend.getOrCreateKey();
                const plaintext = await cryptoImpl.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(blob.ivB64)) }, key, b64ToBuf(blob.ciphertextB64));
                return new TextDecoder().decode(plaintext);
            }
            catch {
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
