import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export interface WalletRadioPanelsProps {
    children: React.ReactNode;
    /** Optional: a MAIN_RADIO_OVERLAY_PANELS member to open (openPanel) when
     *  supplied — makes it the active radio panel. Fires on mount if already
     *  set, and again every time the value changes. Omit for a caller that
     *  manages the active radio panel itself. */
    activeRadioPanel?: SP_COIN_DISPLAY;
}
export default function WalletRadioPanels({ children, activeRadioPanel }: WalletRadioPanelsProps): React.JSX.Element;
