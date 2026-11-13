// File: src/auth/walletAuthenticatorsReact.ts
//
// The hook over the connection store (walletAuthenticators.ts): `useWalletConnections(store)` re-renders when any wallet's state changes and returns the map and the one `isConnected(id)` every screen uses (true / false, undefined = no opinion).
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ConnectionState, WalletConnections } from './walletAuthenticators';

type AuthenticatorId = string;

export interface UseWalletConnections {
  states: Readonly<Record<AuthenticatorId, ConnectionState>>;
  isConnected: (id: AuthenticatorId) => boolean | undefined;
  refresh: (id?: AuthenticatorId) => Promise<void>;
}

export function useWalletConnections(store: WalletConnections): UseWalletConnections {
  useEffect(() => store.start(), [store]);
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
  const states = useSyncExternalStore(subscribe, store.get, store.get);
  return useMemo<UseWalletConnections>(
    () => ({
      states,
      isConnected: (id) => (store.isConnected(id) === undefined ? undefined : states[id] === 'connected'),
      refresh: (id) => store.refresh(id),
    }),
    [states, store],
  );
}
