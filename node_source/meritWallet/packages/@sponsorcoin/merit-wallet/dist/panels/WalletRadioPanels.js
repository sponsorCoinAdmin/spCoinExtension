// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/WalletRadioPanels.tsx
//
// 2026-09-22 — shared gate for WALLET_RADIO_PANELS, the single ancestor
// every radio panel (Trading Station, Send, Sponsor, Rewards, Config,
// Account, Token, Wallet Config, Message, every remote list) sits under
// on both the Web App and the Extension — see docs/npmPanelDisplayIssue.md
// for the investigation that motivated pulling this out as real shared
// code instead of two independently-hand-synced copies.
//
// Gated via this package's own PanelGate (bound to the real, shared
// @sponsorcoin/spcoin-exchange-engine — see that file's own "Path A"
// header comment), so a consumer's WALLET_RADIO_PANELS visibility reads
// from the literal same code the Web App's own equivalent already used,
// not a second implementation. No @/-aliased imports, no Tailwind
// dependency — RADIO_PANEL_BUFFER applied via inline style
// (@sponsorcoin/spcoin-common/styles), same reasoning as every other
// dynamic value in this package: a Tailwind class built from a JS
// constant has no guarantee of ever compiling to real CSS (confirmed,
// the hard way, on the Web App side — see that same doc).
//
// Deliberately scoped to JUST the gate + RADIO_PANEL_BUFFER's horizontal
// padding — NOT flex/scroll sizing. The two real consumers wrap this
// differently for that, and neither wrapping is wrong, just structurally
// different: the Web App's own `components/views/Headers/
// WalletRadioPanels.tsx` (a thin wrapper around this component) owns its
// own scrollbar-hide/flex-1/overflow-y-auto shell, because its own
// `MenuTabHeaderBar.tsx` is a bare Fragment with no shell of its own.
// This package's own `MenuTabHeaderBar.tsx` already wraps its `children`
// in exactly that same kind of scroll box internally — a second one here
// would just be redundant nesting. Trying to force both apps onto one
// identical DOM shape here would mean changing one of the two apps'
// already-working, unrelated layout structure just to make this one
// piece look more "shared" than it actually needs to be.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { RADIO_PANEL_BUFFER } from '@sponsorcoin/spcoin-common/styles';
import { PanelGate } from '@sponsorcoin/spcoin-panels';
// 2026-09-30 — this panel's own internal bottom buffer (distinct from
// PANEL_GAP, the 2px buffer BETWEEN panels used elsewhere in this
// package). Corrected same day: first set to PANEL_GAP (2px) on a live
// report that actually meant this panel specifically, then explicitly
// raised to 4px once the reporter clarified — e.g. the spacing from
// UNISWAP_TRADE_BUTTON down to WALLET_RADIO_PANELS' own bottom edge
// should read as 4px, not 2px.
const WALLET_RADIO_PANELS_BOTTOM_BUFFER = 4;
export default function WalletRadioPanels({ children, overlayHost }) {
    return (_jsx(PanelGate, { panel: SP_COIN_DISPLAY.WALLET_RADIO_PANELS, children: _jsx("div", { style: {
                boxSizing: 'border-box',
                paddingLeft: RADIO_PANEL_BUFFER,
                paddingRight: RADIO_PANEL_BUFFER,
                paddingBottom: WALLET_RADIO_PANELS_BOTTOM_BUFFER,
            }, children: overlayHost ?? children }) }));
}
