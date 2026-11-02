// File: src/keystore/index.ts
//
// 2026-11-02 (owner request: bundle the like methods and components): everything a host injects to keep a wallet's keys and show its accounts, in one place. A host (the web app, the extension, a phone app) supplies these three and nothing else about keystores:
//   1. the VAULT (VaultCapability, src/vault): the secrets: create, unlock, sign, reveal. Never asked for the public account list.
//   2a. the SECRET CACHE (SecretCache, secretCache.ts): the opposite rule to 2: memory only, idle expiry, wiped on lock, never persisted.
//   2. the PUBLIC ACCOUNT STORE (PublicAccountStore, publicAccountStore.ts): its own small storage for the last-known public list (web: localStorage; extension: chrome.storage.local; phone: native storage).
//   3. the AUTHENTICATOR built on them, wrapped with withPublicAccountCache so its list shows from the saved copy at once and refreshes behind it.
// The vault code stays in src/vault; it is re-exported here so a host imports the whole kit from one place.
export { createMemoryPublicAccountStore, withPublicAccountCache } from './publicAccountStore';
export { createSecretCache } from './secretCache';
