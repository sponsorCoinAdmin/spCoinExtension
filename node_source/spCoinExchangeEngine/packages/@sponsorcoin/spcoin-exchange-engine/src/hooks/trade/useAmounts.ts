// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/useAmounts.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's
// lib/context/hooks/nestedHooks/useAmounts.ts (on request, "migrate them").
// Genuinely portable: reads/writes through useExchangeContext, already
// moved into this same package (see ../useExchangeContext.ts). Web-app-only
// debug logging (debugHookChange/createDebugLogger) dropped on the move,
// same convention as every other hook moved into this package so far.
import { useExchangeContext } from '../useExchangeContext';

export const useSellAmount = (): [bigint, (amount: bigint) => void] => {
  const { exchangeContext, setExchangeContext } = useExchangeContext();
  const token = exchangeContext?.apiCoreSyncedMembers.tradeData?.sellTokenContract;

  const sellAmount = token?.amount ?? BigInt(0);

  const setSellAmount = (amount: bigint) => {
    if (!token) return;

    setExchangeContext((prev: any) => {
      const cloned = structuredClone(prev);
      if (cloned.apiCoreSyncedMembers.tradeData.sellTokenContract) {
        cloned.apiCoreSyncedMembers.tradeData.sellTokenContract.amount = amount;
      }
      return cloned;
    });
  };

  return [sellAmount, setSellAmount];
};

export const useBuyAmount = (): [bigint, (amount: bigint) => void] => {
  const { exchangeContext, setExchangeContext } = useExchangeContext();
  const token = exchangeContext?.apiCoreSyncedMembers.tradeData?.buyTokenContract;

  const buyAmount = token?.amount ?? BigInt(0);

  const setBuyAmount = (amount: bigint) => {
    if (!token) return;

    setExchangeContext((prev: any) => {
      const cloned = structuredClone(prev);
      if (cloned.apiCoreSyncedMembers.tradeData.buyTokenContract) {
        cloned.apiCoreSyncedMembers.tradeData.buyTokenContract.amount = amount;
      }
      return cloned;
    });
  };

  return [buyAmount, setBuyAmount];
};
