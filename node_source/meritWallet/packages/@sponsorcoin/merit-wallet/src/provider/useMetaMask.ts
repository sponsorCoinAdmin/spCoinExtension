// File: src/provider/useMetaMask.ts
//
// 2026-11-07 (owner request): useMetaMask() -> { metaMaskConnected }, the ONE answer to "is this page connected to MetaMask?". MetaMask has no connected flag, so it is asked: eth_accounts (no popup) lists the accounts this site may use, and a non-empty list means connected.
// It is read once MetaMask is found (EIP-6963, rdns io.metamask) and again on every accountsChanged (connecting or disconnecting inside MetaMask, switching accounts) and on a wallet_revokePermissions made by this page's own Disconnect. A locked MetaMask also answers an empty
// list, so locked reads as not connected. No MetaMask installed: false.
import { useCallback, useEffect, useState } from 'react';
import { discoverWallets, type DiscoveryWindow, type Eip1193Provider } from './injectedWallet';
import { onInjectedWalletChanged } from '../auth/injectedAuthenticator';

export const METAMASK_RDNS = 'io.metamask';

export interface UseMetaMask {
  /** true while MetaMask lists at least one account for this page. */
  metaMaskConnected: boolean;
  /** Ask MetaMask again now (after this page connects or disconnects it). */
  refreshMetaMask: () => void;
}

async function readConnected(provider: Eip1193Provider): Promise<boolean> {
  try {
    const accounts = await provider.request({ method: 'eth_accounts' });
    return Array.isArray(accounts) && accounts.length > 0;
  } catch {
    return false;
  }
}

/** The page's window, said by the host (the component never reaches for the device itself): discovery plus the events the page hears. */
export type MetaMaskWindow = DiscoveryWindow;

export function useMetaMask(win?: MetaMaskWindow): UseMetaMask {
  const [metaMaskConnected, setConnected] = useState(false);
  const [provider, setProvider] = useState<Eip1193Provider | null>(null);

  useEffect(() => {
    if (!win) return;
    let cancelled = false;
    void discoverWallets(win).then((found) => {
      if (!cancelled) setProvider(found.find((d) => d.info.rdns === METAMASK_RDNS)?.provider ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [win]);

  const refreshMetaMask = useCallback(() => {
    if (!provider) return setConnected(false);
    void readConnected(provider).then(setConnected);
  }, [provider]);

  useEffect(() => {
    if (!provider) {
      setConnected(false);
      return;
    }
    let cancelled = false;
    const read = () => void readConnected(provider).then((connected) => { if (!cancelled) setConnected(connected); });
    // accountsChanged carries the new list; it is trusted over a second request
    const onAccounts = (accounts: unknown) => { if (!cancelled) setConnected(Array.isArray(accounts) && accounts.length > 0); };
    read();
    provider.on?.('accountsChanged', onAccounts);
    // this page's own Disconnect (MetaMask may not emit accountsChanged for a revoke) and the person coming back from MetaMask's window
    const offChanged = onInjectedWalletChanged(read);
    win?.addEventListener('focus', read);
    return () => {
      cancelled = true;
      provider.removeListener?.('accountsChanged', onAccounts);
      offChanged();
      win?.removeEventListener('focus', read);
    };
  }, [provider, win]);

  return { metaMaskConnected, refreshMetaMask };
}
