import React from 'react';
export interface WalletRadioPanelsProps {
    children: React.ReactNode;
    /**
      * Consumer-owned radio-panel host rendered INSIDE the WALLET_RADIO_PANELS
      * gate (2026-10-03). When supplied, it replaces `children`: both otherwise
      * render the same radio-panel ids from the same visibility flags.
     *
      * An injected slot keeps this package free of any app import while putting
      * the host inside this gate and the wallet's flex column, where the overlay
      * layout expects it. If omitted, the portable `children` body remains the
      * standalone behavior used by the extension.
     */
    overlayHost?: React.ReactNode;
}
export default function WalletRadioPanels({ children, overlayHost }: WalletRadioPanelsProps): React.JSX.Element;
