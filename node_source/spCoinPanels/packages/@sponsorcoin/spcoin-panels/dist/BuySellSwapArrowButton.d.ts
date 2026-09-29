import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export declare function toDecimalString(v: unknown): string;
export declare function shiftDecimal(value: string, shift: number): string;
export declare function coerceShiftedAmount(original: unknown, shifted: string): bigint | string;
export interface BuySellSwapArrowButtonProps {
    panelId?: SP_COIN_DISPLAY;
    onClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}
export default function BuySellSwapArrowButton({ panelId, onClick, }: BuySellSwapArrowButtonProps): React.JSX.Element | null;
