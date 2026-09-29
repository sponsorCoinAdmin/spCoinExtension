// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritTitleComponent.tsx
// Portable copy of components/views/Headers/MeritTitleComponent.tsx
// (2026-09-11, "Pages Grey header bar" slice — see
// docs/design/extensionPlan.md). Three real couplings found and removed,
// same "injected prop, not hardcoded" pattern already proven on
// AssetSelectDropDown.tsx:
//
// 1. `next/image` — doesn't resolve outside a Next.js build. Swapped for a
//    plain <img>.
// 2. A hardcoded `usePanelTree().openPanel(MERIT_INFO_PANEL, ...)` click
//    handler — real ExchangeContext/panel-tree coupling. Replaced with an
//    optional `onTitleClick` prop: the app passes its own MERIT_INFO_PANEL
//    opener in; a consumer with no info panel yet (the extension, today)
//    omits it and gets an inert, non-interactive title instead of a dead
//    button.
// 3. Tailwind utility classes (2026-09-11, on request — "no tailwind is
//    too bad" for a component library every consumer would otherwise have
//    to run a PostCSS/Tailwind pipeline just to render correctly). Rewritten
//    as plain inline styles — zero build tooling required by any consumer,
//    Next.js or Vite alike. Only the app's own non-portable
//    components/views/Headers/MeritTitleComponent.tsx keeps its original
//    Tailwind classes; this file is a deliberate visual match, not a shared
//    source file.
'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const DEFAULT_BADGE_SRC = '/assets/miscellaneous/meritWallet.png?v=22';
const wrapperStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    // 2026-09-22, real fix confirmed via the orange debug backgrounds (see
    // each leftSlot call site's own matching one) — this span is
    // inline-flex, but its parent (WalletHeader.tsx's <h2>) is NOT a flex
    // container, so it participates in normal inline text layout and gets
    // the browser's default vertical-align: baseline, leaving a small
    // descender gap below it. WalletHeader.tsx's row aligns the <h2>'s own
    // box to the row bottom (flex-end), but that gap means the VISIBLE
    // content stops short of it — exactly the "title's bottom sits higher
    // than the network pill's bottom" the orange boxes showed.
    // NetworkSelectDropDown's own leftSlot wrapper doesn't have this
    // problem: it sits inside an already-flex div, not inline text layout.
    // vertical-align: bottom removes the gap by aligning this inline box to
    // the bottom of its line instead of its baseline.
    verticalAlign: 'bottom',
};
const buttonStyle = {
    ...wrapperStyle,
    pointerEvents: 'auto',
    appearance: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: '#ffffff',
    font: 'inherit',
};
export default function MeritTitleComponent({ badgeSrc = DEFAULT_BADGE_SRC, onTitleClick, showBadge = true, }) {
    const content = (_jsxs(_Fragment, { children: [showBadge && (_jsx("img", { src: badgeSrc, alt: "", height: 26, style: { height: 26, width: 'auto', flexShrink: 0, objectFit: 'contain' } })), "Merit Wallet"] }));
    if (!onTitleClick) {
        // Inert path: matches WalletHeader's own pointer-events-none title
        // slot by default — no dead click affordance shown.
        return _jsx("span", { style: wrapperStyle, children: content });
    }
    return (_jsx("button", { type: "button", onClick: onTitleClick, style: buttonStyle, "aria-label": "About Merit Wallet", title: "About Merit Wallet", children: content }));
}
