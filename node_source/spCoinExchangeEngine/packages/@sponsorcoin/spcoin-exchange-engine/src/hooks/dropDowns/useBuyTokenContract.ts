// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/dropDowns/useBuyTokenContract.ts
//
// 2026-09-21 — sibling of useSellTokenContract.ts, same move, same
// reasoning (see that file's own header comment).

import { useExchangeContext } from '../useExchangeContext';
import { tokenContractsEqual } from './tokenContractsEqual';
import type { TokenContract } from '@sponsorcoin/spcoin-common/context';

/** Hook for managing buyTokenContract from context. */
export const useBuyTokenContract = (): [
  TokenContract | undefined,
  (contract: TokenContract | undefined) => void,
] => {
  const { exchangeContext, setExchangeContext } = useExchangeContext();
  const token = exchangeContext?.apiCoreSyncedMembers?.tradeData?.buyTokenContract;

  const setToken = (contract: TokenContract | undefined) => {
    const prev = exchangeContext?.apiCoreSyncedMembers?.tradeData?.buyTokenContract;
    console.log('[DEBUG useBuyTokenContract:setToken]', {
      prevAddr: prev?.address,
      nextAddr: contract?.address,
      prevSame: tokenContractsEqual(prev, contract),
    });
    if (tokenContractsEqual(prev, contract)) return;

    setExchangeContext(
      (p) => ({
        ...p,
        apiCoreSyncedMembers: {
          ...p.apiCoreSyncedMembers,
          tradeData: {
            ...p.apiCoreSyncedMembers.tradeData,
            buyTokenContract: contract,
          },
        },
      }),
      'useBuyTokenContract:setToken',
    );
  };

  return [token, setToken];
};
