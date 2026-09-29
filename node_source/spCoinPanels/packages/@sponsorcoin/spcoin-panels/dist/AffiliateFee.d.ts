import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export interface AffiliateFeeProps {
    panelId?: SP_COIN_DISPLAY;
    grossBuyAmount: string | undefined;
    decimals?: number;
    symbol?: string;
    /** The affiliate fee rate (e.g. 0.01 for 1%) — see this file's own
     * header comment for why this is a plain prop, not an env read. */
    feeRate?: number;
}
export default function AffiliateFee({ panelId, grossBuyAmount, decimals, symbol, feeRate, }: AffiliateFeeProps): React.JSX.Element | null;
