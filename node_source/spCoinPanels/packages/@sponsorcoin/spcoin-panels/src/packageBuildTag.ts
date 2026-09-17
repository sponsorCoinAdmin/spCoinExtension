// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/packageBuildTag.ts
// 2026-09-14, on request ("the marker is to be updated for every deploy in
// the extension package") — single source for the small on-screen build
// marker shown on MeritWallet.tsx AND every one of its tab-panel bodies
// (TradingStationPanel/SendTabPanel/SponsorshipPanel/
// ManageSponsorshipsPanel/WalletConfigPanel). Bump this ONE number every
// time this package is rebuilt and re-synced into spCoinExtension's own
// node_source copy (the standing sync rule — see docs/handoff.md's own
// "node_source sync mechanics" entries) — every marker updates together
// from one edit, nobody has to remember to touch six files by hand. Same
// "manually bumped, one reliable freshness signal" convention already
// established for spCoinExtension/sidepanel.html's own #build-tag, just
// scoped to the package's own components instead of the whole page.
export const PACKAGE_BUILD = 44;

// 2026-09-15, on request ("set an internal flag to remove the build text
// in the file") — a single switch for whether TabBodyMarker.tsx's own
// "⟨path · build N⟩" corner annotation, and MeritWallet.tsx's own matching
// bottom-left marker, render at all. Both read this directly (TabBodyMarker
// checks it internally and renders null when off, so none of its 5 callers
// need editing). Left `true` (on request, right after adding this) — the
// mechanism to flip it off for a "clean" build exists, it's just not the
// current default.
// Deliberately NOT touching spCoinExtension/sidepanel.html's own separate
// #build-tag corner label — that one confirms which literal PAGE build is
// loaded after a reload (its own doc comment: check it before evaluating
// anything else), a different purpose from "is this genuinely the same
// component as the web app's."
export const SHOW_BUILD_MARKERS = true;
