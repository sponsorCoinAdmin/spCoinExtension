// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/NetworkListTable.tsx
// Portable version of the real app's networks.tsx (2026-09-15) —
// NETWORK_LIST's own distinct card shell, the third and last
// ACTIVE_LIST_PANEL_MODES layout (REMOTE_TOKEN_LIST/REMOTE_ACCOUNT_*
// share AssetListTable.tsx; LOCAL_ACCOUNT_WALLET_LIST has its own
// AccountListCard.tsx; this is NETWORK_LIST's). Header reads "Network
// Meta | Auth Source / Status" (not "Token Meta | Info" — a real,
// different header, not a relabeled copy) and the footer carries the
// "Show Test Nets" checkbox networks.tsx's own ScrollTablePanel footer
// slot renders — both copied from that file's own real values, not
// re-guessed. Placeholder: `rows` is caller-supplied static data, no
// real network feed/switch logic behind it.
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NETWORK_LIST_ROW_BG_B = exports.NETWORK_LIST_ROW_BG_A = void 0;
exports.default = NetworkListTable;
const jsx_runtime_1 = require("react/jsx-runtime");
const NetworkListRow_1 = __importDefault(require("./NetworkListRow"));
const ScrollTablePanel_1 = __importDefault(require("./ScrollTablePanel"));
// Same rowA/rowB zebra constants AssetListTable.tsx already exports —
// duplicated here (not imported) so this file has no dependency on that
// sibling table's own module, matching every other pair of "distinct but
// same-family" components in this package (e.g. AssetListRow vs.
// NetworkListRow themselves).
exports.NETWORK_LIST_ROW_BG_A = 'rgba(56,78,126,0.35)';
exports.NETWORK_LIST_ROW_BG_B = 'rgba(156,163,175,0.25)';
function NetworkListTable({ rows, showTestNets = false, onToggleShowTestNets, loadingText = 'Loading…', emptyText = 'No results.', loading = false, }) {
    const header = (
    // 2026-09-16, on request ("apply the text/row/style/size from [the
    // Rewards Management table] to Select Network") — header padding/font
    // now match ManageSponsorshipsPanel.tsx's own header row exactly
    // (padding '5px 10px', fontSize 9, fontWeight 700, no uppercase/
    // letterSpacing, color #94a3b8) instead of this table's own prior,
    // separately-tuned values.
    (0, jsx_runtime_1.jsx)("div", { style: { background: '#2b2b2b', borderBottom: '1px solid #000000' }, children: (0, jsx_runtime_1.jsxs)("div", { style: { width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '5px 10px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { flexShrink: 0, textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#94a3b8' }, children: "Network Meta" }), (0, jsx_runtime_1.jsx)("div", { style: { flexShrink: 0, textAlign: 'right', fontSize: 9, fontWeight: 700, color: '#94a3b8' }, children: "Auth Source" })] }) }));
    const footer = (
    // 2026-09-16, on request ("'Show Test Nets' row is way out of scale,
    // should be the same text scale as the header") — fontSize 14→9,
    // padding tightened to match the header's own '5px 10px' scale
    // (was '12px 16px', sized for the old 36px-row scale). Checkbox
    // shrunk to match (was 16px, oversized next to 9px text).
    (0, jsx_runtime_1.jsxs)("div", { style: {
            display: 'flex',
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(51,65,85,0.7)',
            padding: '5px 10px',
            fontSize: 9,
            color: '#cbd5e1',
        }, children: [(0, jsx_runtime_1.jsx)("span", { children: "Show Test Nets" }), (0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: showTestNets, onChange: onToggleShowTestNets, "aria-label": "Show Test Nets", style: { height: 11, width: 11, cursor: onToggleShowTestNets ? 'pointer' : 'default', accentColor: '#5981F3' } })] }));
    return (
    // 2026-09-16, on request — container now matches
    // ManageSponsorshipsPanel.tsx's own outer treatment exactly:
    // borderRadius 12 (was 20), a real visible border (was none — pure
    // black on this near-black page background reads as no border at
    // all), and '0 8px 8px 8px' outer breathing room (was flush/0) —
    // same reasoning as that file's own comment on why margin was added.
    (0, jsx_runtime_1.jsx)(ScrollTablePanel_1.default, { header: header, footer: footer, bufferPadding: "0 8px 8px 8px", style: { borderRadius: 12, border: '1px solid #334155', background: '#243056', color: '#5981F3', boxSizing: 'border-box' }, children: loading ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8' }, children: loadingText })) : rows.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8' }, children: emptyText })) : (
        // 2026-09-16, on request ("make the extension network rows display
        // like [the already-correct ordering]") — pins isActive row(s) to
        // the top structurally, regardless of the order `rows` arrives in.
        // Previously this table just rendered `rows` as-given, so whether
        // the active network showed first depended entirely on the
        // caller's own data order — the web app's networks.tsx happened to
        // list it first, the extension's own sample data didn't, so the
        // exact same component looked inconsistent across the two
        // surfaces. Sorting here (not in each consumer) makes this correct
        // for every current and future caller, matching the single-
        // source-of-truth intent of this package.
        [...rows]
            .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))
            .map((row, i) => {
            var _a;
            return ((0, jsx_runtime_1.jsx)("div", { style: { background: row.isActive ? undefined : i % 2 === 0 ? exports.NETWORK_LIST_ROW_BG_A : exports.NETWORK_LIST_ROW_BG_B }, children: (0, jsx_runtime_1.jsx)(NetworkListRow_1.default, { ...row, groupId: (_a = row.groupId) !== null && _a !== void 0 ? _a : 'network-list' }) }, row.id));
        })) }));
}
