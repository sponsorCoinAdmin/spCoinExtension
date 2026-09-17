// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MenuTabHeaderBar.tsx
// Portable placeholder for MENU_TAB_HEADER_BAR (2026-09-12). The real app's
// MENU_TAB_HEADER_BAR panel is just a visibility flag (no children of its
// own — see panelRegistry.ts's own comment); its actual visual content is
// components/views/RadioOverlayPanels/AccountPanel/AccountPanelTabBar.tsx,
// the Swap/Send/Sponsor/Rewards/Config tab strip, whose `open` prop reads
// that same flag. Real tab clicks there open real radio panels
// (TRADING_STATION_PANEL, SEND_PANEL, etc.) and check a real wallet-lock
// gate (useSpCoinWallet) — none of which exist in a standalone consumer
// (the extension, today). This is the same tab-strip shape, entirely
// inert unless the caller wires `onTabClick` — same "presentation only,
// no sync yet" scope every other extension-bound component here follows.
// Inline styles (no Tailwind), same reasoning as every sibling component.
//
// Sizing scaled down from the real app's min-w-[92px]/px-4 py-2 tabs to
// this panel's own established compact scale, matching AgentSelectDropDown/
// NetworkSelectDropDown's font sizes rather than copying the popup-sized
// numbers verbatim.
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MenuTabHeaderBar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const TABS = [
    { key: 'SWAP', label: 'Swap' },
    { key: 'SEND', label: 'Send' },
    { key: 'SPONSOR', label: 'Sponsor' },
    { key: 'REWARDS', label: 'Rewards' },
];
function TabButton({ label, active, onClick, }) {
    const [hovered, setHovered] = (0, react_1.useState)(false);
    return ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onClick, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), style: {
            display: 'inline-flex',
            minWidth: 62,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            borderRadius: '6px 6px 0 0',
            border: '1px solid',
            borderColor: active ? '#596fe8' : 'rgba(51,65,85,0.7)',
            background: active ? '#243056' : hovered ? '#1a2034' : '#11162a',
            color: active ? '#9db0ff' : '#cbd5e1',
            padding: '5px 8px',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            cursor: onClick ? 'pointer' : 'default',
        }, children: label }));
}
function MenuTabHeaderBar({ open = true, activeTab = 'SWAP', onTabClick, children, }) {
    return (
    // 2026-09-12 — this outer element is now the flex column that owns
    // the fixed-tab-row/scrollable-body split; it needs to actually be
    // GIVEN the remaining vertical space by its own parent (flex:1 or an
    // explicit height) to have anything to distribute — a plain block
    // parent leaves this shrunk to content height, and the inner
    // scrollable div below never gets a bounded height to scroll within.
    (0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'hidden' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    flexShrink: 0,
                    overflow: 'hidden',
                    transition: 'max-height 300ms ease-in-out, opacity 300ms ease-in-out',
                    maxHeight: open ? 60 : 0,
                    opacity: open ? 1 : 0,
                }, children: [(0, jsx_runtime_1.jsx)("style", { children: '.spcoinMenuTabScroll::-webkit-scrollbar, .spcoinMenuTabBodyScroll::-webkit-scrollbar { display: none; }' }), (0, jsx_runtime_1.jsxs)("div", { className: "spcoinMenuTabScroll", style: {
                            display: 'flex',
                            flexWrap: 'nowrap',
                            alignItems: 'center',
                            gap: 4,
                            borderBottom: '1px solid rgba(51,65,85,0.7)',
                            paddingLeft: 8,
                            paddingRight: 8,
                            paddingTop: 4,
                            paddingBottom: 4,
                            overflowX: 'auto',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        }, children: [TABS.map((tab) => ((0, jsx_runtime_1.jsx)(TabButton, { label: tab.label, active: activeTab === tab.key, onClick: onTabClick ? () => onTabClick(tab.key) : undefined }, tab.key))), (0, jsx_runtime_1.jsx)(TabButton, { label: "Config", active: activeTab === 'CONFIG', onClick: onTabClick ? () => onTabClick('CONFIG') : undefined })] })] }), children && ((0, jsx_runtime_1.jsx)("div", { className: "spcoinMenuTabBodyScroll", style: { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', msOverflowStyle: 'none' }, children: children }))] }));
}
