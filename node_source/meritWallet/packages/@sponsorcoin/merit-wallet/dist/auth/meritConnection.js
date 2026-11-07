import { translateProviderError } from './injectedAuthenticator';
const asAccounts = (addresses, id) => addresses.map((address) => ({ address, source: id }));
export function withMeritConnection(base, options) {
    const { client } = options;
    const side = options.side;
    const overrides = {
        async accounts() {
            return asAccounts((await client.handshake(side)).shared, base.id);
        },
        async knownAccounts() {
            return (await client.listAccounts(side)).map((a) => ({ address: a.address, connected: a.connected }));
        },
        async setAccountConnected(address, connected) {
            await client.setAccountConnected(side, address, connected);
        },
        async selectAccounts() {
            try {
                return asAccounts(await client.requestAccounts(side), base.id);
            }
            catch (error) {
                throw translateProviderError(error, base.id, base.label);
            }
        },
        async disconnect() {
            await client.revoke(side);
        },
        onChange(listener) {
            // what the wallet itself reports (a chain change, its request on screen) still arrives; its account changes do not: the kept lists decide what the accounts are, and onListChange tells when they changed
            const offBase = base.onChange((change) => {
                if (change !== 'accountsChanged')
                    listener(change);
            });
            const offList = options.onListChange?.(() => listener('accountsChanged'));
            // the link to the other wallet came up (or went down): the lists are made one again
            const offLink = client.onConnectionChange(side, () => listener('accountsChanged'));
            return () => {
                offBase();
                offList?.();
                offLink();
            };
        },
    };
    if (options.onNotice)
        overrides.onNotice = options.onNotice;
    overrides.meritRemote = true;
    return {
        ...base,
        ...overrides,
        // connecting the wallet is choosing its accounts: the other wallet's selector
        async connect() {
            return overrides.selectAccounts();
        },
    };
}
