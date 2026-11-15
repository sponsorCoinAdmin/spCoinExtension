import React from 'react';
import { type StakeConfirmHostState, type TradeHost } from '../trade/tradeHost';
/** The Sponsor tab's host: the same data and functions the Swap tab uses (TradeHost). */
export type SponsorPanelHost = TradeHost;
export type { StakeConfirmHostState };
export default function ConnectedSponsorPanel({ host }: {
    host?: SponsorPanelHost;
}): React.JSX.Element;
