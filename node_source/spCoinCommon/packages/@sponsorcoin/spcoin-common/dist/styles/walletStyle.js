"use strict";
// File: spCoinCommon/src/styles/walletStyle.ts
//
// Single source of truth for style primitives shared across the Web App
// and the Extension — see docs/npmPanelDisplayIssue.md (parent app repo)
// for the investigation that motivated this file: three panel-body
// components in @sponsorcoin/spcoin-panels each independently hardcoded
// their own `gap: 4`, kept in sync only by comment/convention, not by
// any real shared value. This file exists so a spacing constant is
// defined exactly once and imported everywhere it's used, instead of
// copy-pasted.
//
// Per docs/design/spcoinPackagesDesign.md's standing rule ("no
// extension-specific styling") — every value here must trace to a real,
// deliberate design decision, not be invented in isolation.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SWAP_ARROW_HOVER_COLOR = exports.SWAP_ARROW_IDLE_COLOR = exports.SWAP_ARROW_BORDER = exports.SWAP_ARROW_BG = exports.RADIO_PANEL_BUFFER = exports.PANEL_GAP = void 0;
// 2026-09-22 — deliberately changed from the previously-verified real
// value (4, `gap-1` in Tailwind, matching the real web app's
// TSP_TW.gap) to 2, as an explicit, live test of a tighter panel-body
// spacing — not a relocation of the old value. Both the Web App
// (twSettingConfig.ts's TSP_TW.gap) and the Extension's package
// components now derive from this one constant, so the test applies
// identically to both surfaces at once.
exports.PANEL_GAP = 2;
// 2026-09-22 — WALLET_RADIO_PANELS' own horizontal buffer (left/right
// padding around WalletRadioPanels.tsx's PanelGate, the single shared
// ancestor of every radio panel — Trading Station, Send, Sponsor,
// Rewards, Config, Account, Token, Wallet Config, Message, and every
// remote list — see docs/npmPanelDisplayIssue.md). That wrapper was
// deliberately left at 0 horizontal buffer earlier the same day, to
// match the Extension's own equivalent layer at the time. This is a
// real, deliberate design decision to give it an explicit 6px buffer
// instead — not yet wired into the Extension side, which currently has
// no WALLET_RADIO_PANELS-equivalent wrapper at all (see
// docs/npmPanelDisplayIssue.md's "Reframing" section on why the two
// apps don't share this layer yet).
exports.RADIO_PANEL_BUFFER = 6;
// 2026-09-22 — SWAP_ARROW_BUTTON's own real colors (the pay/receive-row
// swap-direction toggle). Previously only lived as Tailwind arbitrary-value
// classes (`bg-[#3a4157]`/`border-[#0E111B]`/`text-[#5F6783]`) inside
// BuySellSwapArrowButton.tsx — real, silent regression found live
// (2026-09-22): those exact class strings appear nowhere under this repo's
// own `components/`/`lib`/`app` tree, which is all Tailwind's `content`
// config actually scans, so no CSS was ever generated for them in the Web
// App once anything forced a full rebuild (a `.next` clear, run routinely
// as part of this project's own standing package-verification cycle) —
// the button silently rendered with no real background/border/text color
// at all. The Extension has never run Tailwind in the first place (see
// docs/handoff.md's AssetSelectDropDown entry), so it was never protected
// either. These values are the real, already-correct ones — cross-checked
// against ExchangeTradingPair.tsx's own separate placeholder SwapArrowButton,
// which already used them as plain inline styles (unaffected by either gap)
// and was the one surviving source of truth for what "correct" looks like.
// BuySellSwapArrowButton.tsx now sets both the Tailwind classes AND these
// same values as real inline styles, so it renders identically regardless
// of whether Tailwind ever processes this file (belt-and-suspenders, not
// a redundant no-op — see that file's own comment).
exports.SWAP_ARROW_BG = '#3a4157';
exports.SWAP_ARROW_BORDER = '#0E111B';
exports.SWAP_ARROW_IDLE_COLOR = '#5F6783';
exports.SWAP_ARROW_HOVER_COLOR = '#ffffff';
