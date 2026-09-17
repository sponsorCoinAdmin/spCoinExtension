// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SponsorStakingListPanel.tsx
// Portable placeholder for SPONSOR_STAKING_LIST (2026-09-12) — thin
// wrapper over GenericListPanel.tsx (see its own doc comment for the full
// "why"). The real app version (components/views/RadioOverlayPanels/
// SponsorStakingListPanel.tsx) is a genuinely intricate live breakdown
// (recipient/agent stake-weighted share percentages, per-bucket rate
// columns, "No Agent" rows — see docs/handoff.md's own extensive
// 2026-08-26 notes on it) with no meaning at all without a real connected
// account's on-chain staking data. This ports only the outer list shape.
// Placeholder, not logic, per explicit instruction.
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorStakingListPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const GenericListPanel_1 = __importDefault(require("./GenericListPanel"));
function SponsorStakingListPanel({ rows }) {
    return (0, jsx_runtime_1.jsx)(GenericListPanel_1.default, { showSearch: false, rows: rows, emptyText: "No sponsored recipients yet." });
}
