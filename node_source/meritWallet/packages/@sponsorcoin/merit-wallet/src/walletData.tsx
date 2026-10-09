// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/walletData.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, row 7 / S2b-4b) -- the first piece of the wallet's data-access contract.
// Connected panels in this package read what they can from the exchange engine (the shared ExchangeContext), but some data has to be
// FETCHED, and how is a host decision: the web app reads it through its own API client, cache and registry (lib/context/tokens/tokenStore),
// the extension will read it with its own transport. A host supplies the functions through WalletDataProvider; a panel that needs one that
// is missing simply does not load it (it shows what it already has). More members arrive here as more panels move in, and this interface
// becomes the "reads" part of the merit-wallet-api contract (table row 9).
import React, { createContext, useContext } from 'react';
import type { NetworkElement, TokenContract } from '@sponsorcoin/spcoin-common/context';

export interface WalletDataSource {
  /** Load the full record for a token (name, symbol, logo, ...). Used by the token detail panels to fill in a token that arrived with only an address. */
  loadTokenRecord?: (chainId: number, address: string) => Promise<TokenContract | undefined>;
  /** How the host resolves a chain id to a full network element (used to preview a chain other than the live one). Default: the spcoin-feeds network registry. */
  resolveNetwork?: (chainId: number) => NetworkElement;
  /** How the host loads a network's extra fields (website, description). Default: a relative fetch of /assets/blockchains/<chainId>/info.json. */
  loadNetworkInfo?: (chainId: number) => Promise<{ website?: string; description?: string } | undefined>;
}

const WalletDataContext = createContext<WalletDataSource>({});

export function WalletDataProvider({ value, children }: { value: WalletDataSource; children?: React.ReactNode }) {
  return <WalletDataContext.Provider value={value}>{children}</WalletDataContext.Provider>;
}

export function useWalletData(): WalletDataSource {
  return useContext(WalletDataContext);
}
