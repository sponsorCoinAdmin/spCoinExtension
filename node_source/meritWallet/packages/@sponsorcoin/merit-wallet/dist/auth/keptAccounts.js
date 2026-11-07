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
        await save({ known: union(state.known, addresses), off: without(state.off, addresses) });
    };
    const overrides = {
        // the USABLE accounts: what the wallet reports and has not been switched off. Every account seen is remembered.
        async accounts(onPartial) {
            const state = await store.read();
            const listed = await base.accounts(onPartial ? (partial) => onPartial(partial.filter((a) => !has(state.off, a.address))) : undefined);
            const known = union(state.known, listed.map((a) => a.address));
            if (known.length !== state.known.length)
                await store.write({ ...state, known });
            return listed.filter((a) => !has(state.off, a.address));
        },
        // every known account with its state, connected or not
        async knownAccounts() {
            const state = await store.read();
            const live = await reported();
            const known = union(state.known, live);
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
                const known = union(state.known, live);
                await save({ known, off: known });
            }
        },
        async setAccountConnected(address, connected) {
            const state = await store.read();
            if (!connected) {
                await save({ known: union(state.known, [address]), off: union(state.off, [address]) });
                return;
            }
            const live = await reported();
            if (has(live, address)) {
                await save({ ...state, off: without(state.off, [address]) });
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
            const off = base.onChange?.(listener);
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
