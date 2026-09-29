// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ExchangeTradingPair.tsx
// Portable placeholder for EXCHANGE_TRADING_PAIR (2026-09-13) — the real
// app version (components/views/TradingStationPanel/index.tsx) renders a
// `<div id="EXCHANGE_TRADING_PAIR">` containing exactly SellSelectPanel +
// BuySellSwapArrowButton in one slot and BuySelectPanel (+ConfigSlippagePanel/
// UniSelectPanel, both out of scope here) in a second slot, `gap-0` between
// the two — a real, distinct composition boundary separate from
// TRADING_STATION_PANEL's other children (CONNECT_TRADE_BUTTON,
// AFFILIATE_FEE, FEE_DISCLOSURE). Split out of TradingStationPanel.tsx (on
// request) so this package's own component boundary matches the real one:
// this file owns the sell/arrow/buy composition AND the swap-arrow's
// straddle-the-seam placement specifically, exactly what
// EXCHANGE_TRADING_PAIR owns in the real app — not a generic layout detail
// buried in the larger panel wrapper.

'use client';

import React, { useState } from 'react';
import { ArrowDown } from 'lucide-react';
import {
  SWAP_ARROW_BG,
  SWAP_ARROW_BORDER,
  SWAP_ARROW_IDLE_COLOR,
  SWAP_ARROW_HOVER_COLOR,
} from '@sponsorcoin/spcoin-common/styles';
import TradeAmountRow from './TradeAmountRow';

export interface ExchangeTradingPairProps {
  sellLabel?: string;
  sellAmount?: string;
  onSellAmountChange?: (value: string) => void;
  sellAmountDisabled?: boolean;
  sellSymbol?: string;
  sellAddress?: string;
  sellIcon?: React.ReactNode;
  onSellTokenClick?: (e: React.SyntheticEvent) => void;
  sellBalanceText?: string;
  sellBalanceClickable?: boolean;
  onSellBalanceClick?: () => void;

  buyLabel?: string;
  buyAmount?: string;
  onBuyAmountChange?: (value: string) => void;
  buyAmountDisabled?: boolean;
  buySymbol?: string;
  buyAddress?: string;
  buyIcon?: React.ReactNode;
  onBuyTokenClick?: (e: React.SyntheticEvent) => void;
  buyBalanceText?: string;
  /** Slippage-settings cog — real app shows this on the buy row only
   *  (SlippageComponent.tsx's `isBuy` gating on the cog). */
  onCogClick?: () => void;

  onSwapDirection?: () => void;

  /** 2026-09-24, on request — the real app's buy slot also stacks
   *  ConfigSlippagePanel (above the buy row) and UniSelectPanel (below
   *  it) in the same wrapper the buy TradeAmountRow lives in. Neither
   *  belongs to this package (ExchangeContext-bound, not portable), so
   *  these are opaque slots, not new owned content — a caller supplies
   *  its own gap/visibility wrapping (see the real app's
   *  ExchangeTradingPair.tsx), this component just places them in the
   *  right position relative to the buy row. Both optional — a caller
   *  with nothing extra (e.g. the extension's own inert MeritWallet.tsx
   *  usage) renders identically to before these props existed. */
  buyPrefixContent?: React.ReactNode;
  buySuffixContent?: React.ReactNode;

  /** 2026-09-25, on request (real regression report) — SELL_SELECT_PANEL
   *  and ZERO_X_SELECT_PANEL are independently-visible panel-tree nodes in
   *  the real app (e.g. the 0x quote engine's own checkbox hides the buy
   *  row, sell stays up) — this component previously had no way to
   *  express "hide this row," always rendering both. Default true
   *  (backward compatible — the extension's own inert MeritWallet.tsx
   *  usage never passes these). false hides only the TradeAmountRow
   *  itself; the wrapper div (and, for sell, the swap arrow, which is
   *  gated on this component's own visibility, not either row's) stays,
   *  matching the real app's own per-row `if (!visible) return null`. */
  sellVisible?: boolean;
  buyVisible?: boolean;

  /** 2026-09-25, on request — SWAP_ARROW_BUTTON (26) is a real, distinct
   *  panel-tree node, never wired to any visibility check here (it always
   *  rendered unconditionally, in both this component's pre-consolidation
   *  self-composed form and this one). Default true, backward compatible. */
  arrowVisible?: boolean;
}

// 2026-09-12 fix, on request — this used to diverge from the real app's
// own SWAP_ARROW_BUTTON (components/views/TradingStationPanel/
// SwapArrowButton/index.tsx) in every visual detail: a different lucide
// icon (ArrowDownUp instead of ArrowDown), a smaller icon, a fully round
// pill instead of a rounded square, and three colors that were all just
// approximations instead of the real app's exact ones. Matched exactly
// now — same icon+size, same border radius/width/color, same idle
// background/icon color, same hover-to-white transition — everything
// this component doesn't already share by construction (this is a
// portable placeholder with its own inert onSwapDirection, not the real
// app's live swap-direction logic) stays as-is.
//
// 2026-09-13 fix, on request, reversing the "positioning not matched"
// call originally here: the real button is absolutely anchored — `absolute
// bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-[9999]`, a child of
// the SELL row's own `position: relative` wrapper, sitting exactly half
// on/half off that row's bottom edge, straddling the seam with the row
// below it (the real EXCHANGE_TRADING_PAIR's `gap-0` between its two slots
// makes that seam a hard edge for the button to straddle). Replicated in
// this file's own default export below: the sell row's wrapper gets
// `position: relative`, this button is an absolutely-positioned sibling of
// it instead of its own flex row between the two rows, and the sell/buy
// rows sit flush (no gap) so the seam lines up under it.
function SwapArrowButton({ onClick }: { onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Swap direction"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        // 2026-09-13 fix, found during the same box-sizing audit as
        // TradeAmountRow.tsx: a fixed height/width + border with no
        // boxSizing:'border-box' rendered this larger than declared
        // (content-box adds border on top of the declared size).
        //
        // 2026-09-13, on request ("1 to 1 ratio... fix the app web size") —
        // scaled down along with TradeAmountRow.tsx's own resize (see that
        // file's header, point 6): real 24x24/3px-border shrunk to
        // 18x18/2px so it still reads as sitting on the seam between rows
        // at the new, smaller row height, instead of looking oversized
        // relative to the shrunk rows around it.
        // 2026-09-13, on request ("shrink everything... by 20% more") —
        // shrunk again to 14x14 (see TradeAmountRow.tsx's own header,
        // point 7, for the full pass). Border kept at 2px rather than
        // scaled further — same reasoning as that file's fonts not
        // shrinking in lockstep with padding: a border thinner than 2px
        // starts looking like an anti-aliasing artifact, not a real edge.
        boxSizing: 'border-box',
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translate(-50%, 50%)',
        zIndex: 10,
        display: 'flex',
        height: 14,
        width: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 5,
        border: `2px solid ${SWAP_ARROW_BORDER}`,
        background: SWAP_ARROW_BG,
        color: hovered ? SWAP_ARROW_HOVER_COLOR : SWAP_ARROW_IDLE_COLOR,
        transition: 'color 300ms',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <ArrowDown size={10} />
    </button>
  );
}

export default function ExchangeTradingPair({
  sellLabel = 'You Exactly Pay:',
  sellAmount,
  onSellAmountChange,
  sellAmountDisabled,
  sellSymbol,
  sellAddress,
  sellIcon,
  onSellTokenClick,
  sellBalanceText = 'Balance: 0',
  sellBalanceClickable,
  onSellBalanceClick,

  buyLabel = 'You Receive:',
  buyAmount,
  onBuyAmountChange,
  buyAmountDisabled,
  buySymbol,
  buyAddress,
  buyIcon,
  onBuyTokenClick,
  buyBalanceText = 'Balance: 0',
  onCogClick,

  onSwapDirection,
  buyPrefixContent,
  buySuffixContent,
  sellVisible = true,
  buyVisible = true,
  arrowVisible = true,
}: ExchangeTradingPairProps) {
  return (
    // 2026-09-12 fix, on request — "You Pay"/"You Receive" were this
    // package's own invented labels; the real app's default wording
    // (SlippageComponent.tsx's own sellText/buyText defaults, `plain`
    // branch: isSell -> "You Exactly ${sellText}:"`, else -> `${buyText}:`)
    // is "You Exactly Pay:" / "You Receive:". Matched verbatim as the
    // default — a real caller overrides via `sellLabel`/`buyLabel` with
    // the live, trade-direction-dependent variant (" ± N% slippage",
    // "(Uniswap V3)") it actually computes.
    //
    // 2026-09-13, on request — sell+buy rows sit in a zero-gap group
    // (matching the real EXCHANGE_TRADING_PAIR's own `gap-0` between its
    // sell/buy slots), with the arrow button an absolutely-positioned
    // sibling of the sell row instead of its own spaced-out flex row —
    // see SwapArrowButton's own comment above for why. The wrapper must
    // NOT clip (no overflow:hidden) or the button's bottom half would be
    // cut off by the sell row's own rounded corners.
    <div id="EXCHANGE_TRADING_PAIR" style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ boxSizing: 'border-box', position: 'relative' }}>
        {sellVisible && (
          <TradeAmountRow
            label={sellLabel}
            tokenIcon={sellIcon}
            tokenSymbol={sellSymbol}
            tokenAddress={sellAddress}
            onTokenPillClick={onSellTokenClick}
            amount={sellAmount}
            onAmountChange={onSellAmountChange}
            amountDisabled={sellAmountDisabled}
            balanceText={sellBalanceText}
            balanceClickable={sellBalanceClickable}
            onBalanceClick={onSellBalanceClick}
          />
        )}
        {arrowVisible && <SwapArrowButton onClick={onSwapDirection} />}
      </div>
      {/* 2026-09-13 fix — re-verified directly against the real
          TradingStationPanel/index.tsx: the buy slot wrapper there is
          `flex flex-col gap-1 pt-[4px]`, not flush against the sell slot
          (its own comment: "pt-[4px] matches gap-1 so sell→slippage gap
          equals slippage→buy gap"). This wrapper was missing entirely —
          the sell and buy rows were rendering fully flush with zero space,
          not matching the real, slightly-separated look. */}
      <div style={{ boxSizing: 'border-box', paddingTop: 2 }}>
        {buyPrefixContent}
        {buyVisible && (
          <TradeAmountRow
            label={buyLabel}
            onCogClick={onCogClick}
            tokenIcon={buyIcon}
            tokenSymbol={buySymbol}
            tokenAddress={buyAddress}
            onTokenPillClick={onBuyTokenClick}
            amount={buyAmount}
            onAmountChange={onBuyAmountChange}
            amountDisabled={buyAmountDisabled}
            balanceText={buyBalanceText}
          />
        )}
        {buySuffixContent}
      </div>
    </div>
  );
}
