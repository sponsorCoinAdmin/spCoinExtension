// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TradingStationPanel.tsx
// Portable placeholder for TRADING_STATION_PANEL (2026-09-12) — the real
// app version reads live token contracts, wagmi balances, and real
// Uniswap/0x quotes (lib/uniswap/useUniswapV3CombinedQuote.ts,
// lib/0x/hooks/usePriceAPI.ts) — none of which exists in a standalone
// consumer (the extension, today). Same shape (sell row, swap-direction
// button, buy row, submit button), entirely inert. Placeholder, not
// logic, per explicit instruction.
//
// 2026-09-13, on request — TradeAmountRow.tsx grew a real, optional
// interactive surface (typed amount, token pill click, click-to-fill
// balance, slippage cog); this component's own props widen to thread all
// of it through for both rows, additively (every new prop optional,
// defaulting to today's exact inert look) so the extension's sidepanel.ts
// — which passes none of them — keeps rendering unchanged. Built
// specifically so a real, hook-backed caller
// (components/views/TradingStationPanel/SellSelectPanel/
// SellSelectPanelLayoutContainer.tsx / BuySelectPanel/
// BuySelectPanelLayoutContainer.tsx in spcoin-nextjs-front-end) can render
// this exact component fed by real computed values instead of duplicating
// its markup.
//
// 2026-09-13, on request — the sell/arrow/buy composition (and the swap
// arrow's own seam-straddling placement) moved out into its own
// ExchangeTradingPair.tsx, matching the real app's actual component
// boundary: `EXCHANGE_TRADING_PAIR` is its own `<div id="...">` in
// components/views/TradingStationPanel/index.tsx, a sibling of
// CONNECT_TRADE_BUTTON/AFFILIATE_FEE/FEE_DISCLOSURE, not something owned
// by the outer panel wrapper. This file is now just that same shape:
// ExchangeTradingPair + the submit button, with all its own props
// (previously duplicated here) re-exported from ExchangeTradingPairProps
// so nothing about this component's own public API changes.

'use client';

import React from 'react';
import ExchangeTradingPair, { type ExchangeTradingPairProps } from './ExchangeTradingPair';
import { PACKAGE_BUILD } from './packageBuildTag';
import TabBodyMarker from './TabBodyMarker';

export interface TradingStationPanelProps extends ExchangeTradingPairProps {
  onSubmit?: () => void;
  submitLabel?: string;
}

export default function TradingStationPanel({
  onSubmit,
  submitLabel = 'Enter an Amount',
  ...exchangeTradingPairProps
}: TradingStationPanelProps) {
  return (
    // 2026-09-13, on request ("why is EXCHANGE_TRADING_PAIR not having the
    // same button spacing as on the web page?") — `gap` here had been an
    // invented value (10, then 8, then 6 across successive resize passes)
    // never actually tied to anything real. The real app's own gap between
    // EXCHANGE_TRADING_PAIR and its submit button IS a real, deliberate
    // design constant: `TSP_TW.gap` = `gap-1` = 4px
    // (components/views/TradingStationPanel/lib/twSettingConfig.ts) — even
    // UNI_SELECT_PANEL's own submit button explicitly matches it via its
    // own `pt-[4px]` (see that file's comment on its button wrapper).
    // Matched exactly here instead of re-guessing a new invented value.
    <div style={{ boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, padding: 8 }}>
      <TabBodyMarker path="TradingStationPanel.tsx" build={PACKAGE_BUILD} />
      <ExchangeTradingPair {...exchangeTradingPairProps} />
      {/* boxSizing:'border-box' added defensively (no live bug today —
          padding is vertical-only, `width:'100%'` is safe) — same
          width:100%+padding class of bug caught in PanelTitle.tsx earlier
          and in this file's own sibling ExchangeTradingPair.tsx/
          TradeAmountRow.tsx just now; adding it everywhere pre-empts a
          future horizontal-padding edit from silently reintroducing it. */}
      <button
        type="button"
        onClick={onSubmit}
        style={{
          boxSizing: 'border-box',
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
    </div>
  );
}
