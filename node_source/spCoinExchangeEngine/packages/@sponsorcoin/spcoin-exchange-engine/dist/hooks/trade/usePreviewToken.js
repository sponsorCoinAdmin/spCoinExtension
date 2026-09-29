import { useExchangeContext } from '../useExchangeContext';
import { tokenContractsEqual } from '../dropDowns/tokenContractsEqual';
export const usePreviewTokenContract = () => {
    const { exchangeContext, setExchangeContext } = useExchangeContext();
    const token = exchangeContext?.apiCoreSyncedMembers?.tradeData?.previewTokenContract;
    const setToken = (contract) => {
        const prev = exchangeContext?.apiCoreSyncedMembers?.tradeData?.previewTokenContract;
        if (tokenContractsEqual(prev, contract))
            return;
        setExchangeContext((p) => ({
            ...p,
            apiCoreSyncedMembers: {
                ...p.apiCoreSyncedMembers,
                tradeData: {
                    ...p.apiCoreSyncedMembers.tradeData,
                    previewTokenContract: contract,
                },
            },
        }));
    };
    return [token, setToken];
};
export const usePreviewTokenSource = () => {
    const { exchangeContext, setExchangeContext } = useExchangeContext();
    const source = exchangeContext?.apiCoreSyncedMembers?.tradeData?.previewTokenSource;
    const setSource = (nextSource) => {
        const prev = exchangeContext?.apiCoreSyncedMembers?.tradeData?.previewTokenSource ?? null;
        if (prev === nextSource)
            return;
        setExchangeContext((p) => ({
            ...p,
            apiCoreSyncedMembers: {
                ...p.apiCoreSyncedMembers,
                tradeData: {
                    ...p.apiCoreSyncedMembers.tradeData,
                    previewTokenSource: nextSource,
                },
            },
        }));
    };
    return [source, setSource];
};
