// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/NetworkDetailPanel.tsx
// 2026-09-16, on request ("do the same for the info.png in the lists...
// there are 3 list types... ACCOUNT, TOKEN and NETWORK") — the third and
// last detail view, alongside AccountDetailPanel/TokenDetailPanel. Genuine
// shape difference from those two, not just a copy-paste: a network's own
// "info.json" equivalent (spcoin-feeds/networks' CONFIGURED_NETWORKS) is a
// small static list already held fully in memory by whatever caller
// supplied networkRows — there's no per-network on-demand fetch the way
// fetchAccountMetadata/fetchTokenByAddress are for the other two, so this
// component (and MeritWallet.tsx's own use of it) needs no `loading` state
// or caller round-trip at all; the data is already there the moment the
// icon is clicked.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { detailPanelStyle } from '@sponsorcoin/spcoin-common/styles';
function DetailRow({ label, value, zebra }) {
    return (_jsxs("div", { style: detailPanelStyle.row(zebra), children: [_jsx("span", { style: detailPanelStyle.label, children: label }), _jsx("span", { style: detailPanelStyle.value, children: value })] }));
}
export default function NetworkDetailPanel({ id, logoSrc, name, symbol, isTestnet }) {
    const rows = [
        { label: 'Network Id', value: id },
        { label: 'Name', value: name || '—' },
        { label: 'Symbol', value: symbol || '—' },
        { label: 'Network Type', value: isTestnet ? 'Testnet' : 'Mainnet' },
    ];
    return (_jsx("div", { style: detailPanelStyle.screen, children: _jsxs("div", { style: detailPanelStyle.card, children: [_jsx("div", { style: detailPanelStyle.logoRow, children: _jsx("div", { style: detailPanelStyle.logoBox, children: logoSrc ? (_jsx("img", { src: logoSrc, alt: "", style: detailPanelStyle.logoContain })) : null }) }), _jsx("div", { style: detailPanelStyle.rows, children: rows.map((row, i) => (_jsx(DetailRow, { label: row.label, value: row.value, zebra: i % 2 === 0 }, row.label))) })] }) }));
}
