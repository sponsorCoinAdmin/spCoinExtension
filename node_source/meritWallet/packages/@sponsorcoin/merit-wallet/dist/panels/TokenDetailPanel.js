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
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { detailPanelStyle } from '@sponsorcoin/spcoin-common/styles';
function DetailRow({ label, value, zebra }) {
    return (_jsxs("div", { style: detailPanelStyle.row(zebra), children: [_jsx("span", { style: detailPanelStyle.label, children: label }), _jsx("span", { style: detailPanelStyle.value, children: value })] }));
}
export default function TokenDetailPanel({ address, logoSrc, name, symbol, decimals, website, explorer, description, loading = false, }) {
    const rows = [
        { label: 'Address', value: address },
        { label: 'Name', value: loading ? 'Loading…' : name || '—' },
        { label: 'Symbol', value: loading ? 'Loading…' : symbol || '—' },
        { label: 'Decimals', value: loading ? 'Loading…' : decimals ?? '—' },
        { label: 'Website', value: loading ? 'Loading…' : website || '—' },
        { label: 'Explorer', value: loading ? 'Loading…' : explorer || '—' },
        { label: 'Description', value: loading ? 'Loading…' : description || '—' },
    ];
    return (_jsx("div", { style: detailPanelStyle.screen, children: _jsxs("div", { style: detailPanelStyle.card, children: [_jsx("div", { style: detailPanelStyle.logoRow, children: _jsx("div", { style: detailPanelStyle.logoBox, children: logoSrc ? (_jsx("img", { src: logoSrc, alt: "", style: detailPanelStyle.logoCover })) : null }) }), _jsx("div", { style: detailPanelStyle.rows, children: rows.map((row, i) => (_jsx(DetailRow, { label: row.label, value: row.value, zebra: i % 2 === 0 }, row.label))) })] }) }));
}
