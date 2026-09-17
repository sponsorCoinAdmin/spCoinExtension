// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SponsorshipPanel.tsx
// Portable placeholder for SPONSORSHIP_PANEL (2026-09-12) — the real app
// version (components/views/RadioOverlayPanels/SponsorPanel.tsx) reads a
// live recipient/sponsor account, a real Uniswap V3 quote
// (useUniswapV3CombinedQuote), and posts a real on-chain stake
// (lib/spCoin/swap.tsx's doSponsorStake) — none of which exists in a
// standalone consumer (the extension, today). Same shape ("You are
// Sponsoring <recipient>" header, pay row, staked-amount row, submit
// button, fee disclosures link), entirely inert. Placeholder, not logic,
// per explicit instruction.
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SponsorshipPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const packageBuildTag_1 = require("./packageBuildTag");
const TabBodyMarker_1 = __importDefault(require("./TabBodyMarker"));
const TradeAmountRow_1 = __importDefault(require("./TradeAmountRow"));
function SponsorshipPanel({ recipientName = 'Recipient Name not Specified', payTokenSymbol, payTokenAddress, payTokenIcon, stakedTokenSymbol, stakedTokenAddress, stakedTokenIcon, onSubmit, submitLabel = 'Enter an Amount', onRecipientClick, onPayTokenClick, onStakedRecipientIconClick, }) {
    return (
    // 2026-09-14 — same fix as SendTabPanel.tsx's own comment: gap:8/
    // padding:12 was an invented value never tied to anything real. The
    // real app's SponsorPanel.tsx container uses TSP_TW.gap (`gap-1`, 4px)
    // — the same constant TradingStationPanel.tsx (Swap) matches — so this
    // now uses that file's own gap:4/padding:8 instead.
    (0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, padding: 8 }, children: [(0, jsx_runtime_1.jsx)(TabBodyMarker_1.default, { path: "SponsorshipPanel.tsx", build: packageBuildTag_1.PACKAGE_BUILD }), (0, jsx_runtime_1.jsxs)("div", { onClick: onRecipientClick, style: { textAlign: 'center', cursor: onRecipientClick ? 'pointer' : 'default' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontSize: 10, color: '#94a3b8' }, children: "You are Sponsoring" }), (0, jsx_runtime_1.jsx)("div", { style: { fontSize: 15, fontWeight: 700, color: '#ffffff' }, children: recipientName })] }), (0, jsx_runtime_1.jsx)(TradeAmountRow_1.default, { label: "You Exactly Pay:", tokenIcon: payTokenIcon, tokenSymbol: payTokenSymbol, tokenAddress: payTokenAddress, balanceText: "Balance: 0", onTokenPillClick: onPayTokenClick }), (0, jsx_runtime_1.jsx)(TradeAmountRow_1.default, { label: "New Recipient Staked spCoins", tokenIcon: stakedTokenIcon, tokenSymbol: stakedTokenSymbol, tokenAddress: stakedTokenAddress, balanceText: "Sponsor Staked spCoins: 0", onTokenPillClick: onRecipientClick, onIconClick: onStakedRecipientIconClick }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onSubmit, style: {
                    width: '100%',
                    borderRadius: 8,
                    border: 'none',
                    background: '#243056',
                    color: '#7d8ec9',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '10px 0',
                    cursor: onSubmit ? 'pointer' : 'default',
                }, children: submitLabel }), (0, jsx_runtime_1.jsx)("div", { style: { textAlign: 'left', fontSize: 10, color: '#64748b', textDecoration: 'underline', cursor: 'default' }, children: "Fee Disclosures" })] }));
}
