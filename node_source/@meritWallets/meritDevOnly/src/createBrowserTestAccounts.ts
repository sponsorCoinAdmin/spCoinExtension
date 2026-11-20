// File: src/createBrowserTestAccounts.ts
//
// The Test Accounts API over a browser wallet's vault (moved here from @meritWallets/meritBrowser's createBrowserWallet, 2026-11-19): loads Hardhat's 20 published test accounts (imported, devOrigin: they sign only on chain 31337) and removes them again.
// For development only: their keys are public. The vault methods it calls live in the shared wallet package; this is just the part that drives them.
import type { LocalVaultParts } from '@sponsorcoin/merit-wallet';
import type { TestAccountsApi } from './TestAccountsSection';

/** `core` is a browser wallet's core (@meritWallets/meritBrowser's createBrowserWallet): only its vault parts and its account announcer are used. */
export function createBrowserTestAccounts(core: { parts: LocalVaultParts; announceAccountsChanged(): void }): TestAccountsApi {
  return {
    needsPassword: false,
    async status() {
      return core.parts.accounts.hardhatTestAccountStatus();
    },
    async load() {
      const result = await core.parts.accounts.loadHardhatTestAccounts();
      core.announceAccountsChanged();
      return { added: result.added };
    },
    async unload() {
      const result = await core.parts.accounts.unloadHardhatTestAccounts();
      core.announceAccountsChanged();
      return result;
    },
  };
}
