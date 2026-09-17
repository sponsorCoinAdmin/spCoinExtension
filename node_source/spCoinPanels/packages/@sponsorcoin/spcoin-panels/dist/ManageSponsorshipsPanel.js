// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/ManageSponsorshipsPanel.tsx
// Portable placeholder for MANAGE_SPONSORSHIPS_PANEL (2026-09-12, revised
// 2026-09-14 — see docs/design/extensionPlan.md's "Fourth slice" entry
// for the full investigation). The ORIGINAL version of this file (a flat
// "Total Pending Rewards / [amount] / Claim" row + an empty
// GenericListPanel) was found to have no counterpart anywhere in the real
// app: components/views/RadioOverlayPanels/ManageSponsorshipsPanel.tsx
// actually renders a real SpCoins/Amount/Options table (Trading, Staked,
// Pending rows; Pending expands into Sponsor/Recipient/Agent sub-rows;
// a closing Total Coins row) that was simply never ported. This revision
// ports that table's SHAPE only — no hover/loading states, no real
// on-chain estimate/claim calls, no per-row error states — same
// "placeholder, not logic" treatment as every other file here.
//
// Gated by a NEW, genuinely Merit-only panel id ('MERIT_REWARDS_SUMMARY',
// panelState.ts) rather than the real MANAGE_SPONSORSHIPS_PANEL (21) —
// that real id already has confirmed non-Merit readers
// (useHeaderController.ts, useActiveWalletPanelTitle.tsx), so migrating
// it would risk the exact split-brain bug class already caught once for
// MENU_TAB_HEADER_BAR (see extensionPlan.md §7). Zero connection between
// the two — different engine, different id, real app untouched.
'use client';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ManageSponsorshipsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const MeritPanelGate_1 = __importDefault(require("./MeritPanelGate"));
const RewardRow_1 = __importStar(require("./RewardRow"));
const RewardsPendingByAccountTypePanel_1 = __importDefault(require("./RewardsPendingByAccountTypePanel"));
const packageBuildTag_1 = require("./packageBuildTag");
const TabBodyMarker_1 = __importDefault(require("./TabBodyMarker"));
function ManageSponsorshipsPanel({ tradingAmountText = '0', stakedAmountText = '0', pendingAmountText = '0', totalCoinsText = '0', onStake, onUnstake, onTogglePending, onClaimAll, pendingByAccountType, }) {
    return ((0, jsx_runtime_1.jsx)(MeritPanelGate_1.default, { panel: "MERIT_REWARDS_SUMMARY", lazyLoad: false, children: (0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative', display: 'flex', flexDirection: 'column' }, children: [(0, jsx_runtime_1.jsx)(TabBodyMarker_1.default, { path: "ManageSponsorshipsPanel.tsx", build: packageBuildTag_1.PACKAGE_BUILD }), (0, jsx_runtime_1.jsxs)("div", { style: { borderRadius: 12, border: '1px solid #334155', overflow: 'hidden', margin: '0 8px 8px 8px' }, children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                padding: '5px 10px',
                                background: '#2b2b2b',
                                borderBottom: '1px solid #000000',
                                gap: 6,
                            }, children: [(0, jsx_runtime_1.jsx)("div", { style: { flex: `0 0 ${RewardRow_1.REWARD_ROW_LABEL_WIDTH}px`, textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#94a3b8' }, children: "SpCoins" }), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1, textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#94a3b8' }, children: "Amount" }), (0, jsx_runtime_1.jsx)("div", { style: { flexShrink: 0, minWidth: 40, textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#94a3b8' }, children: "Options" })] }), (0, jsx_runtime_1.jsx)(RewardRow_1.default, { label: "Trading", amountText: tradingAmountText, buttonLabel: "Stake", onClick: onStake, rowBg: RewardRow_1.REWARD_ROW_BG_A }), (0, jsx_runtime_1.jsx)(RewardRow_1.default, { label: "Staked", amountText: stakedAmountText, buttonLabel: "Unstake", onClick: onUnstake, rowBg: RewardRow_1.REWARD_ROW_BG_B }), (0, jsx_runtime_1.jsx)(RewardRow_1.default, { label: "Pending", amountText: pendingAmountText, buttonLabel: "Claim", onClick: onClaimAll !== null && onClaimAll !== void 0 ? onClaimAll : onTogglePending, rowBg: RewardRow_1.REWARD_ROW_BG_A }), (0, jsx_runtime_1.jsx)(RewardsPendingByAccountTypePanel_1.default, { ...pendingByAccountType }), (0, jsx_runtime_1.jsxs)("div", { style: {
                                display: 'flex',
                                alignItems: 'center',
                                padding: '5px 10px',
                                borderTop: '1px solid #1e293b',
                                gap: 6,
                                background: RewardRow_1.REWARD_ROW_BG_A,
                            }, children: [(0, jsx_runtime_1.jsx)("div", { style: { flex: `0 0 ${RewardRow_1.REWARD_ROW_LABEL_WIDTH}px`, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#ffffff' }, children: "Total Coins" }), (0, jsx_runtime_1.jsx)("div", { style: { flex: 1, textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#ffffff' }, children: totalCoinsText })] })] })] }) }));
}
