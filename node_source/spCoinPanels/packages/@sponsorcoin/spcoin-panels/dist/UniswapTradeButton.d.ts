import React from 'react';
export interface UniswapTradeButtonProps {
    disabled?: boolean;
    busy?: boolean;
    isNoPool?: boolean;
    onClick?: () => void;
}
export default function UniswapTradeButton({ disabled, busy, isNoPool, onClick, }: UniswapTradeButtonProps): React.JSX.Element | null;
