// File: src/keptAccountsStorage.ts
//
// 2026-11-06 (owner design): the accounts of MetaMask are KEPT and PERSISTED whether it is connected or not (node_source merit-wallet src/auth/keptAccounts.ts). The extension keeps them in chrome.storage.local, one record per wallet.
import type { KeptAccountsState, KeptAccountsStore } from '@sponsorcoin/merit-wallet';

const key = (walletId: string) => `meritKeptAccounts:${walletId}`;
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((a): a is string => typeof a === 'string') : []);

export function extensionKeptAccountsStore(walletId: string): KeptAccountsStore {
  return {
    async read(): Promise<KeptAccountsState> {
      const stored = (await chrome.storage.local.get(key(walletId)))[key(walletId)] as { known?: unknown; off?: unknown; removed?: unknown } | undefined;
      return { known: strings(stored?.known), off: strings(stored?.off), removed: strings(stored?.removed) };
    },
    async write(state) {
      await chrome.storage.local.set({ [key(walletId)]: state });
    },
  };
}
