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
import { walletColors, walletTints } from '@sponsorcoin/spcoin-common/styles';
import { useState } from 'react';
const TABS = [
    { key: 'SWAP', label: 'Swap' },
    { key: 'SEND', label: 'Send' },
    { key: 'SPONSOR', label: 'Sponsor' },
    { key: 'REWARDS', label: 'Rewards' },
];
function TabButton({ label, active, onClick, disabled, title, }) {
    const [hovered, setHovered] = useState(false);
    return (_jsx("button", { type: "button", onClick: onClick, disabled: disabled, title: title, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), style: {
            // 2026-09-22, on live report ("why is the tab styling different
            // between the web app and the extension") — the exact same
            // box-sizing pitfall already caught and fixed in PanelTitle.tsx
            // (see that file's own comment): `minWidth` + `padding` + `border`
            // compute a DIFFERENT total rendered width depending on the
            // ambient box-sizing default, and this component never had the
            // defensive fix PanelTitle.tsx got at the time. The web app's
            // Tailwind preflight forces border-box globally; the extension has
            // no such guarantee for a plain inline-styled button — explicit
            // here removes the dependency on either app's ambient CSS.
            boxSizing: 'border-box',
            display: 'inline-flex',
            minWidth: 62,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            whiteSpace: 'nowrap',
            borderRadius: '6px 6px 0 0',
            border: '1px solid',
            borderColor: active ? walletColors.oneOffAccentDeep : walletTints.oneOffSlateDarkTint70,
            background: active ? walletColors.panel : hovered ? walletColors.oneOffSurfaceInk : walletColors.oneOffSurfaceDeep,
            color: active ? walletColors.oneOffAccentMist : walletColors.textSoft,
            padding: '5px 8px',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default',
            opacity: disabled ? 0.5 : 1,
        }, children: label }));
}
/** The tab strip itself — see this file's own header comment for why it's
 *  exported separately from MenuTabHeaderBar. */
export function TabRow({ open = true, activeTab = 'SWAP', onTabClick, disabled = false, disabledTitle, }) {
    const handleClick = (tab) => onTabClick && !disabled ? () => onTabClick(tab) : undefined;
    return (_jsxs("div", { style: {
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'max-height 300ms ease-in-out, opacity 300ms ease-in-out',
            maxHeight: open ? 60 : 0,
            opacity: open ? 1 : 0,
        }, children: [_jsx("style", { children: '.spcoinMenuTabScroll::-webkit-scrollbar, .spcoinMenuTabBodyScroll::-webkit-scrollbar { display: none; }' }), _jsxs("div", { className: "spcoinMenuTabScroll", style: {
                    // Defensive, same reasoning as TabButton's own boxSizing above —
                    // this row pairs its own left/right padding with its content, so
                    // it's just as exposed to the ambient box-sizing pitfall.
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexWrap: 'nowrap',
                    alignItems: 'center',
                    gap: 4,
                    borderBottom: '1px solid rgba(51,65,85,0.7)',
                    // 2026-09-22, on direct request — 6px (was 8), matching the two
                    // header rows' own canonical left/right buffer (WalletHeader.tsx/
                    // WalletAccountHeader.tsx). Top/bottom padding and every
                    // TabButton's own per-button metrics are untouched.
                    paddingLeft: 6,
                    paddingRight: 6,
                    paddingTop: 4,
                    paddingBottom: 4,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                }, children: [TABS.map((tab) => (_jsx(TabButton, { label: tab.label, active: activeTab === tab.key, onClick: handleClick(tab.key), disabled: disabled, title: disabled ? disabledTitle : undefined }, tab.key))), _jsx(TabButton, { label: "Config", active: activeTab === 'CONFIG', onClick: handleClick('CONFIG'), disabled: disabled, title: disabled ? disabledTitle : undefined })] })] }));
}
export default function MenuTabHeaderBar({ open = true, activeTab = 'SWAP', onTabClick, disabled, disabledTitle, children, }) {
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, overflow: 'hidden' }, children: [_jsx(TabRow, { open: open, activeTab: activeTab, onTabClick: onTabClick, disabled: disabled, disabledTitle: disabledTitle }), children && (_jsx("div", { className: "spcoinMenuTabBodyScroll", style: { flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'none', msOverflowStyle: 'none' }, children: children }))] }));
}
