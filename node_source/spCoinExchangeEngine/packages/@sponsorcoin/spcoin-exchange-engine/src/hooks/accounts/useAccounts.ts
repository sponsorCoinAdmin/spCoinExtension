// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/accounts/useAccounts.ts
//
// 2026-09-18 — moved from the parent app's
// lib/structure/exchangeContextCore/hooks/ExchangeContext/nested/useAccounts.ts.
// Every per-role account hook in this folder is built on this one.

import { useCallback } from 'react';
import { useExchangeContext } from '../useExchangeContext';

// Infer the accounts type from the context — apiCoreSyncedMembers is the
// sole location (no top-level mirror) — see APICoreSyncedMembers' own doc
// comment in @sponsorcoin/spcoin-common/context.
type Accounts = ReturnType<typeof useExchangeContext>['exchangeContext']['apiCoreSyncedMembers']['accounts'];

type AccountsUpdater = Accounts | ((prev: Accounts) => Accounts);

export function useAccounts(): [Accounts, (next: AccountsUpdater) => void] {
  const { exchangeContext, setExchangeContext } = useExchangeContext();
  // Empty-object fallback for the transient render where exchangeContext
  // hasn't caught up yet.
  const accounts = exchangeContext?.apiCoreSyncedMembers.accounts ?? ({} as Accounts);

  const setAccounts = useCallback(
    (next: AccountsUpdater) => {
      setExchangeContext(
        (prev) => {
          const current = prev.apiCoreSyncedMembers.accounts as Accounts;
          const updated =
            typeof next === 'function'
              ? (next as (p: Accounts) => Accounts)(current)
              : next;

          return {
            ...prev,
            apiCoreSyncedMembers: {
              ...prev.apiCoreSyncedMembers,
              accounts: updated,
            },
          };
        },
        'useAccounts:setAccounts',
      );
    },
    [setExchangeContext],
  );

  return [accounts, setAccounts];
}
