import React from 'react';
import { type ExchangeTradingPairProps } from '@sponsorcoin/spcoin-panels';
export interface TradingStationPanelProps extends ExchangeTradingPairProps {
    onSubmit?: () => void;
    submitLabel?: string;
    /** AFFILIATE_FEE's content (live, quote-derived — host supplied). Omit for none. */
    affiliateFeeContent?: React.ReactNode;
}
export default function TradingStationPanel({ onSubmit, submitLabel, affiliateFeeContent, ...exchangeTradingPairProps }: TradingStationPanelProps): React.JSX.Element;
