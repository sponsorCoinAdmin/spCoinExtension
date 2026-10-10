import React from 'react';
import type { SwapTradeButtonHost } from './SwapTradeButton';
export default function ConnectedUniSelectPanel({ host, onBuyTokenClick, balanceText, }: {
    host: SwapTradeButtonHost;
    onBuyTokenClick?: (e: React.SyntheticEvent) => void;
    balanceText?: string;
}): React.JSX.Element;
