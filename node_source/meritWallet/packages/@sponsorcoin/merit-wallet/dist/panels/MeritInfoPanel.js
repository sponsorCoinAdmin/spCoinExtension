// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/MeritInfoPanel.tsx
// Portable placeholder for MERIT_INFO_PANEL (2026-09-12) — the real app
// version (components/views/RadioOverlayPanels/MeritInfoPanel/index.tsx)
// fetches a static meritInfo.json and renders it via the real app's
// ReadOnlyMetaDataTable. Same shape (logo card + label/value rows),
// entirely inert — real content passed in as plain rows, no live fetch.
// Placeholder, not logic, per explicit instruction.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { plainPanelStyle } from '@sponsorcoin/spcoin-common/styles';
const DEFAULT_ROWS = [
    { label: 'Name', value: 'Merit Wallet' },
    { label: 'Website', value: 'N/A' },
];
export default function MeritInfoPanel({ icon, rows = DEFAULT_ROWS }) {
    return (_jsxs("div", { style: plainPanelStyle.infoBox, children: [icon && _jsx("div", { style: plainPanelStyle.infoIcon, children: icon }), _jsx("table", { style: plainPanelStyle.infoTable, children: _jsx("tbody", { children: rows.map((row) => (_jsxs("tr", { style: plainPanelStyle.infoRow, children: [_jsx("td", { style: plainPanelStyle.infoLabel, children: row.label }), _jsx("td", { style: plainPanelStyle.infoValue, children: row.value })] }, row.label))) }) })] }));
}
