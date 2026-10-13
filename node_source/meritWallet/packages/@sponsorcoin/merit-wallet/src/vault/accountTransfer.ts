// File: src/vault/accountTransfer.ts
//
// 2026-10-12 (docs/design/accountAuthDesign.txt V11, owner request): an account's private key moves from the Merit extension to a web page's browser vault ONLY as an encrypted blob that the extension makes after the person approved it in the extension's own screen
// (with the wallet password typed again), and that only the asking page can open. The page makes a one-time P-256 key pair and sends its PUBLIC key; the extension makes its own one-time pair, derives a shared secret (ECDH), turns it into an AES-GCM key (HKDF-SHA256)
// and seals the key with the account's address as the authenticated data (so the blob cannot be replayed for another account). Nothing here stores anything: the one-time private keys live in memory for one request. WebCrypto only (the same in a page, the extension worker and Node).
const INFO = new TextEncoder().encode('merit-account-transfer-v1');
const PRIVATE_KEY = /^0x[0-9a-fA-F]{64}$/;

export interface TransferSeal {
  /** The extension's one-time public key (base64, raw P-256 point). */
  publicKey: string;
  iv: string;
  ciphertext: string;
}

const toB64 = (bytes: Uint8Array): string => {
  let s = '';
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
};
const fromB64 = (text: string): Uint8Array => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const subtle = (): SubtleCrypto => globalThis.crypto.subtle;
const buffer = (bytes: Uint8Array): ArrayBuffer => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
const aad = (address: string): ArrayBuffer => buffer(new TextEncoder().encode(address.toLowerCase()));

async function aesKey(ownPrivate: CryptoKey, otherPublicRaw: Uint8Array): Promise<CryptoKey> {
  const otherPublic = await subtle().importKey('raw', buffer(otherPublicRaw), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = await subtle().deriveBits({ name: 'ECDH', public: otherPublic }, ownPrivate, 256);
  const material = await subtle().importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: INFO }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** The asking page: a one-time key pair. `publicKey` goes to the extension; `open` turns the extension's blob back into the private key. */
export async function createTransferRequest(): Promise<{ publicKey: string; open(seal: TransferSeal, address: string): Promise<string> }> {
  const pair = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const publicKey = toB64(new Uint8Array(await subtle().exportKey('raw', pair.publicKey)));
  return {
    publicKey,
    async open(seal, address) {
      const key = await aesKey(pair.privateKey, fromB64(seal.publicKey));
      const plain = await subtle().decrypt({ name: 'AES-GCM', iv: buffer(fromB64(seal.iv)), additionalData: aad(address) }, key, buffer(fromB64(seal.ciphertext)));
      const privateKey = new TextDecoder().decode(plain);
      if (!PRIVATE_KEY.test(privateKey)) throw new Error('The transferred key is not valid.');
      return privateKey;
    },
  };
}

/** The extension: seal the account's private key for the page that asked. The address is bound in as authenticated data. */
export async function sealForTransfer(privateKey: string, address: string, requesterPublicKey: string): Promise<TransferSeal> {
  if (!PRIVATE_KEY.test(privateKey)) throw new Error('That is not a private key.');
  const own = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const key = await aesKey(own.privateKey, fromB64(requesterPublicKey));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cipher = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: aad(address) }, key, buffer(new TextEncoder().encode(privateKey)));
  return { publicKey: toB64(new Uint8Array(await subtle().exportKey('raw', own.publicKey))), iv: toB64(iv), ciphertext: toB64(new Uint8Array(cipher)) };
}

/** What the asking page needs from the wallet's provider: the EIP-1193 request. */
export interface TransferProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

/**
 * The asking page, start to finish: make a one-time key, ask the wallet for `address` (the person approves in the WALLET's own screen and types its password), open the sealed blob and hand back the private key.
 * The caller imports it into its own vault at once and keeps nothing; the wallet's answer is useless to anyone but this call. Throws the wallet's error (a refusal is code 4001).
 */
export async function requestAccountFromProvider(provider: TransferProvider, address: string): Promise<string> {
  const page = await createTransferRequest();
  const seal = (await provider.request({ method: 'merit_transferAccount', params: [{ address, publicKey: page.publicKey }] })) as TransferSeal;
  if (!seal || typeof seal.publicKey !== 'string' || typeof seal.iv !== 'string' || typeof seal.ciphertext !== 'string') throw new Error('The wallet did not answer with a sealed key.');
  return page.open(seal, address);
}
