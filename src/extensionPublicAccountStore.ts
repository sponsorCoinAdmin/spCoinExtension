// File: src/extensionPublicAccountStore.ts
//
// 2026-11-02: the extension's PublicAccountStore (merit-wallet src/auth/publicAccountStore.ts): the last-known PUBLIC account list (address, name, source) in chrome.storage.local, the extension's own storage, so the side panel shows the account list at once.
// The same shape as the web app's (lib/spCoin/webPublicAccountStore.ts); never a key or a password. A storage failure just means no saved copy.
import type { AuthenticatorAccount, PublicAccountStore } from '@sponsorcoin/merit-wallet';

const KEY_PREFIX = 'spCoin.publicAccounts.';

export const extensionPublicAccountStore: PublicAccountStore = {
  async read(key) {
    try {
      const saved = (await chrome.storage.local.get(KEY_PREFIX + key))[KEY_PREFIX + key] as unknown;
      return Array.isArray(saved) ? (saved as AuthenticatorAccount[]).filter((a) => a && typeof a.address === 'string') : undefined;
    } catch {
      return undefined;
    }
  },
  async write(key, accounts) {
    try {
      await chrome.storage.local.set({ [KEY_PREFIX + key]: accounts.map((a) => ({ address: a.address, name: a.name, source: a.source })) });
    } catch {
      /* no storage: the cache is only an accelerator */
    }
  },
};
