import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export interface WalletRadioPanelsProps {
    children: React.ReactNode;
    /** Optional: a MAIN_RADIO_OVERLAY_PANELS member to open (openPanel) when
     *  supplied — makes it the active radio panel. Fires on mount if already
     *  set, and again every time the value changes. Omitting it sets nothing
     *  by itself — but if NO radio panel is active at all (the group has no
     *  fallbackPanel of its own), MERIT_INFO_PANEL opens as the default so
     *  the body is never blank. */
    activeRadioPanel?: SP_COIN_DISPLAY;
}
export default function WalletRadioPanels({ children, activeRadioPanel }: WalletRadioPanelsProps): React.JSX.Element;
