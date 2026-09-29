// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/useTradeDirection.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's
// lib/context/hooks/nestedHooks/useTradeDirection.ts (on request, "migrate
// them"). Genuinely portable — thin wrapper over useExchangeContext, already
// moved into this same package. Web-app-only debug logging dropped on the
// move. TRADE_DIRECTION comes from @sponsorcoin/spcoin-common/context,
// already the shared source (see exchangeContextContract.ts's own import).
import { useMemo } from 'react';
import { TRADE_DIRECTION } from '@sponsorcoin/spcoin-common/context';
import { useExchangeContext } from '../useExchangeContext';
export const useTradeDirection = () => {
    const { exchangeContext, setExchangeContext } = useExchangeContext();
    const currentDirection = exchangeContext?.apiCoreSyncedMembers?.tradeData?.tradeDirection ?? TRADE_DIRECTION.SELL_EXACT_OUT;
    const setTradeDirection = (type) => {
        if (!exchangeContext?.apiCoreSyncedMembers?.tradeData)
            return;
        if (currentDirection === type)
            return;
        setExchangeContext((prev) => ({
            ...prev,
            apiCoreSyncedMembers: {
                ...prev.apiCoreSyncedMembers,
                tradeData: {
                    ...prev.apiCoreSyncedMembers.tradeData,
                    tradeDirection: type,
                },
            },
        }));
    };
    return [currentDirection, setTradeDirection];
};
export const useTradeData = () => {
    const { exchangeContext } = useExchangeContext();
    return useMemo(() => exchangeContext?.apiCoreSyncedMembers?.tradeData ?? {}, [exchangeContext?.apiCoreSyncedMembers?.tradeData]);
};
