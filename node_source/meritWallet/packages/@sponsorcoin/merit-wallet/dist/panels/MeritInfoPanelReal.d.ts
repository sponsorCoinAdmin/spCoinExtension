import React from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
export interface MeritInfoPanelRealProps {
    panelId?: SP_COIN_DISPLAY;
    /** Origin to fetch meritInfo.json/meritWallet.png from — '' (default) means same-origin relative, correct for the web app. A consumer served from a different origin (e.g. a browser extension) supplies its own real origin. */
    baseUrl?: string;
}
export default function MeritInfoPanelReal({ panelId, baseUrl, }: MeritInfoPanelRealProps): React.JSX.Element | null;
