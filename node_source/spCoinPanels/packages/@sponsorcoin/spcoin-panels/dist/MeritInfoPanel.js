// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritInfoPanel.tsx
// Portable placeholder for MERIT_INFO_PANEL (2026-09-12) — the real app
// version (components/views/RadioOverlayPanels/MeritInfoPanel/index.tsx)
// fetches a static meritInfo.json and renders it via the real app's
// ReadOnlyMetaDataTable. Same shape (logo card + label/value rows),
// entirely inert — real content passed in as plain rows, no live fetch.
// Placeholder, not logic, per explicit instruction.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const DEFAULT_ROWS = [
    { label: 'Name', value: 'Merit Wallet' },
    { label: 'Website', value: 'N/A' },
];
export default function MeritInfoPanel({ icon, rows = DEFAULT_ROWS }) {
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }, children: [icon && _jsx("div", { style: { width: '100%' }, children: icon }), _jsx("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 }, children: _jsx("tbody", { children: rows.map((row) => (_jsxs("tr", { style: { borderTop: '1px solid rgba(51,65,85,0.5)' }, children: [_jsx("td", { style: { padding: '6px 4px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top' }, children: row.label }), _jsx("td", { style: { padding: '6px 4px', color: '#e2e8f0' }, children: row.value })] }, row.label))) }) })] }));
}
