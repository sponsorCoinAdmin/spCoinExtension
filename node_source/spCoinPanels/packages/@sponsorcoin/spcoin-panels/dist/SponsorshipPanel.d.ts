import React from 'react';
export interface SponsorshipPanelProps {
    recipientName?: string;
    payTokenSymbol?: string;
    payTokenAddress?: string;
    payTokenIcon?: React.ReactNode;
    stakedTokenSymbol?: string;
    stakedTokenAddress?: string;
    stakedTokenIcon?: React.ReactNode;
    onSubmit?: () => void;
    submitLabel?: string;
    /** 2026-09-15, on request ("you did not do the sponsor tab") — this
     *  panel has the same two pickable targets Swap/Send already got wired:
     *  the real app's `RecipientSelectPanel` (picking WHO you're
     *  sponsoring — "You are Sponsoring <name>" here) and `SellSelectPanel`'s
     *  own `TOKEN_SELECT_DROP_DOWN` chevron (the pay-token pill below it).
     *  Omit either for an inert target, same "no picker yet" default as
     *  every other optional click prop in this package.
     *
     *  2026-09-16, corrected on live report ("web page works, extension does
     *  not... on selecting the down chevron on 'New Recipient Staked
     *  spCoins' we get nothing") — the doc comment here used to claim that
     *  row's own pill was deliberately inert (StakingStatusPanel "always
     *  shows the recipient's already-fixed spCoin stake, not a free token
     *  choice"). That was wrong: the real SponsorPanel.tsx passes
     *  `StakingStatusPanel` the SAME `panelId={SP.RECIPIENT_SELECT_PANEL}`
     *  as `RecipientSelectPanel` gets — both rows open the identical
     *  recipient picker, confirmed live in the web app's own debug harness
     *  (screenshot showed "Select Recipient" opening from THIS row's
     *  chevron). This prop now drives both rows' click instead of just the
     *  header's. */
    onRecipientClick?: () => void;
    onPayTokenClick?: (e: React.SyntheticEvent) => void;
    onStakedRecipientIconClick?: () => void;
}
export default function SponsorshipPanel({ recipientName, payTokenSymbol, payTokenAddress, payTokenIcon, stakedTokenSymbol, stakedTokenAddress, stakedTokenIcon, onSubmit, submitLabel, onRecipientClick, onPayTokenClick, onStakedRecipientIconClick, }: SponsorshipPanelProps): import("react/jsx-runtime").JSX.Element;
