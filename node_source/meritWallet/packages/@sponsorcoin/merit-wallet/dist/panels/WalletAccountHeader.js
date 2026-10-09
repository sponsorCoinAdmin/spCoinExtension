// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/WalletAccountHeader.tsx
// Portable shell for WALLET_ACCOUNT_HEADER (2026-09-12, reworked
// 2026-09-22). The real app version (components/views/Headers/
// PanelSubTitle.tsx) renders AccountSelectDropDown (a real account +
// avatar + panel-tree-driven picker, with its own collapseKey/hydration
// behavior) and RoleTableComponent (a LIVE server fetch against on-chain
// account-role data via /api/spCoin/run-script). Neither has anything
// real to show in a consumer with no account/chain connection at all
// (the extension, today).
//
// 2026-09-22, on direct request ("we are sharing WALLET_NETWORK_HEADER
// through NPM... let's do the exact same change for WALLET_ACCOUNT_HEADER
// so we can be sure they are the same") — this used to be a rigid,
// props-driven placeholder (icon/address/symbol/name/roles booleans in,
// AssetSelectDropDown + a hand-rolled role table out), which is exactly
// why its own padding silently drifted from PanelSubTitle.tsx's real
// 16px (this file had 10px until caught live, see WalletHeader.tsx's own
// matching comment on the exact same bug). Reworked to the SAME "opaque
// slot" pattern WalletHeader.tsx's own leftSlot already uses: this file
// now owns only the outer flex/padding/background shell — real content
// (the account pill, the role badges) is injected by the caller as plain
// ReactNode children, so there's nothing left for either app to
// duplicate or drift out of sync on except this one file. The old
// props-driven rendering (icon/address/symbol/name/roles/onIconClick/
// onRoleClick/chevronUp) still works exactly as before as the DEFAULT
// when pillSlot/roleSlot are omitted — MeritWallet.tsx (this package,
// the extension's real consumer) keeps using it unchanged; only
// PanelSubTitle.tsx (the web app) was moved onto the new slots, passing
// its own real AccountSelectDropDown/RoleTableComponent straight through.
//
// Inline styles, not Tailwind classes (same reasoning as WalletHeader.tsx
// — a component library shouldn't require every consumer to run a
// Tailwind pipeline just to render correctly).
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { walletColors } from '@sponsorcoin/spcoin-common/styles';
import { useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { AssetSelectDropDown, ASSET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';
import { PanelGate } from '@sponsorcoin/spcoin-panels';
import { ANONYMOUS_ACCOUNT_AVATAR_URL } from '@sponsorcoin/spcoin-feeds/accounts';
const DEFAULT_ROLES = { isSponsor: false, isRecipient: false, isAgent: false };
const ROLE_ACTIVE_BG = walletColors.greenDark; // green-600, matches the app's real active-role color
const ROLE_INACTIVE_BG = walletColors.error; // red-600, matches the app's real inactive-role color
function RoleCell({ label, active, title, onClick, borderRight, }) {
    const [hovered, setHovered] = useState(false);
    return (_jsx("td", { title: title, onClick: onClick, onMouseEnter: () => onClick && setHovered(true), onMouseLeave: () => setHovered(false), style: {
            borderRight: borderRight ? '1px solid #1f2937' : undefined,
            padding: '0 4px',
            textAlign: 'center',
            background: active ? (hovered ? walletColors.green : ROLE_ACTIVE_BG) : ROLE_INACTIVE_BG,
            cursor: onClick ? 'pointer' : 'default',
        }, children: _jsx("span", { style: { display: 'inline-block' }, children: label }) }));
}
/** This package's own inert default pill — used only when the caller
 *  doesn't pass pillSlot (e.g. the extension, via MeritWallet.tsx, which
 *  still calls this with the old icon/address/symbol/... props). */
function DefaultAccountPill({ icon, address, symbol, name, placeholderLabel, onSelectClick, onIconClick, chevronUp, }) {
    const hasEntity = Boolean(address);
    return (_jsx(AssetSelectDropDown, { rootId: "WALLET_ACCOUNT_HEADER", hasEntity: hasEntity, 
        // 2026-10-03 — shared Anonymous avatar when no account avatar is available.
        icon: icon, defaultIconSrc: ANONYMOUS_ACCOUNT_AVATAR_URL, showIconWhenEmpty: true, symbol: symbol, name: name, address: address ?? '', placeholderLabel: placeholderLabel ?? 'Select Account', copyLabel: "Copy Account Address", showDisplay: ASSET_SELECT_DISPLAY.ICON |
            ASSET_SELECT_DISPLAY.SYMBOL |
            ASSET_SELECT_DISPLAY.NAME |
            ASSET_SELECT_DISPLAY.ADDRESS |
            ASSET_SELECT_DISPLAY.COPY |
            (chevronUp ? ASSET_SELECT_DISPLAY.CHEVRON_UP : ASSET_SELECT_DISPLAY.CHEVRON_DN) |
            ASSET_SELECT_DISPLAY.ADDR_COMP, onRowClick: onSelectClick, onIconClick: onIconClick ? () => onIconClick(address ?? '') : undefined, addrPrePostSize: 4, iconSizeClassName: "h-[22px] w-[22px]", pillHeightClassName: "h-[16px]", pillFontClassName: "text-[11px]", chevronSize: 12, copyIconSize: 12, nameLineClassName: "text-[11px] font-semibold leading-tight text-white" }));
}
/** This package's own inert default role table — same "used only when the
 *  caller doesn't pass roleSlot" reasoning as DefaultAccountPill above. */
function DefaultRoleTable({ roles = DEFAULT_ROLES, onRoleClick, }) {
    return (_jsx("div", { style: { display: 'inline-block', border: '1.5px solid #1f2937' }, children: _jsx("table", { style: { borderCollapse: 'collapse', fontSize: 9, fontWeight: 700, color: walletColors.white }, children: _jsx("tbody", { children: _jsxs("tr", { children: [_jsx(RoleCell, { label: "S", active: roles.isSponsor, title: roles.isSponsor ? 'Sponsor Account — click to open Rewards' : 'Not a Sponsor Account', onClick: roles.isSponsor && onRoleClick ? () => onRoleClick('sponsor') : undefined, borderRight: true }), _jsx(RoleCell, { label: "R", active: roles.isRecipient, title: roles.isRecipient ? 'Recipient Account — click to open Rewards' : 'Not a Recipient Account', onClick: roles.isRecipient && onRoleClick ? () => onRoleClick('recipient') : undefined, borderRight: true }), _jsx(RoleCell, { label: "A", active: roles.isAgent, title: roles.isAgent ? 'Agent Account — click to open Rewards' : 'Not an Agent Account', onClick: roles.isAgent && onRoleClick ? () => onRoleClick('agent') : undefined, borderRight: false })] }) }) }) }));
}
export default function WalletAccountHeader({ pillSlot, roleSlot, icon, address, symbol, name, placeholderLabel, roles, onSelectClick, onIconClick, onRoleClick, chevronUp, }) {
    const resolvedPill = pillSlot ?? (_jsx(DefaultAccountPill, { icon: icon, address: address, symbol: symbol, name: name, placeholderLabel: placeholderLabel, onSelectClick: onSelectClick, onIconClick: onIconClick, chevronUp: chevronUp }));
    // roleSlot === null is an explicit "render nothing" — distinct from
    // undefined ("caller didn't pass one, use the default").
    const resolvedRole = roleSlot === null ? null : roleSlot ?? _jsx(DefaultRoleTable, { roles: roles, onRoleClick: onRoleClick });
    return (_jsxs("div", { style: {
            flexShrink: 0,
            borderBottom: '1px solid rgba(51,65,85,0.5)',
            // 2026-09-22, on direct request — 6px (was 16px), matching
            // WalletHeader.tsx's own matching update above it.
            paddingLeft: 6,
            paddingRight: 6,
            paddingTop: 0,
            paddingBottom: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: walletColors.oneOffChromeMuted,
        }, children: [_jsx("div", { style: { minWidth: 0, flex: 1 }, children: _jsx(PanelGate, { panel: SP_COIN_DISPLAY.ACCOUNT_SELECT_DROP_DOWN, lazyLoad: false, children: resolvedPill }) }), resolvedRole && (_jsx("div", { style: { marginLeft: 'auto', display: 'flex', alignItems: 'center' }, children: _jsx(PanelGate, { panel: SP_COIN_DISPLAY.ROLE_TABLE_COMPONENT, lazyLoad: false, children: resolvedRole }) }))] }));
}
