import type { Authenticator, AuthenticatorAccount } from '../auth/authenticator';
export interface PublicAccountStore {
    /** The saved list for this key (an authenticator id), or undefined when nothing is saved or the storage cannot be read. */
    read(key: string): Promise<AuthenticatorAccount[] | undefined>;
    /** Save the list for this key. A storage that cannot write may simply do nothing: the cache is an accelerator, never the source of truth. */
    write(key: string, accounts: AuthenticatorAccount[]): Promise<void>;
}
/** The default when a host injects nothing: kept in memory for the life of the page, so behaviour is unchanged and tests need no setup. */
export declare function createMemoryPublicAccountStore(): PublicAccountStore;
/**
 * Wrap an authenticator so its account list shows from the saved copy first. accounts() sends the saved list through `onPartial` before asking the backend, asks the backend as before (its own partials still pass through), and saves the answer,
 * writing only when it differs. The backend's answer always wins: an account it no longer lists disappears, an empty answer empties the list. A backend that FAILS to answer leaves the saved copy alone. Everything but accounts() is the authenticator unchanged.
 */
export declare function withPublicAccountCache(authenticator: Authenticator, store: PublicAccountStore, key?: string): Authenticator;
