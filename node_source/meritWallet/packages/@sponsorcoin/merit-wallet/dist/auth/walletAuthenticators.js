const withTimeout = (work, ms) => new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    Promise.resolve(work).then((value) => { clearTimeout(timer); resolve(!!value); }, () => { clearTimeout(timer); resolve(false); });
});
export function createWalletConnections(options = {}) {
    const timeoutMs = options.timeoutMs ?? 4000;
    const probes = new Map(Object.entries(options.probes ?? {}));
    const unsubscribes = new Map();
    const listeners = new Set();
    let states = {};
    // a newer answer for the same wallet wins: a slow older probe must not overwrite it
    const ticket = new Map();
    let started = false;
    const publish = (next) => {
        states = next;
        listeners.forEach((listener) => listener());
    };
    const refreshOne = async (id) => {
        const probe = probes.get(id);
        if (!probe)
            return;
        const mine = (ticket.get(id) ?? 0) + 1;
        ticket.set(id, mine);
        // only a wallet with no answer yet reads "checking"; one that already has an answer keeps it while it is asked again (no flicker on a focus)
        if (!states[id])
            publish({ ...states, [id]: 'checking' });
        const connected = await withTimeout(probe.check(), timeoutMs);
        if (ticket.get(id) !== mine)
            return;
        const state = connected ? 'connected' : 'disconnected';
        if (states[id] !== state)
            publish({ ...states, [id]: state });
    };
    const listen = (id) => {
        unsubscribes.get(id)?.();
        const off = probes.get(id)?.subscribe?.(() => void refreshOne(id));
        if (off)
            unsubscribes.set(id, off);
    };
    const store = {
        get: () => states,
        isConnected(id) {
            if (!probes.has(id))
                return undefined;
            return states[id] === 'connected';
        },
        async refresh(id) {
            await Promise.all((id ? [id] : [...probes.keys()]).map(refreshOne));
        },
        register(id, probe) {
            probes.set(id, probe);
            if (started)
                listen(id);
            void refreshOne(id);
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        start() {
            if (started)
                return;
            started = true;
            for (const id of probes.keys())
                listen(id);
            options.onFocus?.(() => void store.refresh());
            void store.refresh();
        },
    };
    return store;
}
/** The probe of a wallet that is an Authenticator: connected while it is available AND shares an account (the injected wallets: a real provider that answers eth_accounts, no popup). Its own change events trigger the next check. */
export function authenticatorProbe(authenticator) {
    return {
        async check() {
            const status = await authenticator()?.status();
            return !!status && status.available && status.unlocked;
        },
        subscribe(refresh) {
            return authenticator()?.onChange?.(() => refresh()) ?? (() => undefined);
        },
    };
}
