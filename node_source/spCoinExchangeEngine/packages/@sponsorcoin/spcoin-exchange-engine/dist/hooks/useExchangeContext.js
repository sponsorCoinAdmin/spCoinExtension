// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/useExchangeContext.ts
//
// 2026-09-18 — moved from the parent app's
// lib/structure/exchangeContextCore/hooks/ExchangeContext/useExchangeContext.ts.
// The single read entry point for the shared ExchangeContextState context
// object (exchangeContextContract.ts, moved here in Phase B.1) — every
// other hook in this package's hooks/ tree is built on this one.
import { useContext } from 'react';
import { ExchangeContextState } from '../exchangeContextContract';
export const useExchangeContext = () => {
    const context = useContext(ExchangeContextState);
    if (!context) {
        throw new Error('❌ useExchangeContext must be used within an ExchangeProvider');
    }
    return context;
};
