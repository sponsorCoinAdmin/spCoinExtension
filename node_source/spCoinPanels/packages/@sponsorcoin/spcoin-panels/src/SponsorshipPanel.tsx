// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SponsorshipPanel.tsx
// Portable placeholder for SPONSORSHIP_PANEL (2026-09-12) — the real app
// version (components/views/RadioOverlayPanels/SponsorPanel.tsx) reads a
// live recipient/sponsor account, a real Uniswap V3 quote
// (useUniswapV3CombinedQuote), and posts a real on-chain stake
// (lib/spCoin/swap.tsx's doSponsorStake) — none of which exists in a
// standalone consumer (the extension, today). Same shape ("You are
// Sponsoring <recipient>" header, pay row, staked-amount row, submit
// button, fee disclosures link), entirely inert. Placeholder, not logic,
// per explicit instruction.

'use client';

import React from 'react';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';
import TradeAmountRow from './TradeAmountRow';

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
  // 2026-09-16, on live report/correction ("that was not where the account
  // panel should be opened... it should have been opened... in 'New
  // Recipient Staked spCoins'... when the avatar.png was clicked") — this
  // row's own icon (once a real recipient is picked) opens that recipient's
  // details, separate from onRecipientClick above (which still opens the
  // picker via the rest of the pill). Omit for no separate icon action.
  onStakedRecipientIconClick?: () => void;
}

export default function SponsorshipPanel({
  recipientName = 'Recipient Name not Specified',
  payTokenSymbol,
  payTokenAddress,
  payTokenIcon,
  stakedTokenSymbol,
  stakedTokenAddress,
  stakedTokenIcon,
  onSubmit,
  submitLabel = 'Enter an Amount',
  onRecipientClick,
  onPayTokenClick,
  onStakedRecipientIconClick,
}: SponsorshipPanelProps) {
  return (
    // 2026-09-14 — same fix as SendTabPanel.tsx's own comment: gap:8/
    // padding:12 was an invented value never tied to anything real. The
    // real app's SponsorPanel.tsx container uses TSP_TW.gap (`gap-1`, 4px)
    // — the same constant TradingStationPanel.tsx (Swap) matches — so this
    // now uses that file's own gap:4/padding:8 instead.
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, padding: 8 }}>
      <TabBodyMarker path="SponsorshipPanel.tsx" build={PACKAGE_BUILD} />
      <div
        onClick={onRecipientClick}
        style={{ textAlign: 'center', cursor: onRecipientClick ? 'pointer' : 'default' }}
      >
        <div style={{ fontSize: 10, color: '#94a3b8' }}>You are Sponsoring</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>{recipientName}</div>
      </div>
      <TradeAmountRow
        label="You Exactly Pay:"
        tokenIcon={payTokenIcon}
        tokenSymbol={payTokenSymbol}
        tokenAddress={payTokenAddress}
        balanceText="Balance: 0"
        onTokenPillClick={onPayTokenClick}
      />
      <TradeAmountRow
        label="New Recipient Staked spCoins"
        tokenIcon={stakedTokenIcon}
        tokenSymbol={stakedTokenSymbol}
        tokenAddress={stakedTokenAddress}
        balanceText="Sponsor Staked spCoins: 0"
        onTokenPillClick={onRecipientClick}
        onIconClick={onStakedRecipientIconClick}
      />
      <button
        type="button"
        onClick={onSubmit}
        style={{
          width: '100%',
          borderRadius: 8,
          border: 'none',
          background: '#243056',
          color: '#7d8ec9',
          fontSize: 12,
          fontWeight: 600,
          padding: '10px 0',
          cursor: onSubmit ? 'pointer' : 'default',
        }}
      >
        {submitLabel}
      </button>
      {/* 2026-09-14, on request — was textAlign: 'center'; the real app's
          own FeeDisclosure.tsx (components/views/TradingStationPanel/
          FeeDisclosure) is left-justified, not centered — this placeholder
          had it backwards from the start. Font size was already a
          reasonable match (10px here vs. the real component's now-11px). */}
      <div style={{ textAlign: 'left', fontSize: 10, color: '#64748b', textDecoration: 'underline', cursor: 'default' }}>
        Fee Disclosures
      </div>
    </div>
  );
}
