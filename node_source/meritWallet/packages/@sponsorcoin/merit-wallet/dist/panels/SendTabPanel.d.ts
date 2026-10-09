import React from 'react';
export interface SendTabPanelProps {
    sendTokenSymbol?: string;
    sendTokenAddress?: string;
    sendTokenIcon?: React.ReactNode;
    recipientSymbol?: string;
    recipientAddress?: string;
    recipientIcon?: React.ReactNode;
    /** 2026-09-22 — the "You Send" row's real, editable amount. Omit onAmountChange to leave it inert (today's original look). */
    sendAmount?: string;
    onSendAmountChange?: (value: string) => void;
    onSubmit?: () => void;
    submitLabel?: string;
    /** True while a real send is in flight (the button says Sending… and cannot be clicked). */
    submitBusy?: boolean;
    /** What the shared Send button (spcoin-panels' SendButton) needs: the token's decimals, the sender's balance in base units (undefined while unknown), whether a recipient is picked, and the symbol. */
    sendDecimals?: number;
    sendBalanceRaw?: bigint;
    sendHasRecipient?: boolean;
    sendSymbol?: string;
    /** 2026-10-03 — "You Send" balance line (was hardcoded "Balance: 0"). The caller resolves it. */
    balanceText?: string;
    /** The Recipient row's balance line (the recipient's balance of the token being sent). */
    recipientBalanceText?: string;
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
export default function SendTabPanel({ sendTokenSymbol, sendTokenAddress, sendTokenIcon, recipientSymbol, recipientAddress, recipientIcon, sendAmount, onSendAmountChange, onSubmit, submitBusy, balanceText, recipientBalanceText, sendDecimals, sendBalanceRaw, sendHasRecipient, sendSymbol, onSendTokenClick, onRecipientClick, }: SendTabPanelProps): React.JSX.Element;
