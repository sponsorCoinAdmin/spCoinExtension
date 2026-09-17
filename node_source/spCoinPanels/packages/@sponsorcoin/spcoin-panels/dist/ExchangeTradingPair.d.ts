import React from 'react';
export interface ExchangeTradingPairProps {
    sellLabel?: string;
    sellAmount?: string;
    onSellAmountChange?: (value: string) => void;
    sellAmountDisabled?: boolean;
    sellSymbol?: string;
    sellAddress?: string;
    sellIcon?: React.ReactNode;
    onSellTokenClick?: (e: React.SyntheticEvent) => void;
    sellBalanceText?: string;
    sellBalanceClickable?: boolean;
    onSellBalanceClick?: () => void;
    buyLabel?: string;
    buyAmount?: string;
    onBuyAmountChange?: (value: string) => void;
    buyAmountDisabled?: boolean;
    buySymbol?: string;
    buyAddress?: string;
    buyIcon?: React.ReactNode;
    onBuyTokenClick?: (e: React.SyntheticEvent) => void;
    buyBalanceText?: string;
    /** Slippage-settings cog — real app shows this on the buy row only
     *  (SlippageComponent.tsx's `isBuy` gating on the cog). */
    onCogClick?: () => void;
    onSwapDirection?: () => void;
}
export default function ExchangeTradingPair({ sellLabel, sellAmount, onSellAmountChange, sellAmountDisabled, sellSymbol, sellAddress, sellIcon, onSellTokenClick, sellBalanceText, sellBalanceClickable, onSellBalanceClick, buyLabel, buyAmount, onBuyAmountChange, buyAmountDisabled, buySymbol, buyAddress, buyIcon, onBuyTokenClick, buyBalanceText, onCogClick, onSwapDirection, }: ExchangeTradingPairProps): import("react/jsx-runtime").JSX.Element;
