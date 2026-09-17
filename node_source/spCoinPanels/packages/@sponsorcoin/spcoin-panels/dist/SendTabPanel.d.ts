import React from 'react';
export interface SendTabPanelProps {
    sendTokenSymbol?: string;
    sendTokenAddress?: string;
    sendTokenIcon?: React.ReactNode;
    recipientSymbol?: string;
    recipientAddress?: string;
    recipientIcon?: React.ReactNode;
    onSubmit?: () => void;
    submitLabel?: string;
    /** 2026-09-15, on request ("the Token/Account/NetworkSelectListDropdown
     *  chevrons [need] to be linked to the required panels") — same shape as
     *  ExchangeTradingPair.tsx's own onSellTokenClick/onBuyTokenClick, just
     *  named for what these two rows actually are here (a token pill and a
     *  recipient-account pill, not a sell/buy pair). Threaded straight
     *  through to TradeAmountRow's existing onTokenPillClick — that prop
     *  already existed and was already wired to each row's own pill onClick;
     *  it just had no caller supplying a handler until now. */
    onSendTokenClick?: (e: React.SyntheticEvent) => void;
    onRecipientClick?: (e: React.SyntheticEvent) => void;
}
export default function SendTabPanel({ sendTokenSymbol, sendTokenAddress, sendTokenIcon, recipientSymbol, recipientAddress, recipientIcon, onSubmit, submitLabel, onSendTokenClick, onRecipientClick, }: SendTabPanelProps): import("react/jsx-runtime").JSX.Element;
