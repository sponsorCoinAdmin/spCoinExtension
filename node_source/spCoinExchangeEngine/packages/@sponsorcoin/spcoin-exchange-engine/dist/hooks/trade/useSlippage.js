// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/useSlippage.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's
// lib/context/hooks/nestedHooks/useSlippage.ts (on request, "migrate them").
// Genuinely portable — thin wrapper over useExchangeContext, already moved
// into this same package. Web-app-only debug logging dropped on the move.
import { useExchangeContext } from '../useExchangeContext';
export const useSlippage = () => {
    const { exchangeContext, setExchangeContext } = useExchangeContext();
    const defaultSlippage = {
        bps: 200,
        percentage: 2,
        percentageString: '2.00%',
    };
    const slippage = exchangeContext?.apiCoreSyncedMembers?.tradeData?.slippage ?? defaultSlippage;
    const setSlippage = (newSlippage) => {
        if (!exchangeContext?.apiCoreSyncedMembers?.tradeData)
            return;
        setExchangeContext((prev) => ({
            ...prev,
            apiCoreSyncedMembers: {
                ...prev.apiCoreSyncedMembers,
                tradeData: {
                    ...prev.apiCoreSyncedMembers.tradeData,
                    slippage: newSlippage,
                },
            },
        }));
    };
    const setBps = (bps) => {
        const percentage = bps / 100;
        const newSlippage = {
            bps,
            percentage,
            percentageString: `${percentage.toFixed(2)}%`,
        };
        setSlippage(newSlippage);
    };
    return {
        data: slippage,
        setSlippage,
        setBps,
    };
};
export const useSlippagePercent = () => {
    const { data: slippage, setBps } = useSlippage();
    const slippagePercent = `${(slippage.bps / 100)
        .toLocaleString(undefined, { maximumFractionDigits: 2 })
        .replace(/\.?0+$/, '')}%`;
    const setSlippagePercent = (percent) => {
        const cleaned = percent.replace('%', '').trim();
        const parsed = parseFloat(cleaned);
        if (!isNaN(parsed)) {
            setBps(Math.round(parsed * 100));
        }
    };
    return [slippagePercent, setSlippagePercent];
};
