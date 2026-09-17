// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AccountDetailPanel.tsx
// 2026-09-16, on request ("when the avatar.png is selected we should get
// ACCOUNT_PANEL with the address sent as a parameter to open the avatar.png
// and the info.json to populate the tables") — a portable, READ-ONLY
// equivalent of the real app's own components/views/RadioOverlayPanels/
// AccountPanel/AccountPanelContent.tsx. Deliberately NOT a port of that
// file: the real one is a full create/edit form (useCreateAccountForm,
// reveal-private-key, wagmi's useAccount, sponsored/staked-amount live
// chain reads) — none of that has a portable equivalent, and building one
// is real, separate, much larger work. This is the "show what info.json +
// avatar.png already say about this account" half only — a real, useful
// slice on its own, matching this package's own "placeholder, not logic"
// / small-slice convention.
//
// Same "caller injects real data" discipline as every other file here:
// this component never fetches anything itself (no @sponsorcoin/spcoin-
// feeds dependency) — the caller resolves avatarSrc (already an <img>-
// ready URL/data-URL) and the info.json-shaped fields (name/symbol/email/
// website/description, matching spcoin-feeds/accounts' own AccountMetadata
// type) and passes them down. `loading` covers the real gap between "the
// avatar was clicked" and "the caller's own fetch actually resolved."
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AccountDetailPanel;
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
            // ASSET_LIST_ROW_BG_A/B use — kept as literals here rather than an
            // import, since this component has no other reason to depend on
            // that file and the values are small/stable enough to duplicate
            // (same call this package already makes for spcoin-feeds'
            // resolveDiskAssetChainId-style duplicated constants).
            background: zebra ? 'rgba(56,78,126,0.35)' : 'rgba(156,163,175,0.25)',
        }, children: [(0, jsx_runtime_1.jsx)("span", { style: ROW_LABEL_STYLE, children: label }), (0, jsx_runtime_1.jsx)("span", { style: ROW_VALUE_STYLE, children: value })] }));
}
function AccountDetailPanel({ address, avatarSrc, name, symbol, email, website, description, loading = false, }) {
    const rows = [
        { label: 'Address', value: address },
        { label: 'Name', value: loading ? 'Loading…' : name || '—' },
        { label: 'Symbol', value: loading ? 'Loading…' : symbol || '—' },
        { label: 'Email', value: loading ? 'Loading…' : email || '—' },
        { label: 'Website', value: loading ? 'Loading…' : website || '—' },
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
                        }, children: avatarSrc ? ((0, jsx_runtime_1.jsx)("img", { src: avatarSrc, alt: "", style: { width: '100%', height: '100%', objectFit: 'cover' } })) : null }) }), (0, jsx_runtime_1.jsx)("div", { style: { minHeight: 0, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }, children: rows.map((row, i) => ((0, jsx_runtime_1.jsx)(DetailRow, { label: row.label, value: row.value, zebra: i % 2 === 0 }, row.label))) })] }) }));
}
