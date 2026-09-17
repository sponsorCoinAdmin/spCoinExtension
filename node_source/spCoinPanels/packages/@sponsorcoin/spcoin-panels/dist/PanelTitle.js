// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/PanelTitle.tsx
// Portable placeholder for PANEL_TITLE (2026-09-12) — the real app version
// (components/views/Headers/ActiveWalletPanelTitle.tsx, via PopupHeader.tsx)
// reads a live `useActiveWalletPanelTitle()` computed title and calls the
// real panel-tree's `closePanel`/a caller-supplied menu handler — no panel
// tree exists in a standalone consumer (the extension, today) to compute a
// title from or navigate with. Same shape (back button, centered title,
// menu/hamburger button), entirely inert unless the caller wires the two
// callbacks — same "presentation only, no sync yet" scope every other
// extension-bound component here follows. Inline styles (no Tailwind),
// same reasoning as every sibling component.
//
// Sizing scaled down from the real app's 44px (h-11 w-11) buttons/20px
// title to this panel's own established compact scale (see WalletHeader.tsx's
// 30px buttons) rather than copying the real, popup-sized numbers verbatim.
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PanelTitle;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
function IconButton({ onClick, ariaLabel, active, children, }) {
    const [hovered, setHovered] = (0, react_1.useState)(false);
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClick, "aria-label": ariaLabel, title: ariaLabel, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), style: {
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
function PanelTitle({ title = 'Trading Station', onBackClick, onMenuClick, menuOpen, }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
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
            paddingLeft: 10,
            paddingRight: 8,
            paddingTop: 3,
            paddingBottom: 3,
        }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexShrink: 0, alignItems: 'center' }, children: (0, jsx_runtime_1.jsx)(IconButton, { onClick: onBackClick, ariaLabel: "Go back", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { size: 15, color: "#91a5ff", strokeWidth: 1.75 }) }) }), (0, jsx_runtime_1.jsx)("h2", { style: {
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
                }, children: title }), (0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexShrink: 0, alignItems: 'center' }, children: (0, jsx_runtime_1.jsx)(IconButton, { onClick: onMenuClick, ariaLabel: "Open wallet menu", active: menuOpen, children: (0, jsx_runtime_1.jsx)(lucide_react_1.Menu, { size: 15, color: "#91a5ff", strokeWidth: 1.75 }) }) })] }));
}
