// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AssetListSelectPanel.tsx
// Portable placeholder for ASSET_LIST_SELECT_PANEL (2026-09-12) — thin
// wrapper over GenericListPanel.tsx (see its own doc comment for the full
// "why"). The real app version amalgamates several real feeds (token
// list, account list, agent/recipient/sponsor remote lists — see
// lib/structure's FEED_TYPE) behind one search box. Placeholder, not
// logic, per explicit instruction.
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AssetListSelectPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const GenericListPanel_1 = __importDefault(require("./GenericListPanel"));
function AssetListSelectPanel({ searchPlaceholder = 'Search tokens or accounts', rows }) {
    return (0, jsx_runtime_1.jsx)(GenericListPanel_1.default, { searchPlaceholder: searchPlaceholder, rows: rows, emptyText: "No results yet." });
}
