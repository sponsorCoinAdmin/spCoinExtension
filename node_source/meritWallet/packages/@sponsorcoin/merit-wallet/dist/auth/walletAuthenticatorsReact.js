// File: src/auth/walletAuthenticatorsReact.ts
//
// The hook over the connection store (walletAuthenticators.ts): `useWalletConnections(store)` re-renders when any wallet's state changes and returns the map and the one `isConnected(id)` every screen uses (true / false, undefined = no opinion).
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
export function useWalletConnections(store) {
    useEffect(() => store.start(), [store]);
    const subscribe = useCallback((listener) => store.subscribe(listener), [store]);
    const states = useSyncExternalStore(subscribe, store.get, store.get);
    return useMemo(() => ({
        states,
        isConnected: (id) => (store.isConnected(id) === undefined ? undefined : states[id] === 'connected'),
        refresh: (id) => store.refresh(id),
    }), [states, store]);
}
