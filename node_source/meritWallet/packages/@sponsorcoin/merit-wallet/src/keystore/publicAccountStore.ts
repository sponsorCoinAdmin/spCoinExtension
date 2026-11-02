// File: src/keystore/publicAccountStore.ts
//
// 2026-11-02 (owner design, after the Merit (Web App) group took minutes to fill while MetaMask's was instant): addresses are public, so the wallet keeps the last-known list of them in the host's own small storage and shows it at once, then
// refreshes from the backend in the background (the way MetaMask answers eth_accounts from its own saved state and opens its vault only for secrets). The STORAGE is injected, so one behaviour serves every app: the web app gives localStorage,
// the extension chrome.storage.local, a phone app its native storage. A store holds public account data only: never a key, a password or a phrase.
import type { Authenticator, AuthenticatorAccount } from '../auth/authenticator';

export interface PublicAccountStore {
  /** The saved list for this key (an authenticator id), or undefined when nothing is saved or the storage cannot be read. */
  read(key: string): Promise<AuthenticatorAccount[] | undefined>;
  /** Save the list for this key. A storage that cannot write may simply do nothing: the cache is an accelerator, never the source of truth. */
  write(key: string, accounts: AuthenticatorAccount[]): Promise<void>;
}

/** The default when a host injects nothing: kept in memory for the life of the page, so behaviour is unchanged and tests need no setup. */
export function createMemoryPublicAccountStore(): PublicAccountStore {
  const saved = new Map<string, AuthenticatorAccount[]>();
  return {
    read: async (key) => saved.get(key),
    write: async (key, accounts) => {
      saved.set(key, accounts);
    },
  };
}

const sameAccounts = (a: AuthenticatorAccount[] | undefined, b: AuthenticatorAccount[]): boolean =>
  !!a && a.length === b.length && a.every((x, i) => x.address === b[i].address && x.name === b[i].name && x.source === b[i].source);

/**
 * Wrap an authenticator so its account list shows from the saved copy first. accounts() sends the saved list through `onPartial` before asking the backend, asks the backend as before (its own partials still pass through), and saves the answer,
 * writing only when it differs. The backend's answer always wins: an account it no longer lists disappears, an empty answer empties the list. A backend that FAILS to answer leaves the saved copy alone. Everything but accounts() is the authenticator unchanged.
 */
export function withPublicAccountCache(authenticator: Authenticator, store: PublicAccountStore, key: string = authenticator.id): Authenticator {
  return {
    ...authenticator,
    async accounts(onPartial) {
      const saved = await store.read(key).catch(() => undefined);
      if (saved && saved.length > 0) onPartial?.(saved);
      const fresh = await authenticator.accounts(onPartial);
      if (!sameAccounts(saved, fresh)) void store.write(key, fresh).catch(() => undefined);
      return fresh;
    },
  };
}
