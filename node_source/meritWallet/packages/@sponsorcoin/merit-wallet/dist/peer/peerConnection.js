// File: src/peer/peerConnection.ts
//
// 2026-11-01 (owner: the connection is full duplex; "inject these hooks as a startup parameter, to keep the load light, just like injecting the vault or keystore ... they can live in the master wrapper merit package").
// A PEER is another wallet this one is paired with (the Merit extension seen from the web app, the Merit web app seen from the extension, a phone wallet app). Wallet-level Connected means: the peer is reachable and logged on, nothing more
// (which accounts it shares is the separate, account-level connection). The truth lives in the peer, so it is ASKED, never remembered: when the wallet list first needs it, when the window regains focus (the host says how), and when the peer says it changed.
// This file is the one implementation of the state, the check and the React hook. A host injects only a TRANSPORT (how to ask, which of the peer's events to listen to) for each peer it has, as `peers` on MeritWallet, like the vault or the keystore;
// a host that injects none pays nothing: no hook runs for a peer nobody gave.
import { useEffect, useMemo, useSyncExternalStore } from 'react';
const detachedKey = (id) => `merit-peer-detached:${id}`;
const choiceAtKey = (id) => `merit-peer-choice-at:${id}`;
export function createPeerConnection(id, transport) {
    let answer = false; // what the peer last said: reachable and logged on
    let detached = (() => {
        try {
            return transport.storage?.get(detachedKey(id)) === '1'; // what the person chose
        }
        catch {
            return false;
        }
    })();
    let choiceAtMs = (() => {
        try {
            return Number(transport.storage?.get(choiceAtKey(id))) || 0;
        }
        catch {
            return 0;
        }
    })();
    let state = { connected: false };
    const listeners = new Set();
    const publish = () => {
        const connected = answer && !detached;
        if (connected === state.connected)
            return;
        state = { connected };
        listeners.forEach((l) => l());
    };
    const set = (connected) => {
        answer = connected;
        publish();
    };
    const keep = (next, at) => {
        detached = next;
        choiceAtMs = at;
        try {
            if (next)
                transport.storage?.set(detachedKey(id), '1');
            else
                transport.storage?.remove(detachedKey(id));
            transport.storage?.set(choiceAtKey(id), String(at));
        }
        catch {
            /* best effort */
        }
        publish();
    };
    const choose = (next, force = false) => {
        if (next === detached && !force)
            return;
        const at = Date.now();
        keep(next, at);
        try {
            transport.onChoice?.(next, at);
        }
        catch {
            /* telling the other side is best effort */
        }
    };
    let asking = false;
    const refresh = async () => {
        if (asking)
            return;
        asking = true;
        try {
            const reply = await transport.ask();
            if (reply !== undefined)
                set(reply);
        }
        catch {
            /* no answer: unchanged */
        }
        finally {
            asking = false;
        }
    };
    let started = false;
    const start = () => {
        if (started)
            return;
        started = true;
        void refresh();
        transport.focus?.(() => void refresh());
        transport.listen?.({ refresh: () => void refresh(), set });
    };
    return {
        get: () => state,
        detach: () => choose(true),
        attach: (force) => choose(false, force === true),
        isDetached: () => detached,
        choiceAt: () => choiceAtMs,
        adopt(next, at) {
            if (!(at > choiceAtMs))
                return; // ours is newer (or the same): ours stands
            keep(next, at);
        },
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        start,
    };
}
/** The states of the injected peers, by id; re-renders when any changes. Starts each peer's checks on first use. */
export function usePeerStates(peers) {
    useEffect(() => {
        for (const peer of Object.values(peers ?? {}))
            peer.start();
    }, [peers]);
    const subscribe = (listener) => {
        const stops = Object.values(peers ?? {}).map((peer) => peer.subscribe(listener));
        return () => stops.forEach((stop) => stop());
    };
    const key = () => Object.entries(peers ?? {}).map(([id, peer]) => `${id}:${peer.get().connected ? 1 : 0}`).join('|');
    const snapshot = useSyncExternalStore(subscribe, key, key);
    return useMemo(() => Object.fromEntries(Object.entries(peers ?? {}).map(([id, peer]) => [id, peer.get()])), [snapshot, peers]);
}
