// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AssetListTable.tsx
// Portable version of the real app's DataListSelect.tsx (2026-09-15) — the
// "TOKEN META | INFO" card shell shared by all four ACTIVE_LIST_PANEL_MODES
// screens built on AssetListRow.tsx (REMOTE_TOKEN_LIST/REMOTE_ACCOUNT_
// AGENT_LIST/REMOTE_ACCOUNT_RECIPIENT_LIST/REMOTE_ACCOUNT_LIST). Every value
// below (header labels/colors, rounded-[20px] corners, rowA/rowB zebra
// colors) is copied from msTableTw.ts/DataListSelect.tsx's own real values,
// not re-guessed. Placeholder: `rows` is caller-supplied static data, no
// real feed/search/select logic behind it (see this package's own
// extensionPlan.md "placeholder, not logic" convention).
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_LIST_ROW_BG_B = exports.ASSET_LIST_ROW_BG_A = void 0;
exports.default = AssetListTable;
const jsx_runtime_1 = require("react/jsx-runtime");
const AssetListRow_1 = __importDefault(require("./AssetListRow"));
const ScrollTablePanel_1 = __importDefault(require("./ScrollTablePanel"));
// Matches msTableTw.ts's own rowA/rowB exactly (components/views/
// RadioOverlayPanels/msTableTw.ts) — same constants RewardRow.tsx already
// reuses for the same reason.
exports.ASSET_LIST_ROW_BG_A = 'rgba(56,78,126,0.35)';
exports.ASSET_LIST_ROW_BG_B = 'rgba(156,163,175,0.25)';
function AssetListTable({ rows, metaLabel = 'Token Meta', loadingText = 'Loading…', emptyText = 'No results.', loading = false, }) {
    const header = (
    // 2026-09-16, on request ("do this as well for every row") — header
    // padding/font now match ManageSponsorshipsPanel.tsx's own header row
    // exactly (padding '5px 10px', fontSize 9, fontWeight 700, no
    // uppercase/letterSpacing, color #94a3b8), same treatment already
    // applied to NetworkListTable.tsx's header.
    (0, jsx_runtime_1.jsx)("div", { style: { background: '#2b2b2b', borderBottom: '1px solid #000000' }, children: (0, jsx_runtime_1.jsxs)("div", { style: {
                width: '100%',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 6,
                padding: '5px 10px',
            }, children: [(0, jsx_runtime_1.jsx)("div", { style: { textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#94a3b8' }, children: metaLabel }), (0, jsx_runtime_1.jsx)("div", { style: { width: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right', fontSize: 9, fontWeight: 700, color: '#94a3b8' }, children: "Info" })] }) }));
    return (
    // 2026-09-16, on request — borderRadius 12 (was 20) + a real visible
    // border (was none), same treatment already applied to
    // NetworkListTable.tsx's container. bufferPadding stays "0" —
    // unchanged, this card genuinely sits flush inside its caller in the
    // real app (DataListSelect.tsx's own comment confirms this — unlike
    // networks.tsx, which really does have outer breathing room); adding
    // margin here would be a real deviation from the app this mirrors, not
    // just a missed style.
    (0, jsx_runtime_1.jsx)(ScrollTablePanel_1.default, { header: header, bufferPadding: "0", style: { borderRadius: 12, border: '1px solid #334155', background: '#243056', color: '#5981F3', boxSizing: 'border-box' }, children: loading ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: '16px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }, children: loadingText })) : rows.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { style: { padding: '16px', textAlign: 'center', fontSize: 12, color: '#94a3b8' }, children: emptyText })) : (rows.map((row, i) => ((0, jsx_runtime_1.jsx)("div", { style: { background: i % 2 === 0 ? exports.ASSET_LIST_ROW_BG_A : exports.ASSET_LIST_ROW_BG_B }, children: (0, jsx_runtime_1.jsx)(AssetListRow_1.default, { ...row }) }, row.id)))) }));
}
