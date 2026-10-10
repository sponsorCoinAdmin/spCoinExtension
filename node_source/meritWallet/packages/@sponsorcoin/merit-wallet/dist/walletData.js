import { jsx as _jsx } from "react/jsx-runtime";
// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/walletData.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, row 7 / S2b-4b) -- the first piece of the wallet's data-access contract.
// Connected panels in this package read what they can from the exchange engine (the shared ExchangeContext), but some data has to be
// FETCHED, and how is a host decision: the web app reads it through its own API client, cache and registry (lib/context/tokens/tokenStore),
// the extension will read it with its own transport. A host supplies the functions through WalletDataProvider; a panel that needs one that
// is missing simply does not load it (it shows what it already has). More members arrive here as more panels move in, and this interface
// becomes the "reads" part of the merit-wallet-api contract (table row 9).
import { createContext, useContext } from 'react';
const WalletDataContext = createContext({});
export function WalletDataProvider({ value, children }) {
    return _jsx(WalletDataContext.Provider, { value: value, children: children });
}
export function useWalletData() {
    return useContext(WalletDataContext);
}
