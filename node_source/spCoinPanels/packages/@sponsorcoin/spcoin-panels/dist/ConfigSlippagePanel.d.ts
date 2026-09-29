import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export declare const SLIPPAGE_MIN_BPS = 50;
export declare const SLIPPAGE_MAX_BPS = 500;
export declare const SLIPPAGE_STEP_BPS = 5;
export interface ConfigSlippagePanelProps {
    panelId?: SP_COIN_DISPLAY;
    /** Current slippage, in bps. Caller owns the real value (ExchangeContext-bound). */
    bps: number;
    onBpsChange: (bps: number) => void;
}
export default function ConfigSlippagePanel({ panelId, bps, onBpsChange, }: ConfigSlippagePanelProps): React.JSX.Element | null;
