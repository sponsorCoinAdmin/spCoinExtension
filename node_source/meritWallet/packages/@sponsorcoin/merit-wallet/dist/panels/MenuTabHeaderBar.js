// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MenuTabHeaderBar.tsx
// Portable shell for MENU_TAB_HEADER_BAR (2026-09-12, reworked 2026-09-22 —
// see WalletHeader.tsx's own "opaque slot" precedent). The real app's tab
// strip (components/views/RadioOverlayPanels/AccountPanel/
// AccountPanelTabBar.tsx) has two things this file didn't originally have:
// a real wallet-lock gate (useSpCoinWallet, disables the tabs and swaps
// their tooltip while locked — its own doc comment there calls this
// "purely a visual/UX nicety," the real enforcement lives centrally in
// panelTreeCallbacks.ts's openPanel), and a separate sibling body
// component (WalletRadioPanels.tsx) rather than this file's own fused
// `children` wrapper below. `TabRow` is now exported separately so the
// web app can reuse this file's own tab-button markup/padding directly
// (via its own `disabled`/`disabledTitle` props, which express the gate
// without this shell needing to know anything about wallet locking
// itself) while keeping its own separate body component untouched —
// `MenuTabHeaderBar` itself stays exactly as it always was, a thin
// TabRow + scrollable-body composite, unchanged for the extension's own
// call site (MeritWallet.tsx here).
//
// Sizing scaled down from the real app's min-w-[92px]/px-4 py-2 tabs to
// this panel's own established compact scale, matching AgentSelectDropDown/
// NetworkSelectDropDown's font sizes rather than copying the popup-sized
// numbers verbatim.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { menuTabStyle, panelPartClass } from '@sponsorcoin/spcoin-common/styles';
import { useState } from 'react';
const TABS = [
    { key: 'SWAP', label: 'Swap' },
    { key: 'SEND', label: 'Send' },
    { key: 'SPONSOR', label: 'Sponsor' },
    { key: 'REWARDS', label: 'Rewards' },
];
function TabButton({ label, active, onClick, disabled, title, }) {
    const [hovered, setHovered] = useState(false);
    return (_jsx("button", { type: "button", onClick: onClick, disabled: disabled, title: title, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), style: menuTabStyle.button({ active, hovered, disabled: !!disabled, clickable: !!onClick }), children: label }));
}
/** The tab strip itself — see this file's own header comment for why it's
 *  exported separately from MenuTabHeaderBar. */
export function TabRow({ open = true, activeTab = 'SWAP', onTabClick, disabled = false, disabledTitle, }) {
    const handleClick = (tab) => onTabClick && !disabled ? () => onTabClick(tab) : undefined;
    return (_jsxs("div", { style: menuTabStyle.slide(open), children: [_jsx("style", { children: menuTabStyle.hideScrollbarRule }), _jsxs("div", { className: panelPartClass.menuTabRow, style: menuTabStyle.row, children: [TABS.map((tab) => (_jsx(TabButton, { label: tab.label, active: activeTab === tab.key, onClick: handleClick(tab.key), disabled: disabled, title: disabled ? disabledTitle : undefined }, tab.key))), _jsx(TabButton, { label: "Config", active: activeTab === 'CONFIG', onClick: handleClick('CONFIG'), disabled: disabled, title: disabled ? disabledTitle : undefined })] })] }));
}
export default function MenuTabHeaderBar({ open = true, activeTab = 'SWAP', onTabClick, disabled, disabledTitle, children, }) {
    return (
    // 2026-09-12 — this outer element is now the flex column that owns
    // the fixed-tab-row/scrollable-body split; it needs to actually be
    // GIVEN the remaining vertical space by its own parent (flex:1 or an
    // explicit height) to have anything to distribute — a plain block
    // parent leaves this shrunk to content height, and the inner
    // scrollable div below never gets a bounded height to scroll within.
    _jsxs("div", { style: menuTabStyle.frame, children: [_jsx(TabRow, { open: open, activeTab: activeTab, onTabClick: onTabClick, disabled: disabled, disabledTitle: disabledTitle }), children && (_jsx("div", { 
                // 2026-10-16 (owner request), raised to 4px 2026-10-24 (owner correction) — the buffer between the bottom of the MENU_TAB_HEADER_BAR (its divider) and whatever radio panel is on screen (TRADING_STATION_PANEL, SEND_PANEL, ADDRESS_PANEL, ...). The tabs themselves stay flush on the divider.
                style: menuTabStyle.body, children: children }))] }));
}
