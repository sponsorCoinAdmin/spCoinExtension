import React from 'react';
export interface StakingStatusPanelLayoutContainerProps {
    /** Label for the amount row (default in the web app: "New Recipient Staked spCoins"). */
    buyText: string;
    /** Overrides the live balance fetch (web app SponsorPanel passes a live formatted string). */
    balanceOverride?: string;
    /** Forces the amount field read-only (precedence: amountOverride > disabledOverride > default). */
    disabledOverride?: boolean;
    /** Forces the amount field to fixed text (e.g. "No Pool"), read-only. */
    amountOverride?: string;
    /** Label prefix for the balance line. */
    balanceLabel: string;
    /** Whether to render the token-identity pill (icon/symbol/address). */
    showTokenIdentity: boolean;
    /** Resolved API trading provider string from the caller's useApiProvider() — only 'API_0X' disables input. */
    apiProvider?: string;
}
export default function StakingStatusPanelLayoutContainer({ buyText, balanceOverride, disabledOverride, amountOverride, balanceLabel, showTokenIdentity, apiProvider, }: StakingStatusPanelLayoutContainerProps): React.JSX.Element;
