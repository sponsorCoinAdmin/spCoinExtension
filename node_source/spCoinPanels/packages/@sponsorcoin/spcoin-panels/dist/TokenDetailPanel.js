// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TokenDetailPanel.tsx
// 2026-09-16, on request ("do the same for the info.png in the lists") —
// the token-list counterpart to AccountDetailPanel.tsx (same request, same
// day, applied to every list's own info button instead of just
// WalletAccountHeader's avatar). Same shell/discipline as that file: a
// portable, read-only "logo.png + info.json fields" view, no feed
// dependency of its own — the caller resolves logoSrc and the info.json-
// shaped fields (matching spcoin-feeds/tokens' own TokenRecord type) and
// passes them down.
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TokenDetailPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const ROW_LABEL_STYLE = {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
};
const ROW_VALUE_STYLE = {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 500,
    wordBreak: 'break-word',
};
function DetailRow({ label, value, zebra }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            padding: '8px 14px',
            // Same rowA/rowB zebra values AssetListTable.tsx's own
            // ASSET_LIST_ROW_BG_A/B use — same duplicated-literal reasoning as
            // AccountDetailPanel.tsx's own identical row (see that file's
            // comment on this exact pair of values).
            background: zebra ? 'rgba(56,78,126,0.35)' : 'rgba(156,163,175,0.25)',
        }, children: [(0, jsx_runtime_1.jsx)("span", { style: ROW_LABEL_STYLE, children: label }), (0, jsx_runtime_1.jsx)("span", { style: ROW_VALUE_STYLE, children: value })] }));
}
function TokenDetailPanel({ address, logoSrc, name, symbol, decimals, website, explorer, description, loading = false, }) {
    const rows = [
        { label: 'Address', value: address },
        { label: 'Name', value: loading ? 'Loading…' : name || '—' },
        { label: 'Symbol', value: loading ? 'Loading…' : symbol || '—' },
        { label: 'Decimals', value: loading ? 'Loading…' : decimals !== null && decimals !== void 0 ? decimals : '—' },
        { label: 'Website', value: loading ? 'Loading…' : website || '—' },
        { label: 'Explorer', value: loading ? 'Loading…' : explorer || '—' },
        { label: 'Description', value: loading ? 'Loading…' : description || '—' },
    ];
    return ((0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', overflow: 'hidden', padding: '3px 12px' }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                display: 'flex',
                minHeight: 0,
                flex: 1,
                flexDirection: 'column',
                overflow: 'hidden',
                borderRadius: 20,
                border: '1px solid #334155',
                background: '#0b0e19',
            }, children: [(0, jsx_runtime_1.jsx)("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 14px 14px' }, children: (0, jsx_runtime_1.jsx)("div", { style: {
                            width: 96,
                            height: 96,
                            borderRadius: 16,
                            overflow: 'hidden',
                            background: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }, children: logoSrc ? ((0, jsx_runtime_1.jsx)("img", { src: logoSrc, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })) : null }) }), (0, jsx_runtime_1.jsx)("div", { style: { minHeight: 0, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }, children: rows.map((row, i) => ((0, jsx_runtime_1.jsx)(DetailRow, { label: row.label, value: row.value, zebra: i % 2 === 0 }, row.label))) })] }) }));
}
