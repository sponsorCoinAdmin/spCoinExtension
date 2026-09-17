// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/AgentHeaderPanel.tsx
// Portable placeholder for AGENT_HEADER_PANEL (2026-09-12) — the real app
// version (components/views/Headers/AgentHeaderContainer.tsx) reads
// useAgentAccount (live selected agent), seeds a default from
// NEXT_PUBLIC_DEFAULT_AGENT_ADDRESS via a real on-chain hydrate, and wires
// Alt+A/Alt+M keyboard shortcuts through the app's own panel-tree — none
// of which exist in a standalone consumer (the extension, today). Same
// shape (agent name/placeholder title, "Your Sponsor Agent" subtitle,
// centered AgentSelectDropDown pill below), entirely inert — every prop
// optional with safe do-nothing defaults, same "presentation only, no
// sync yet" scope every other extension-bound component here follows.
'use client';
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AgentHeaderPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const AgentSelectDropDown_1 = __importDefault(require("./AgentSelectDropDown"));
function AgentHeaderPanel({ agentName, titlePlaceholder = 'Select Agent', subtitle = 'Your Sponsor Agent', icon, address, symbol, placeholderLabel, onSelectClick, }) {
    const title = (agentName === null || agentName === void 0 ? void 0 : agentName.trim()) || titlePlaceholder;
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("div", { style: {
                    position: 'relative',
                    flexShrink: 0,
                    userSelect: 'none',
                    paddingTop: 12,
                    paddingBottom: 2,
                    textAlign: 'center',
                }, children: [(0, jsx_runtime_1.jsx)("h2", { style: {
                            margin: 0,
                            fontSize: 20,
                            fontWeight: 800,
                            lineHeight: 1.2,
                            letterSpacing: '0.02em',
                            color: '#5981F3',
                        }, children: title }), (0, jsx_runtime_1.jsx)("p", { style: { margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }, children: subtitle })] }), (0, jsx_runtime_1.jsx)("div", { style: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderBottom: '1px solid rgba(51,65,85,0.5)',
                    paddingBottom: 2,
                }, children: (0, jsx_runtime_1.jsx)(AgentSelectDropDown_1.default, { icon: icon, address: address, symbol: symbol, placeholderLabel: placeholderLabel, onSelectClick: onSelectClick }) })] }));
}
