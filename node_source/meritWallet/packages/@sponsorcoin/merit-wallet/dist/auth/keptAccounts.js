const has = (list, address) => list.some((a) => a.toLowerCase() === address.toLowerCase());
const union = (a, b) => [...a, ...b.filter((x) => !has(a, x))];
const without = (list, remove) => list.filter((a) => !has(remove, a));
export function withKeptAccounts(base, store) {
    const listeners = new Set();
    const notify = () => listeners.forEach((listener) => listener('accountsChanged'));
    const save = async (state) => {
        await store.write(state);
        notify();
    };
    const reported = async () => {
        try {
            return (await base.accounts()).map((a) => a.address);
        }
        catch {
            // the wallet cannot be asked now: nothing is reported, so nothing reads as connected; the kept list is untouched
            return [];
        }
    };
    /** The wallet just shared these (its picker): they are known and no longer switched off. */
    const adopt = async (shared) => {
        const state = await store.read();
        const addresses = shared.map((a) => a.address);
        await save({ known: union(state.known, addresses), off: without(state.off, addresses), removed: without(state.removed ?? [], addresses) });
    };
    const overrides = {
        // the USABLE accounts: what the wallet reports and has not been switched off. Every account seen is remembered.
        async accounts(onPartial) {
            const state = await store.read();
            const listed = await base.accounts(onPartial ? (partial) => onPartial(partial.filter((a) => !has(state.off, a.address))) : undefined);
            const gone = state.removed ?? [];
            const known = union(state.known, listed.map((a) => a.address).filter((a) => !has(gone, a)));
            if (known.length !== state.known.length)
                await store.write({ ...state, known });
            return listed.filter((a) => !has(state.off, a.address) && !has(gone, a.address));
        },
        // every known account with its state, connected or not
        async knownAccounts() {
            const state = await store.read();
            const live = await reported();
            const gone = state.removed ?? [];
            const known = without(union(state.known, live), gone);
            if (known.length !== state.known.length)
                await store.write({ ...state, known });
            return known.map((address) => ({ address, connected: has(live, address) && !has(state.off, address) }));
        },
        // the wallet-level Disconnect: the wallet is asked to drop its permission (best effort), and EVERY known account is switched off here. None is removed.
        async disconnect() {
            const state = await store.read();
            const live = await reported();
            try {
                await base.disconnect?.();
            }
            finally {
                const known = without(union(state.known, live), state.removed ?? []);
                await save({ ...state, known, off: known });
            }
        },
        // 2026-11-08 (owner, plan row 2): Remove forgets the account here: it leaves known and off and goes on the removed list. The wallet is not touched (MetaMask keeps sharing it); the account is not listed again until the person connects it or the wallet newly shares it.
        async removeAccount(address) {
            const state = await store.read();
            await save({ known: without(state.known, [address]), off: without(state.off, [address]), removed: union(state.removed ?? [], [address]) });
        },
        async setAccountConnected(address, connected) {
            const state = await store.read();
            if (!connected) {
                await save({ known: union(state.known, [address]), off: union(state.off, [address]) });
                return;
            }
            const live = await reported();
            if (has(live, address)) {
                await save({ ...state, off: without(state.off, [address]), removed: without(state.removed ?? [], [address]) });
                return;
            }
            // the wallet does not share it now (disconnected there, or removed there): only the wallet's own account picker can share an account
            const ask = base.selectAccounts ?? base.connect;
            if (!ask)
                throw new Error('This wallet cannot connect that account.');
            const shared = await ask.call(base);
            await adopt(shared);
            if (!has(shared.map((a) => a.address), address))
                throw new Error('The wallet did not share that account. Choose it in the wallet\'s account picker.');
        },
        onChange(listener) {
            listeners.add(listener);
            // 2026-11-08 (owner: connected in MetaMask's own window, this app still said Disconnected): an account the wallet starts sharing that this page did not ask for (MetaMask's own Connect button) was still switched off here from an earlier disconnect.
            // An account that APPEARS in the wallet's list is adopted (no longer off); one that was shared all along and switched off here stays off.
            let seen = reported();
            const off = base.onChange?.((change) => {
                if (change !== 'accountsChanged')
                    return listener(change);
                const before = seen;
                seen = reported();
                void Promise.all([before, seen])
                    .then(async ([prior, now]) => {
                    const fresh = now.filter((address) => !has(prior, address));
                    if (fresh.length > 0) {
                        const state = await store.read();
                        await store.write({ known: union(state.known, fresh), off: without(state.off, fresh), removed: without(state.removed ?? [], fresh) });
                    }
                })
                    .catch(() => undefined)
                    .then(() => listener(change));
            });
            return () => {
                listeners.delete(listener);
                off?.();
            };
        },
    };
    if (base.connect) {
        overrides.connect = async () => {
            const shared = await base.connect();
            await adopt(shared);
            return shared;
        };
    }
    if (base.selectAccounts) {
        overrides.selectAccounts = async () => {
            const shared = await base.selectAccounts();
            await adopt(shared);
            return shared;
        };
    }
    return { ...base, ...overrides };
}
