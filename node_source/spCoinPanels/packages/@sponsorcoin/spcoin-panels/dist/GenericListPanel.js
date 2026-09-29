// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/GenericListPanel.tsx
// Shared building block (2026-09-12) for the four list-shaped panels
// (ASSET_LIST_SELECT_PANEL, SPONSOR_STAKING_LIST, ACCOUNT_LIST_REWARDS_PANEL,
// MANAGE_SPONSORSHIPS_PANEL) — a search box + a list of icon/name/address/
// trailing-value rows. Each real version reads a live, on-chain-derived
// list (accounts, staking buckets, sponsorships) — none of which exists in
// a standalone consumer (the extension, today). Same shape, entirely
// inert, empty by default. Placeholder, not logic, per explicit
// instruction.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Search } from 'lucide-react';
export default function GenericListPanel({ searchPlaceholder = 'Search', showSearch = true, rows = [], emptyText = 'Nothing to show yet.', }) {
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }, children: [showSearch && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, background: '#151b2e', padding: '6px 10px' }, children: [_jsx(Search, { size: 13, color: "#64748b" }), _jsx("span", { style: { fontSize: 11, color: '#64748b' }, children: searchPlaceholder })] })), rows.length === 0 ? (_jsx("div", { style: { padding: '12px 4px', fontSize: 11, color: '#64748b', textAlign: 'center' }, children: emptyText })) : (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: 4 }, children: rows.map((row, i) => (_jsxs("div", { style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        borderRadius: 8,
                        background: '#151b2e',
                        padding: '6px 10px',
                    }, children: [_jsx("span", { style: {
                                display: 'flex',
                                height: 22,
                                width: 22,
                                flexShrink: 0,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '9999px',
                                overflow: 'hidden',
                                background: row.icon ? 'transparent' : 'rgba(0,0,0,0.2)',
                            }, children: row.icon }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: row.primary }), row.secondary && (_jsx("div", { style: { fontSize: 10, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: row.secondary }))] }), row.trailing && _jsx("div", { style: { fontSize: 11, color: '#e2e8f0', flexShrink: 0 }, children: row.trailing })] }, i))) }))] }));
}
