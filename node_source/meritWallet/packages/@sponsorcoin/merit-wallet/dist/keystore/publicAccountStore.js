/** The default when a host injects nothing: kept in memory for the life of the page, so behaviour is unchanged and tests need no setup. */
export function createMemoryPublicAccountStore() {
    const saved = new Map();
    return {
        read: async (key) => saved.get(key),
        write: async (key, accounts) => {
            saved.set(key, accounts);
        },
    };
}
const sameAccounts = (a, b) => !!a && a.length === b.length && a.every((x, i) => x.address === b[i].address && x.name === b[i].name && x.source === b[i].source);
/**
 * Wrap an authenticator so its account list shows from the saved copy first. accounts() sends the saved list through `onPartial` before asking the backend, asks the backend as before (its own partials still pass through), and saves the answer,
 * writing only when it differs. The backend's answer always wins: an account it no longer lists disappears, an empty answer empties the list. A backend that FAILS to answer leaves the saved copy alone. Everything but accounts() is the authenticator unchanged.
 */
export function withPublicAccountCache(authenticator, store, key = authenticator.id) {
    return {
        ...authenticator,
        async accounts(onPartial) {
            const saved = await store.read(key).catch(() => undefined);
            if (saved && saved.length > 0)
                onPartial?.(saved);
            const fresh = await authenticator.accounts(onPartial);
            if (!sameAccounts(saved, fresh))
                void store.write(key, fresh).catch(() => undefined);
            return fresh;
        },
    };
}
