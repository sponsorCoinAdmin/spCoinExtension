// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritInfoPanel.tsx
// Portable placeholder for MERIT_INFO_PANEL (2026-09-12) — the real app
// version (components/views/RadioOverlayPanels/MeritInfoPanel/index.tsx)
// fetches a static meritInfo.json and renders it via the real app's
// ReadOnlyMetaDataTable. Same shape (logo card + label/value rows),
// entirely inert — real content passed in as plain rows, no live fetch.
// Placeholder, not logic, per explicit instruction.
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MeritInfoPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const DEFAULT_ROWS = [
    { label: 'Name', value: 'Merit Wallet' },
    { label: 'Website', value: 'N/A' },
];
function MeritInfoPanel({ icon, rows = DEFAULT_ROWS }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }, children: [icon && (0, jsx_runtime_1.jsx)("div", { style: { width: '100%' }, children: icon }), (0, jsx_runtime_1.jsx)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 }, children: (0, jsx_runtime_1.jsx)("tbody", { children: rows.map((row) => ((0, jsx_runtime_1.jsxs)("tr", { style: { borderTop: '1px solid rgba(51,65,85,0.5)' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '6px 4px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', verticalAlign: 'top' }, children: row.label }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '6px 4px', color: '#e2e8f0' }, children: row.value })] }, row.label))) }) })] }));
}
