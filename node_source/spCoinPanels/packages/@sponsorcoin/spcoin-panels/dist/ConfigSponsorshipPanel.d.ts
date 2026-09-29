import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export interface ConfigSponsorshipPanelProps {
    panelId?: SP_COIN_DISPLAY;
    /** Rate-range bounds from the web app's exchangeContext.settings.spCoinContract. */
    recipientRateRange?: [number, number];
    agentRateRange?: [number, number];
    /** Annual inflation rate from exchangeContext.settings.spCoinContract. */
    annualInflationRate?: number;
    /** Injected info icon (web app: <Image src={info_png} />; extension: <img>). */
    infoIcon?: React.ReactNode;
    /** Opens MESSAGE_PANEL with distribution info (replaces useErrorMessage + openPanel). */
    onShowDistributionInfo?: () => void;
    /** Injected close handler (web app: closePanel(panelId)). */
    onClose?: () => void;
}
export default function ConfigSponsorshipPanel({ panelId, recipientRateRange, agentRateRange, annualInflationRate, infoIcon, onShowDistributionInfo, onClose, }: ConfigSponsorshipPanelProps): React.JSX.Element | null;
