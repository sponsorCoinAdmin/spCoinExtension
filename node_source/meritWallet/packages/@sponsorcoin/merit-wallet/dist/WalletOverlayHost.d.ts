import React from 'react';
export interface WalletOverlaySlots {
    sponsorPanel?: React.ReactNode;
    sendPanel?: React.ReactNode;
    processFlowPanel?: React.ReactNode;
    passwordPanel?: React.ReactNode;
    tradingStationPanel?: React.ReactNode;
    manageSponsorRecipients?: React.ReactNode;
    manageSponsorshipsPanel?: React.ReactNode;
    sponsorStakingListPanel?: React.ReactNode;
    accountPanel?: React.ReactNode;
    agentPanel?: React.ReactNode;
    sponsorAccountPanel?: React.ReactNode;
    recipientPanel?: React.ReactNode;
    tokenPanel?: React.ReactNode;
    tokenBuyPanel?: React.ReactNode;
    tokenSellPanel?: React.ReactNode;
    tokenBuySwapPanel?: React.ReactNode;
    tokenSellSwapPanel?: React.ReactNode;
    tokenSendPanel?: React.ReactNode;
    networkPanel?: React.ReactNode;
    walletConfig?: React.ReactNode;
    activeListPanel?: React.ReactNode;
    messagePanel?: React.ReactNode;
    meritInfoPanel?: React.ReactNode;
    panelTreePanel?: React.ReactNode;
}
export interface WalletOverlayHostProps {
    slots?: WalletOverlaySlots;
    /** Hook called last, after the enforcement hooks. Must be a stable function (see the file comment). */
    useHostEffects?: () => void;
}
export default function WalletOverlayHost({ slots, useHostEffects }: WalletOverlayHostProps): React.JSX.Element;
