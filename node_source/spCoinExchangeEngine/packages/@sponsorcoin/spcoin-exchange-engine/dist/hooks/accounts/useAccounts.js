// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/accounts/useAccounts.ts
//
// 2026-09-18 — moved from the parent app's
// lib/structure/exchangeContextCore/hooks/ExchangeContext/nested/useAccounts.ts.
// Every per-role account hook in this folder is built on this one.
import { useCallback } from 'react';
import { useExchangeContext } from '../useExchangeContext';
export function useAccounts() {
    const { exchangeContext, setExchangeContext } = useExchangeContext();
    // Empty-object fallback for the transient render where exchangeContext
    // hasn't caught up yet.
    const accounts = exchangeContext?.apiCoreSyncedMembers.accounts ?? {};
    const setAccounts = useCallback((next) => {
        setExchangeContext((prev) => {
            const current = prev.apiCoreSyncedMembers.accounts;
            const updated = typeof next === 'function'
                ? next(current)
                : next;
            return {
                ...prev,
                apiCoreSyncedMembers: {
                    ...prev.apiCoreSyncedMembers,
                    accounts: updated,
                },
            };
        }, 'useAccounts:setAccounts');
    }, [setExchangeContext]);
    return [accounts, setAccounts];
}
