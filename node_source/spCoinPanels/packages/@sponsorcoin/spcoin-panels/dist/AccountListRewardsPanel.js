// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AccountListRewardsPanel.tsx
// Portable placeholder for ACCOUNT_LIST_REWARDS_PANEL (2026-09-12) — thin
// wrapper over GenericListPanel.tsx (see its own doc comment for the full
// "why"). The real app version reads live per-account reward totals.
// Placeholder, not logic, per explicit instruction.
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AccountListRewardsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const GenericListPanel_1 = __importDefault(require("./GenericListPanel"));
function AccountListRewardsPanel({ rows }) {
    return (0, jsx_runtime_1.jsx)(GenericListPanel_1.default, { showSearch: false, rows: rows, emptyText: "No reward accounts yet." });
}
