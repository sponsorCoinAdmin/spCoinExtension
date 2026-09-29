// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/dropDowns/useBuyTokenContract.ts
//
// 2026-09-21 — sibling of useSellTokenContract.ts, same move, same
// reasoning (see that file's own header comment).
import { useExchangeContext } from '../useExchangeContext';
import { tokenContractsEqual } from './tokenContractsEqual';
/** Hook for managing buyTokenContract from context. */
export const useBuyTokenContract = () => {
    const { exchangeContext, setExchangeContext } = useExchangeContext();
    const token = exchangeContext?.apiCoreSyncedMembers?.tradeData?.buyTokenContract;
    const setToken = (contract) => {
        const prev = exchangeContext?.apiCoreSyncedMembers?.tradeData?.buyTokenContract;
        if (tokenContractsEqual(prev, contract))
            return;
        setExchangeContext((p) => ({
            ...p,
            apiCoreSyncedMembers: {
                ...p.apiCoreSyncedMembers,
                tradeData: {
                    ...p.apiCoreSyncedMembers.tradeData,
                    buyTokenContract: contract,
                },
            },
        }), 'useBuyTokenContract:setToken');
    };
    return [token, setToken];
};
