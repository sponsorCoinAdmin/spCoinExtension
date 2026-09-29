// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AgentSelectDropDown.tsx
//
// 2026-09-12 — portable placeholder for AGENT_SELECT_DROP_DOWN. Promoted
// 2026-09-18, on request (the "make npm the single source of truth"
// migration) — first of the five real dropdown wrapper components
// (Token/Account/Agent/Recipient/Pool SelectDropDown) to go real, since it
// already had a dead, unused npm-side placeholder (a literal two-copies
// case) and the web app's real implementation
// (node_source/spCoinPanels/AssetSelectDropDowns/AgentSelectDropDown.tsx)
// is a comparatively thin wrapper: useAgentAccount + useOpenActiveListPanel
// + usePanelVisible + validateAccount, all ExchangeContext-runtime hooks
// that don't exist in a portable package yet. Same treatment TradeAmountRow
// got: every hook-derived value becomes an optional prop, the component
// itself stays entirely hook-free — a real caller (the web app's own
// AgentSelectDropDown, now a thin hook-wiring wrapper around this one)
// resolves the real values and feeds them in; an extension caller with no
// ExchangeContext yet can render this exact same component inert, same
// look as before this promotion, by simply omitting the optional props.
//
// Deliberately NOT built on AssetSelectDropDown (the package's other real,
// portable dropdown) despite the obvious shape overlap — AssetSelectDropDown
// is styled with real Tailwind utility classes (`flex`, `gap-1`,
// `rounded-lg`, etc.), and spCoinExtension still has no Tailwind pipeline
// (confirmed 2026-09-18: no tailwind.config/postcss.config there either),
// so those classes render unstyled in the one environment this package
// exists to serve. Kept this file's own original inline-style approach
// instead, same reasoning every other extension-bound component in this
// package already follows — this is a real, currently-latent gap in
// AssetSelectDropDown itself (fine today only because nothing in the
// extension's live UI renders it yet), flagged here rather than silently
// worked around by inheriting it into a second component.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ChevronDown, ChevronUp, Copy, CheckCheck } from 'lucide-react';
// Same component/reasoning as TradeAmountRow.tsx's own CopyAddressButton —
// duplicated rather than shared across files on purpose (this package has
// no internal-only shared-utility convention yet; see that file's own
// header comment history for why extracting one wasn't done speculatively).
function CopyAddressButton({ address }) {
    const [copied, setCopied] = useState(false);
    const [hovered, setHovered] = useState(false);
    return (_jsx("button", { type: "button", onClick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            navigator.clipboard.writeText(address).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            });
        }, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), "aria-label": "Copy address", title: "Copy address", style: {
            boxSizing: 'border-box',
            display: 'flex',
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2,
            borderRadius: 3,
            border: 'none',
            background: hovered ? 'rgba(255,255,255,0.1)' : 'transparent',
            color: copied ? '#4ade80' : 'inherit',
            cursor: 'pointer',
        }, children: copied ? _jsx(CheckCheck, { size: 11 }) : _jsx(Copy, { size: 11 }) }));
}
function truncateMiddle(addr, size) {
    return addr.length > size * 2 + 3 ? `${addr.slice(0, size)}...${addr.slice(-size)}` : addr;
}
export default function AgentSelectDropDown({ icon, address, symbol, placeholderLabel = 'Select Agent', onSelectClick, listOpen, addrPrePostSize, panelGateId, panelGate: PanelGate, }) {
    const [hovered, setHovered] = useState(false);
    const hasEntity = Boolean(address);
    const displayAddress = address && addrPrePostSize != null ? truncateMiddle(address, addrPrePostSize) : address;
    const content = (_jsxs("div", { onClick: onSelectClick, onMouseEnter: () => onSelectClick && setHovered(true), onMouseLeave: () => setHovered(false), style: { display: 'inline-flex', alignItems: 'center', gap: 6, cursor: onSelectClick ? 'pointer' : 'default' }, children: [_jsx("span", { style: {
                    display: 'flex',
                    height: 40,
                    width: 40,
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    background: icon ? 'transparent' : 'rgba(0,0,0,0.2)',
                }, children: icon }), _jsxs("div", { style: {
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
                }, children: [_jsx("span", { style: { fontSize: 10, fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }, children: hasEntity ? [symbol, displayAddress].filter(Boolean).join(' ') : placeholderLabel }), hasEntity && address && _jsx(CopyAddressButton, { address: address }), listOpen ? (_jsx(ChevronUp, { size: 11, style: { flexShrink: 0, color: '#f8fafc' } })) : (_jsx(ChevronDown, { size: 11, style: { flexShrink: 0, color: '#f8fafc' } }))] })] }));
    if (panelGateId === undefined || !PanelGate)
        return content;
    return (_jsx(PanelGate, { panel: panelGateId, lazyLoad: false, children: content }));
}
