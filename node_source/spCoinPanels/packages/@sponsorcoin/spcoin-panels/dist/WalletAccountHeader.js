// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/WalletAccountHeader.tsx
// Portable placeholder for WALLET_ACCOUNT_HEADER (2026-09-12) — the real
// app version (components/views/Headers/PanelSubTitle.tsx) renders
// AccountSelectDropDown (a real account + avatar + panel-tree-driven
// picker) and RoleTableComponent (a LIVE server fetch against on-chain
// account-role data via /api/spCoin/run-script, real ExchangeContext
// network/RPC state). Neither has any real data to show yet in a
// consumer with no account/chain connection at all (the extension,
// today) — there's no meaningful "ported" version of a live on-chain
// read with nothing to read. This is the same shape, same layout,
// entirely inert: an unselected-account row + three permanently-red role
// badges, all via injected props with safe do-nothing defaults, exactly
// the "presentation only, no sync yet" scope every other extension-bound
// component in this package has followed so far.
//
// 2026-09-16, on request ("the AccountSelectDropDown should be like the
// NetworkSelectDropDown in the grey header bar", plus a live report that
// the icon never showed, the address never truncated, and the row wasn't
// actually collapsible) — this used to hand-roll its own icon+name+
// address+chevron JSX from scratch, duplicating (and drifting from) what
// AssetSelectDropDown already does for real. Rewritten to delegate to
// AssetSelectDropDown directly — the same shared component
// NetworkSelectDropDown.tsx (this package) and the real app's own
// AccountSelectDropDown/PanelSubTitle.tsx already use — configured with
// the EXACT values PanelSubTitle.tsx's own header instance uses (ICON |
// SYMBOL | NAME | ADDRESS | COPY | CHEVRON | ADDR_COMP, addrPrePostSize
// 4, icon 22px/pill 16px/font 11px/chevron+copy 12px). That real address
// truncation, copy button, and click-to-expand/collapse now come free,
// and the pill is the same solid `bg-[#243056]` ADDR_COMP treatment
// NetworkSelectDropDown.tsx now uses too (see that file's own 2026-09-16
// update) — not the ad hoc translucent-white wrapper this file tried
// first, which matched the wrong reference (a stale pre-2026-09-15
// NetworkSelectDropDown look the real app itself has since moved past).
//
// Inline styles, not Tailwind classes (same reasoning as WalletHeader.tsx
// — a component library shouldn't require every consumer to run a
// Tailwind pipeline just to render correctly).
'use client';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WalletAccountHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AssetSelectDropDown_1 = __importStar(require("./AssetSelectDropDown"));
const DEFAULT_ROLES = { isSponsor: false, isRecipient: false, isAgent: false };
const ROLE_ACTIVE_BG = '#16a34a'; // green-600, matches the app's real active-role color
const ROLE_INACTIVE_BG = '#dc2626'; // red-600, matches the app's real inactive-role color
function RoleCell({ label, active, title, onClick, borderRight, }) {
    const [hovered, setHovered] = (0, react_1.useState)(false);
    return ((0, jsx_runtime_1.jsx)("td", { title: title, onClick: onClick, onMouseEnter: () => onClick && setHovered(true), onMouseLeave: () => setHovered(false), style: {
            borderRight: borderRight ? '1px solid #1f2937' : undefined,
            padding: '0 4px',
            textAlign: 'center',
            background: active ? (hovered ? '#22c55e' : ROLE_ACTIVE_BG) : ROLE_INACTIVE_BG,
            cursor: onClick ? 'pointer' : 'default',
        }, children: (0, jsx_runtime_1.jsx)("span", { style: { display: 'inline-block' }, children: label }) }));
}
function WalletAccountHeader({ icon, address, symbol, name, placeholderLabel = 'Select Active Wallet Account', roles = DEFAULT_ROLES, onSelectClick, onIconClick, onRoleClick, chevronUp = false, }) {
    const hasEntity = Boolean(address);
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            flexShrink: 0,
            borderBottom: '1px solid rgba(51,65,85,0.5)',
            paddingLeft: 10,
            paddingRight: 10,
            paddingTop: 2,
            paddingBottom: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#77808e',
        }, children: [(0, jsx_runtime_1.jsx)("div", { style: { minWidth: 0, flex: 1 }, children: (0, jsx_runtime_1.jsx)(AssetSelectDropDown_1.default, { rootId: "WALLET_ACCOUNT_HEADER", hasEntity: hasEntity, icon: icon, symbol: symbol, name: name, address: address !== null && address !== void 0 ? address : '', placeholderLabel: placeholderLabel, copyLabel: "Copy Account Address", showDisplay: AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.ICON |
                        AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.SYMBOL |
                        AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.NAME |
                        AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.ADDRESS |
                        AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.COPY |
                        (chevronUp ? AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.CHEVRON_UP : AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.CHEVRON_DN) |
                        AssetSelectDropDown_1.ASSET_SELECT_DISPLAY.ADDR_COMP, onRowClick: onSelectClick, onIconClick: onIconClick ? () => onIconClick(address !== null && address !== void 0 ? address : '') : undefined, addrPrePostSize: 4, iconSizeClassName: "h-[22px] w-[22px]", pillHeightClassName: "h-[16px]", pillFontClassName: "text-[11px]", chevronSize: 12, copyIconSize: 12, nameLineClassName: "text-[11px] font-semibold leading-tight text-white" }) }), (0, jsx_runtime_1.jsx)("div", { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center' }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                        display: 'inline-block',
                        border: '1.5px solid #1f2937',
                    }, children: (0, jsx_runtime_1.jsx)("table", { style: { borderCollapse: 'collapse', fontSize: 9, fontWeight: 700, color: '#ffffff' }, children: (0, jsx_runtime_1.jsx)("tbody", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)(RoleCell, { label: "S", active: roles.isSponsor, title: roles.isSponsor ? 'Sponsor Account — click to open Rewards' : 'Not a Sponsor Account', onClick: roles.isSponsor && onRoleClick ? () => onRoleClick('sponsor') : undefined, borderRight: true }), (0, jsx_runtime_1.jsx)(RoleCell, { label: "R", active: roles.isRecipient, title: roles.isRecipient ? 'Recipient Account — click to open Rewards' : 'Not a Recipient Account', onClick: roles.isRecipient && onRoleClick ? () => onRoleClick('recipient') : undefined, borderRight: true }), (0, jsx_runtime_1.jsx)(RoleCell, { label: "A", active: roles.isAgent, title: roles.isAgent ? 'Agent Account — click to open Rewards' : 'Not an Agent Account', onClick: roles.isAgent && onRoleClick ? () => onRoleClick('agent') : undefined, borderRight: false })] }) }) }) }) })] }));
}
