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
import { panelTitleStyle } from '@sponsorcoin/spcoin-common/styles';
import { useState } from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
// IconButton's own width (see IconButton below) — the spacer must match it or
// hiding one side would shift the centered title.
function IconButton({ onClick, ariaLabel, active, children, }) {
    const [hovered, setHovered] = useState(false);
    return (_jsx("button", { type: "button", onClick: onClick, "aria-label": ariaLabel, title: ariaLabel, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), style: panelTitleStyle.iconButton({ active: !!active, hovered, clickable: !!onClick }), children: children }));
}
export default function PanelTitle({ title = 'Trading Station', onBackClick, onMenuClick, menuOpen, hideBackButton = false, hideMenuButton = false, }) {
    return (_jsxs("div", { style: panelTitleStyle.row, children: [_jsx("div", { style: panelTitleStyle.side(hideBackButton), children: !hideBackButton && (_jsx(IconButton, { onClick: onBackClick, ariaLabel: "Go back", children: _jsx(ArrowLeft, { ...panelTitleStyle.icon }) })) }), _jsx("h2", { style: panelTitleStyle.title, children: title }), _jsx("div", { style: panelTitleStyle.side(hideMenuButton), children: !hideMenuButton && (_jsx(IconButton, { onClick: onMenuClick, ariaLabel: "Open wallet menu", active: menuOpen, children: _jsx(Menu, { ...panelTitleStyle.icon }) })) })] }));
}
