import React from 'react';
export interface SponsorshipPanelProps {
    /** Opaque slot: the recipient picker (web app: RecipientSelectPanel). */
    recipientSelectPanel?: React.ReactNode;
    /** Opaque slot: the cog-gated sponsorship rate config (web app: ConfigSponsorshipPanel). Omitted in REVOKE mode. */
    configSponsorshipPanel?: React.ReactNode;
    /** Opaque slot: the SPONSOR_EXCHANGE_TRADING_PAIR gate + its inner swap layout (the two mode-swapped tokenBlock/recipientBlock rows are already composed here). */
    exchangeTradingPair?: React.ReactNode;
    /** Opaque slot: the submit row (web app: ConnectTradeButton / ExchangeButton). */
    connectTradeButton?: React.ReactNode;
    /** Opaque slot: the affiliate fee line (web app: AffiliateFee wrapper). */
    affiliateFee?: React.ReactNode;
    /** Opaque slot: the fee disclosures line (web app: FeeDisclosure). */
    feeDisclosure?: React.ReactNode;
    recipientName?: React.ReactNode;
    payTokenSymbol?: string;
    payTokenAddress?: string;
    payTokenIcon?: React.ReactNode;
    stakedTokenSymbol?: string;
    stakedTokenAddress?: string;
    stakedTokenIcon?: React.ReactNode;
    onSubmit?: () => void;
    submitLabel?: string;
    onRecipientClick?: () => void;
    onPayTokenClick?: (e: React.SyntheticEvent) => void;
    onStakedRecipientIconClick?: () => void;
    /** 2026-09-26, Phase 4 finish — real stake amount input on the "New Recipient
     *  Staked spCoins" row. Mirror of SendTabPanel's sendAmount/onSendAmountChange.
     *  Omitted = inert (static, no input). */
    sponsorAmount?: string;
    onSponsorAmountChange?: (value: string) => void;
    sponsorAmountBusy?: boolean;
    /** 2026-09-27, Phase 4 — swap execution callback. Called with no args;
     *  the caller (MeritWallet) resolves all token/amount params from its own
     *  selections state before invoking. If omitted, no swap button is shown
     *  (existing inert-only behavior). */
    onSponsorSwapSubmit?: () => void;
    sponsorSwapBusy?: boolean;
}
export default function SponsorshipPanel({ recipientSelectPanel, configSponsorshipPanel, exchangeTradingPair, connectTradeButton, affiliateFee, feeDisclosure, recipientName, payTokenSymbol, payTokenAddress, payTokenIcon, stakedTokenSymbol, stakedTokenAddress, stakedTokenIcon, onSubmit, submitLabel, onRecipientClick, onPayTokenClick, onStakedRecipientIconClick, sponsorAmount, onSponsorAmountChange, sponsorAmountBusy, onSponsorSwapSubmit, sponsorSwapBusy, }: SponsorshipPanelProps): React.JSX.Element;
