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
// CONNECT_TRADE_BUTTON/AFFILIATE_FEE, not something owned
// by the outer panel wrapper. This file is now just that same shape:
// ExchangeTradingPair + the submit button, with all its own props
// (previously duplicated here) re-exported from ExchangeTradingPairProps
// so nothing about this component's own public API changes.
//
// 2026-10-03, on request ("I want a universal fix ... mirror display between the
// web app and the panels") — this is no longer a second, hand-maintained
// composition of the Swap tab. It renders through TradingStationLayout, the same
// component the web app's own index.tsx renders through, so the gate around the
// tab, the order of its children and the gate around each child are defined once.
// What it adds is the portable DEFAULTS for the slots a host may leave empty:
//   - ZERO_X_TRADE_BUTTON: the inert "Enter an Amount" placeholder — the
//     trade/submit button for a host with no live trade logic, inside its own
//     panel-tree gate (an earlier version was an ungated "last-resort fallback",
//     which is why the extension showed a 0x button while the Uniswap engine was
//     the one selected in Config). Its old home — the CONNECT_TRADE_BUTTON
//     slot, a direct child of EXCHANGE_TRADING_PAIR — was removed from the
//     app on the same request, together with its panel-tree node.
//   - The Uniswap section: supplied by ExchangeTradingPair itself (UniSelectPanel).
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { walletColors } from '@sponsorcoin/spcoin-common/styles';
import { ExchangeTradingPair } from '@sponsorcoin/spcoin-panels';
import { TradingStationLayout } from '@sponsorcoin/spcoin-panels';
import { PACKAGE_BUILD } from '@sponsorcoin/spcoin-panels';
import { TabBodyMarker } from '@sponsorcoin/spcoin-panels';
import { ConnectButton, useConnectMode } from '@sponsorcoin/spcoin-panels';
export default function TradingStationPanel({ onSubmit, submitLabel = 'Enter an Amount', affiliateFeeContent, ...exchangeTradingPairProps }) {
    // 2026-10-09: no active account -> the placeholder trade button is a Connect button (ConnectContext in spcoin-panels).
    const { connectMode } = useConnectMode();
    // Placeholder for a host with no live trade logic. Handed to the pair, which
    // wraps it in the ZERO_X_TRADE_BUTTON gate — never rendered ungated. (Was
    // the CONNECT_TRADE_BUTTON slot's default content until that panel was
    // removed 2026-10-05.)
    const placeholderTradeButton = connectMode ? (_jsx(ConnectButton, { id: "SWAP_CONNECT_BUTTON" })) : (_jsx("button", { type: "button", onClick: onSubmit, style: {
            boxSizing: 'border-box',
            width: '100%',
            borderRadius: 8,
            border: 'none',
            background: walletColors.panel,
            color: walletColors.accentSoft,
            fontSize: 12,
            fontWeight: 600,
            padding: '10px 0',
            cursor: onSubmit ? 'pointer' : 'default',
        }, children: submitLabel }));
    return (_jsx(TradingStationLayout, { marker: _jsx(TabBodyMarker, { path: "TradingStationPanel.tsx", build: PACKAGE_BUILD }), pair: _jsx(ExchangeTradingPair, { ...exchangeTradingPairProps, zeroXTradeButtonContent: exchangeTradingPairProps.zeroXTradeButtonContent ?? placeholderTradeButton }), affiliateFee: affiliateFeeContent }));
}
