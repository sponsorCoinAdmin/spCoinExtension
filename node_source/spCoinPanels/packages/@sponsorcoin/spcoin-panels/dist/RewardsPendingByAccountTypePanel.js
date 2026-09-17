// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/RewardsPendingByAccountTypePanel.tsx
// Portable placeholder for the real app's MANAGE_PENDING_REWARDS —
// specifically, the Sponsor/Recipient/Agent rows real ManageSponsorshipsPanel.tsx
// (components/views/RadioOverlayPanels) renders in place of the collapsed
// "Pending" row once expanded. See docs/design/extensionPlan.md's "Fourth
// slice" entry for why this is a NEW, Merit-only panel id
// ('MERIT_REWARDS_PENDING', panelState.ts) rather than the real
// MANAGE_PENDING_REWARDS (12) — that real id already has confirmed
// non-Merit readers, so it stays exactly where it is, untouched.
//
// Same "shape only, entirely inert" treatment as every other placeholder
// here: no hover/loading states, no real per-role on-chain estimate/claim
// calls — a plain label/amount/button row, repeated three times, nested
// (rendered) inside ManageSponsorshipsPanel.tsx.
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
exports.default = RewardsPendingByAccountTypePanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const MeritPanelGate_1 = __importDefault(require("./MeritPanelGate"));
const RewardRow_1 = __importStar(require("./RewardRow"));
function RewardsPendingByAccountTypePanel({ sponsorAmountText = '0', 
// 2026-09-15, on direct request ("there should bo no red N/A. 0 is
// file for the placement") — this is an inert, disconnected placeholder
// (see file header), not a real account read, so there's no real
// "unavailable role" state to warn about here. Defaulting to 'N/A' (and
// flagging `unavailable` off the back of that same literal below) just
// painted these two rows red for no real reason. '0' matches Sponsor's
// own already-correct default.
recipientAmountText = '0', agentAmountText = '0', onClaimSponsor, onClaimRecipient, onClaimAgent, }) {
    return ((0, jsx_runtime_1.jsxs)(MeritPanelGate_1.default, { panel: "MERIT_REWARDS_PENDING", lazyLoad: false, children: [(0, jsx_runtime_1.jsx)(RewardRow_1.default, { label: "Sponsor", amountText: sponsorAmountText, buttonLabel: "Claim", onClick: onClaimSponsor, indent: true, rowBg: RewardRow_1.REWARD_ROW_BG_B }), (0, jsx_runtime_1.jsx)(RewardRow_1.default, { label: "Recipient", amountText: recipientAmountText, buttonLabel: "Claim", onClick: onClaimRecipient, indent: true, rowBg: RewardRow_1.REWARD_ROW_BG_A }), (0, jsx_runtime_1.jsx)(RewardRow_1.default, { label: "Agent", amountText: agentAmountText, buttonLabel: "Claim", onClick: onClaimAgent, indent: true, rowBg: RewardRow_1.REWARD_ROW_BG_B })] }));
}
