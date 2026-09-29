// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SponsorshipPanel.tsx
// Portable shell for SPONSORSHIP_PANEL — extracted from the web app's real
// components/views/RadioOverlayPanels/SponsorPanel.tsx (542 ln). The real
// component's non-portable pieces (useSponsorMode, useSellTokenContract/
// useBuyTokenContract/useSellAmount/useBuyAmount, useUniswapV3CombinedQuote,
// getStakedAmountForRecipient/getSponsorRecipientRateKeys, exchangeContext-derived
// network/rpc/decimals reads, stakeAmountStore/stakeRefreshStore, and the on-
// chain stake/un-stake dispatch in lib/spCoin/swap.tsx) all stay in the web-app
// wrapper, resolved there and passed down as opaque slots / plain props — same
// "opaque-slot split" shape as ConfigSlippagePanel / TokenAddressComponent /
// AffiliateFee / AgentHeaderPanel this session.
//
// What moves here: the layout container itself — the PanelGate over
// SPONSORSHIP_PANEL, the outer flex column, the SPONSOR_EXCHANGE_TRADING_PAIR
// gate, the two swapped tokenBlock/recipientBlock slots, and the trailing
// ConnectTradeButton / AffiliateFee / FeeDisclosure slot order — pixel-identical
// to the real web app's structure (see SponsorPanel.tsx's own inline comments
// for the spacing/padding history). The mode-derived recipientOnTop swap and
// the configId conditional both stay in the web wrapper — they're pure data
// decisions, not layout.
//
// An inert fallback path (the original placeholder's "You are Sponsoring"
// header + two TradeAmountRows + submit + Fee Disclosures line) is retained for
// consumers that pass no real child slots — still the extension's sidepanel.ts,
// whose Sponsor tab is driven by the package's own selections state but whose
// child components (RecipientSelectPanel / ConfigSponsorshipPanel /
// SellSelectPanel / StakingStatusPanel / ConnectTradeButton) have not been
// promoted to this package yet. See docs/estimate.txt /
// docs/panelMigrationStatus.txt.
//
// 2026-09-23, on request ("migrate SPONSORSHIP_PANEL to npm") — first real
// migration of this panel. The EXT track (wiring the real child components into
// the extension's Sponsor tab) is deferred — see the 2026-09-22 handoff entry
// for why this panel needs Phase B.2 (real Uniswap quote + stake calls) and
// the 2026-09-23 "What's NOT done" list.

'use client';

import React from 'react';
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import { PANEL_GAP } from '@sponsorcoin/spcoin-common/styles';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';
import PanelGate from './PanelGate';
import TradeAmountRow from './TradeAmountRow';

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

  // --- Inert fallback props: render exactly the original placeholder look for
  // consumers with no real child components (the extension, today). Kept
  // additively — a real caller passing any slot opts out of this fallback.
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
}

export default function SponsorshipPanel({
  recipientSelectPanel,
  configSponsorshipPanel,
  exchangeTradingPair,
  connectTradeButton,
  affiliateFee,
  feeDisclosure,
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
   sponsorAmount,
   onSponsorAmountChange,
   sponsorAmountBusy,
 }: SponsorshipPanelProps) {
  // A real caller passes at least one slot; the extension passes none and
  // falls back to the inert path below.
  const hasRealSlots =
    !!recipientSelectPanel ||
    !!configSponsorshipPanel ||
    !!exchangeTradingPair ||
    !!connectTradeButton ||
    !!affiliateFee ||
    !!feeDisclosure;

  return (
    <PanelGate panel={SP.SPONSORSHIP_PANEL} lazyLoad={false}>
      <div
        id="SPONSORSHIP_PANEL"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: PANEL_GAP,
        }}
      >
        <TabBodyMarker path="SponsorshipPanel.tsx" build={PACKAGE_BUILD} />
        {hasRealSlots ? (
          <>
            {recipientSelectPanel}
            {configSponsorshipPanel}
            {exchangeTradingPair}
            {connectTradeButton}
            {affiliateFee}
            {feeDisclosure}
          </>
        ) : (
          <>
            {/* Inert fallback: the original 2026-09-12 placeholder look, preserved
                verbatim for the extension whose Sponsor tab is still driven from
                package-local selections state with no real child components yet. */}
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
              amount={sponsorAmount}
              onAmountChange={onSponsorAmountChange}
              amountDisabled={sponsorAmountBusy}
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
            <div
              style={{
                textAlign: 'left',
                fontSize: 10,
                color: '#64748b',
                textDecoration: 'underline',
                cursor: 'default',
              }}
            >
              Fee Disclosures
            </div>
          </>
        )}
      </div>
    </PanelGate>
  );
}
