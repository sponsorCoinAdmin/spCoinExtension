// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/PanelTitle.tsx
// Portable shell for PANEL_TITLE (2026-09-12, reworked 2026-09-22 — see
// WalletHeader.tsx's own "opaque slot" precedent for the pattern this
// follows). Originally an inert placeholder (no panel tree existed in a
// standalone consumer to navigate with); its prop surface (title/
// onBackClick/onMenuClick/menuOpen) turned out to already fit the web
// app's own real usage exactly — a live `useActiveWalletPanelTitle()`
// computed title and a plain `() => closePanel(...)` callback for the
// back button — so the web app's own separate copy
// (components/views/PopupHeader.tsx, via ActiveWalletPanelTitle.tsx) was
// retired entirely in favor of this one file. Real back-button behavior
// still differs between the two apps (the web app's closePanel(...) is a
// single generic call into the shared panel-tree engine covering every
// "go back" case; the package's own MeritWallet.tsx still hand-rolls its
// own local 4-way branch) — that's each caller's own callback, not
// something this shell needs to know about. Inline styles (no Tailwind),
// same reasoning as every sibling component.
//
// Sizing scaled down from the real app's 44px (h-11 w-11) buttons/20px
// title to this panel's own established compact scale (see WalletHeader.tsx's
// 30px buttons) rather than copying the real, popup-sized numbers verbatim.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
function IconButton({ onClick, ariaLabel, active, children, }) {
    const [hovered, setHovered] = useState(false);
    return (_jsx("button", { type: "button", onClick: onClick, "aria-label": ariaLabel, title: ariaLabel, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), style: {
            display: 'flex',
            height: 28,
            width: 28,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            appearance: 'none',
            border: 'none',
            borderRadius: '9999px',
            background: active || hovered ? '#3c487a' : '#303b68',
            cursor: onClick ? 'pointer' : 'default',
        }, children: children }));
}
export default function PanelTitle({ title = 'Trading Station', onBackClick, onMenuClick, menuOpen, }) {
    return (_jsxs("div", { style: {
            display: 'flex',
            width: '100%',
            // 2026-09-12 fix: this row is the only header in the package that
            // pairs an explicit `width: '100%'` with its own left/right
            // padding — WalletHeader/WalletAccountHeader/AgentHeaderPanel's
            // outer containers all leave width unset (a block box's default
            // `auto` width already solves for content-width = container
            // width minus padding, so it never overflows). With `width` set
            // explicitly instead of `auto`, the default `content-box` sizing
            // adds paddingLeft+paddingRight ON TOP of that 100%, so the row's
            // actual border-box was 100% + 18px wide — 18px of it (mostly the
            // menu button, the rightmost flex child) spilling past the
            // panel's right edge, clipped by an ancestor's overflow:hidden.
            // Invisible at full size in a wide panel; unmissable once the
            // whole panel got scaled down and that fixed 18px became a much
            // bigger fraction of a much smaller menu button (reported against
            // the Chrome extension's narrow side panel). border-box makes
            // padding count toward the 100% instead of adding to it, the
            // standard fix for this exact box-sizing pitfall.
            boxSizing: 'border-box',
            userSelect: 'none',
            alignItems: 'center',
            gap: 6,
            borderBottom: '1px solid #21273a',
            // 2026-09-22, on direct request — 6px (was 10/8), matching the two
            // header rows' own canonical left/right buffer (WalletHeader.tsx/
            // WalletAccountHeader.tsx) for one continuous buffer top to
            // bottom. Also the point this component became the web app's own
            // real PANEL_TITLE too (see components/views/Headers/
            // ActiveWalletPanelTitle.tsx's own header comment) — both apps
            // now render through this one file.
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 3,
            paddingBottom: 3,
        }, children: [_jsx("div", { style: { display: 'flex', flexShrink: 0, alignItems: 'center' }, children: _jsx(IconButton, { onClick: onBackClick, ariaLabel: "Go back", children: _jsx(ArrowLeft, { size: 15, color: "#91a5ff", strokeWidth: 1.75 }) }) }), _jsx("h2", { style: {
                    pointerEvents: 'none',
                    margin: 0,
                    minWidth: 0,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: '#ffffff',
                }, children: title }), _jsx("div", { style: { display: 'flex', flexShrink: 0, alignItems: 'center' }, children: _jsx(IconButton, { onClick: onMenuClick, ariaLabel: "Open wallet menu", active: menuOpen, children: _jsx(Menu, { size: 15, color: "#91a5ff", strokeWidth: 1.75 }) }) })] }));
}
