/** `core` is a browser wallet's core (@meritWallets/meritWeb's createBrowserWallet): only its vault parts and its account announcer are used. */
export function createBrowserTestAccounts(core) {
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
