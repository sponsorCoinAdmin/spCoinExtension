// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AgentSelectDropDown.tsx
// Portable placeholder for AGENT_SELECT_DROP_DOWN (2026-09-12) — the real
// app version (node_source/spCoinPanels/AssetSelectDropDowns/
// AgentSelectDropDown.tsx) wraps AccountSelectDropDown/AssetSelectDropDown
// with useAgentAccount, useOpenActiveListPanel, and the Sponsor/Recipient/
// Agent mutual-exclusion rule (validateAccount) — all of which need a real
// ExchangeContext/panel-tree that doesn't exist in a standalone consumer
// (the extension, today). This is the same shape (icon + symbol/address
// pill + chevron), entirely inert, same "presentation only, no sync yet"
// scope every other extension-bound component in this package has
// followed so far.
//
// Not `AssetSelectDropDown` reused directly: that component is real and
// already portable, but it's styled with Tailwind classes — fine for the
// web app, which runs Tailwind, but the extension has no Tailwind
// pipeline (confirmed: no tailwind.config/postcss.config in
// spCoinExtension), so those classes would render unstyled there. Inline
// styles instead, same reasoning as every other component here.
//
// Deliberately its own small pill, not a clone of WalletAccountHeader's
// row — the real AGENT_SELECT_DROP_DOWN is a compact, centered trigger
// pill (icon + symbol + address + chevron), not a full-width header row.
//
// 2026-09-13 fix, on request, reversing the icon handling described
// above (kept literally so the history is legible, not because it's
// still current): the icon was inside a single rounded capsule together
// with the symbol/address/chevron, at a flat 18x18 "consistent across
// every dropdown" size. Neither matches the real component — AgentSelect
// DropDown -> AccountSelectDropDown -> AssetSelectDropDown.tsx (node_
// source/spCoinPanels/AssetSelectDropDowns/), whose `content` JSX has the
// icon as a SIBLING of (outside) the pill that wraps only the address/
// copy/chevron, sized via `iconSizeClassName`'s default `h-10 w-10` (40px
// — neither AccountSelectDropDown nor AgentSelectDropDown overrides it
// for this call site). Restructured to match both: icon slot moved
// outside the pill, resized 18->40 to reflect that actual real-app size
// rather than an invented compact placeholder value.
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AgentSelectDropDown;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
function AgentSelectDropDown({ icon, address, symbol, placeholderLabel = 'Select Agent', onSelectClick, }) {
    const [hovered, setHovered] = (0, react_1.useState)(false);
    const hasEntity = Boolean(address);
    return ((0, jsx_runtime_1.jsxs)("div", { onClick: onSelectClick, onMouseEnter: () => onSelectClick && setHovered(true), onMouseLeave: () => setHovered(false), style: { display: 'inline-flex', alignItems: 'center', gap: 6, cursor: onSelectClick ? 'pointer' : 'default' }, children: [(0, jsx_runtime_1.jsx)("span", { style: {
                    display: 'flex',
                    height: 40,
                    width: 40,
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    background: icon ? 'transparent' : 'rgba(0,0,0,0.2)',
                }, children: icon }), (0, jsx_runtime_1.jsxs)("div", { style: {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    height: 25,
                    padding: '0 8px',
                    borderRadius: 9999,
                    // Matches the real pill's solid bg-[#243056] (AssetSelectDropDown's
                    // ADDR_COMP, non-blur variant — the one AGENT_SELECT_DROP_DOWN
                    // actually uses, not WalletHeader's frosted-glass one).
                    background: hovered ? '#2c3a68' : '#243056',
                }, children: [(0, jsx_runtime_1.jsx)("span", { style: { fontSize: 10, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }, children: hasEntity ? [symbol, address].filter(Boolean).join(' ') : placeholderLabel }), (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { size: 11, style: { flexShrink: 0, color: '#f8fafc' } })] })] }));
}
