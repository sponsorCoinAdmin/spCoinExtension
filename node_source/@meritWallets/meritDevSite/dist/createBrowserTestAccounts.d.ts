import type { LocalVaultParts } from '@sponsorcoin/merit-wallet';
import type { TestAccountsApi } from './TestAccountsSection';
/** `core` is a browser wallet's core (@meritWallets/meritWeb's createBrowserWallet): only its vault parts and its account announcer are used. */
export declare function createBrowserTestAccounts(core: {
    parts: LocalVaultParts;
    announceAccountsChanged(): void;
}): TestAccountsApi;
