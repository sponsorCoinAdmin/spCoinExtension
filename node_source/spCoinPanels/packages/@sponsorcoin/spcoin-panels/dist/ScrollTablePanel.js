// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ScrollTablePanel.tsx
// Ported from the real app's components/views/RadioOverlayPanels/
// ScrollTablePanel.tsx (2026-09-16) — that's the real, single-source-of-
// truth "fixed header + scrollable middle [+ fixed footer]" shell every
// real list screen (DataListSelect, GroupedAccountList, networks.tsx)
// already shares; the portable AssetListTable/AccountListCard/
// NetworkListTable each hardcoded their own separate header/footer/card
// chrome instead of using it — pure duplication with no real app logic in
// this component itself (plain props, no ExchangeContext/wagmi), so it
// moves here and both real and portable list components use this one copy.
//
// Rewritten from Tailwind classes to inline styles — same reasoning as
// every other file in this package (see WalletHeader.tsx's own doc
// comment): a consumer with no Tailwind pipeline (spCoinExtension,
// confirmed this session to have zero Tailwind config) would silently get
// an unstyled/unsized shell otherwise, the exact bug class this session's
// AssetSelectDropDown icon-sizing fix just caught. `bufferPadding` (a real
// CSS padding shorthand) replaces the real component's own
// `bufferClassName` Tailwind-class prop for the same reason.
//
// One real, accepted gap: the real component's `scrollbar-hide` also hides
// the webkit scrollbar via `[&::-webkit-scrollbar]:hidden`, which needs an
// actual stylesheet rule (a pseudo-element isn't stylable via inline
// style) — this package injects no <style> tags anywhere, so a Chrome/
// Safari consumer with no Tailwind (the extension) will show a plain
// visible scrollbar here. `scrollbarWidth`/`msOverflowStyle` (real inline-
// stylable properties) are still applied, so Firefox/legacy Edge still
// hide it. Cosmetic only, not a functional gap — not worth a bigger fix.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function ScrollTablePanel({ id, header, footer, style, bufferPadding = '3px 12px', bodyRef, bodyStyle, children, }) {
    return (_jsx("div", { style: { display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden', padding: bufferPadding }, children: _jsxs("div", { id: id, style: { display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden', ...style }, children: [header, _jsx("div", { ref: bodyRef, style: {
                        minHeight: 0,
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'auto',
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none',
                        ...bodyStyle,
                    }, children: children }), footer] }) }));
}
