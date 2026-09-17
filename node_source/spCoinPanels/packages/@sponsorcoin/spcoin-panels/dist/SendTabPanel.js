// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/SendTabPanel.tsx
// Portable placeholder for SEND_PANEL (2026-09-12) — the real app version
// (components/views/RadioOverlayPanels/SendPanel.tsx -> SendComponent.tsx)
// reads a live sell-token contract/balance and a real recipient account,
// and posts a real ERC20 transfer — none of which exists in a standalone
// consumer (the extension, today). Same shape (send-amount row, recipient
// pill, submit button), entirely inert. Named SendTabPanel, not SendPanel,
// to avoid a same-named-different-shape export clash with a future real
// port. Placeholder, not logic, per explicit instruction.
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SendTabPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const packageBuildTag_1 = require("./packageBuildTag");
const TabBodyMarker_1 = __importDefault(require("./TabBodyMarker"));
const TradeAmountRow_1 = __importDefault(require("./TradeAmountRow"));
function SendTabPanel({ sendTokenSymbol, sendTokenAddress, sendTokenIcon, recipientSymbol, recipientAddress, recipientIcon, onSubmit, submitLabel = 'Enter an Amount', onSendTokenClick, onRecipientClick, }) {
    return (
    // 2026-09-14, on request ("spacing between SEND_SELECT_PANEL,
    // SEND_ADDRESS_HEADER_BAR and SEND_BUTTON... not the case in the swap
    // panel") — gap:8/padding:12 here were the same kind of invented,
    // never-tied-to-anything-real values TradingStationPanel.tsx's own
    // header comment already called out and fixed for that file. The real
    // app's SendComponent.tsx container is `gap-1` (4px, no explicit
    // padding of its own) — same TSP_TW.gap constant TradingStationPanel.tsx
    // matches — so this now uses that file's own gap:4/padding:8 instead of
    // a second, larger, made-up value.
    (0, jsx_runtime_1.jsxs)("div", { style: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 4, padding: 8 }, children: [(0, jsx_runtime_1.jsx)(TabBodyMarker_1.default, { path: "SendTabPanel.tsx", build: packageBuildTag_1.PACKAGE_BUILD }), (0, jsx_runtime_1.jsx)(TradeAmountRow_1.default, { label: "You Send", tokenIcon: sendTokenIcon, tokenSymbol: sendTokenSymbol, tokenAddress: sendTokenAddress, balanceText: "Balance: 0", onTokenPillClick: onSendTokenClick }), (0, jsx_runtime_1.jsx)(TradeAmountRow_1.default, { label: "Recipient", tokenIcon: recipientIcon, tokenSymbol: recipientSymbol, tokenAddress: recipientAddress, onTokenPillClick: onRecipientClick }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: onSubmit, style: {
                    width: '100%',
                    borderRadius: 8,
                    border: 'none',
                    background: '#243056',
                    color: '#7d8ec9',
                    fontSize: 12,
                    fontWeight: 600,
                    padding: '10px 0',
                    cursor: onSubmit ? 'pointer' : 'default',
                }, children: submitLabel })] }));
}
