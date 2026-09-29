// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/DetailPanelEmptyState.tsx
// Portable placeholder covering SIX panel-tree ids at once: ACCOUNT_PANEL,
// AGENT_PANEL, SPONSOR_PANEL, RECIPIENT_PANEL, TOKEN_PANEL, NETWORK_PANEL
// (2026-09-12). Each real version (AccountPanel/AccountPanelView.tsx,
// AgentPanel/index.tsx, SponsorAccountPanel/index.tsx, RecipientPanel/
// index.tsx, TokenPanel/index.tsx, NetworkPanel/index.tsx) shares the exact
// same shape via AccountDetailPanelShell/AccountDetailEmptyState: when
// nothing is selected (the ONLY reachable state without a live account/
// token/network — the case every other placeholder here is already
// limited to), each shows nothing but this one plain message box. One
// shared component instead of six near-identical copies — placeholders,
// not logic, per explicit instruction.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
export default function DetailPanelEmptyState({ title, roles }) {
    return (_jsxs("div", { style: { padding: 12, fontSize: 12, color: '#e2e8f0' }, children: [_jsx("p", { style: { margin: '0 0 6px', fontWeight: 600 }, children: title }), roles && roles.length > 0 && (_jsxs("p", { style: { margin: 0 }, children: ["Select ", roles.length === 1 ? 'an' : 'a', ' ', roles.map((role, i) => (_jsxs(React.Fragment, { children: [i > 0 ? (i === roles.length - 1 ? ' or ' : ', ') : '', _jsx("strong", { children: role })] }, role))), ' ', "to manage."] }))] }));
}
