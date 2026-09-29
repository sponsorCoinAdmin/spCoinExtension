// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/dropDowns/useSellTokenContract.ts
//
// 2026-09-21, on direct request ("get the methods also moved over to
// npm so we can have the node panels utilize them") — moved from the
// parent app's lib/context/hooks/nestedHooks/useTokenContracts.ts.
// Genuinely portable: reads/writes tradeData.sellTokenContract through
// the shared useExchangeContext() this package already exports — the
// same underlying ExchangeContextState object both the web app's real
// ExchangeProvider and the extension's LiteExchangeProvider populate
// (confirmed by reading ExchangeProvider.tsx directly before moving
// this, not assumed). Web-app-only debug logging (debugHookChange,
// the per-hook tLog) intentionally NOT carried over — matches every
// other hook already moved into this package (see useAccounts.ts/
// useActiveAccount.ts, neither of which kept their own original debug
// logging either).

import { useExchangeContext } from '../useExchangeContext';
import { tokenContractsEqual } from './tokenContractsEqual';
import type { TokenContract } from '@sponsorcoin/spcoin-common/context';

/** Hook for managing sellTokenContract from context. */
export const useSellTokenContract = (): [
  TokenContract | undefined,
  (contract: TokenContract | undefined) => void,
] => {
  const { exchangeContext, setExchangeContext } = useExchangeContext();
  const token = exchangeContext?.apiCoreSyncedMembers?.tradeData?.sellTokenContract;

  const setToken = (contract: TokenContract | undefined) => {
    const prev = exchangeContext?.apiCoreSyncedMembers?.tradeData?.sellTokenContract;
    if (tokenContractsEqual(prev, contract)) return;

    setExchangeContext(
      (p) => ({
        ...p,
        apiCoreSyncedMembers: {
          ...p.apiCoreSyncedMembers,
          tradeData: {
            ...p.apiCoreSyncedMembers.tradeData,
            sellTokenContract: contract,
          },
        },
      }),
      'useSellTokenContract:setToken',
    );
  };

  return [token, setToken];
};
