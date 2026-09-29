// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/TransactionConfirmPanel.tsx
//
// 2026-09-22, Phase B.2 Stage 4.c — the real transaction-confirmation
// screen, on request ("do it" after docs/npmMigrationDesign.md's Stage 28
// cross-check confirmed this is the actual next step). This is NOT a
// promotion of the web app's real ProcessFlowPanel.tsx (604 lines) — that
// component's own doc comment records a deliberate 2026-08-20 product
// decision: every Merit-authorized write AUTO-APPROVES with no Reject/
// Approve step unless the account happens to be locked or "Mandatory
// Approval Required" is separately toggled on. Stage 25 (npmMigrationDesign.md)
// already recorded the opposite decision for the extension, confirmed via
// AskUserQuestion: "the extension's 4.c confirmation screen shows
// unconditionally, every write, regardless of lock state or the
// mandatory-approval setting — deliberately stricter than the web app's
// own default." So this is new, real logic, not an extraction.
//
// Also deliberately simpler than ProcessFlowPanel.tsx's own avatar-arrow-
// chain visual (AccountAvatar/MessageAccountRow/AvatarArrowChain) — checked
// each of those directly before writing this: AccountAvatar.tsx pulls in
// useOpenAccountComponent/useWalletAccountsList (real ExchangeContext/
// Merit-wallet-list coupling), and MessageAccountRow.tsx wraps a full
// AccountSelectDropDown — neither portable today, and porting them is a
// separate, bigger scope than "build the confirmation gate" calls for.
// Plain rows (optional logoURL <img>, no click/select behavior) cover the
// real job here — showing a person what they're about to sign — without
// taking on that extra dependency chain.
//
// Data shape intentionally mirrors components/wallet/lib/meritConnect's
// MeritApprovalRequest fields (accounts/tokens/amount/chainId/
// contractAddress/title) that ProcessFlowPanel.tsx already renders, so a
// future caller feeding this from a real request object needs no
// reshaping — same MessageTokenEntry/MessageAmountEntry/MessageAccountEntry-
// shaped data lib/structure/types.ts already defines for ErrorMessage.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
};
const avatarStyle = {
    height: 28,
    width: 28,
    borderRadius: 6,
    objectFit: 'contain',
    flexShrink: 0,
    background: '#1f2639',
};
function AccountRow({ entry }) {
    return (_jsxs("div", { style: rowStyle, children: [entry.logoURL ? (_jsx("img", { src: entry.logoURL, alt: "", style: avatarStyle })) : (_jsx("div", { style: avatarStyle })), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: { color: '#94a3b8', fontSize: 10 }, children: entry.role }), _jsx("div", { style: { color: '#e2e8f0', fontWeight: 600 }, children: entry.symbol ?? entry.name ?? entry.address }), (entry.symbol || entry.name) && (_jsx("div", { style: { color: '#64748b', fontSize: 10, wordBreak: 'break-all' }, children: entry.address }))] })] }));
}
function TokenRow({ entry }) {
    return (_jsxs("div", { style: rowStyle, children: [entry.logoURL ? (_jsx("img", { src: entry.logoURL, alt: "", style: avatarStyle })) : (_jsx("div", { style: avatarStyle })), _jsxs("div", { style: { minWidth: 0 }, children: [_jsx("div", { style: { color: '#94a3b8', fontSize: 10 }, children: entry.label }), _jsx("div", { style: { color: '#e2e8f0', fontWeight: 600 }, children: entry.symbol ?? entry.name ?? entry.address }), entry.address && (entry.symbol || entry.name) && (_jsx("div", { style: { color: '#64748b', fontSize: 10, wordBreak: 'break-all' }, children: entry.address }))] })] }));
}
export default function TransactionConfirmPanel({ title, message, accounts, tokens, amount, chainId, contractAddress, busy = false, onApprove, onReject, }) {
    return (_jsxs("div", { style: {
            boxSizing: 'border-box',
            position: 'absolute',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 16,
            background: '#11162a',
            overflowY: 'auto',
        }, children: [_jsx("h2", { style: { margin: 0, fontSize: 15, fontWeight: 700, color: '#ffffff', textAlign: 'center' }, children: title }), message && (_jsx("p", { style: { margin: 0, fontSize: 12, color: '#94a3b8', textAlign: 'center' }, children: message })), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10 }, children: [accounts?.map((entry, i) => _jsx(AccountRow, { entry: entry }, `account-${i}`)), tokens?.map((entry, i) => _jsx(TokenRow, { entry: entry }, `token-${i}`)), amount && (_jsxs("div", { style: rowStyle, children: [_jsx("span", { style: { color: '#94a3b8', minWidth: 60 }, children: amount.label }), _jsx("span", { style: { color: '#e2e8f0', fontWeight: 600 }, children: amount.value })] })), typeof chainId === 'number' && (_jsxs("div", { style: rowStyle, children: [_jsx("span", { style: { color: '#94a3b8', minWidth: 60 }, children: "Chain ID" }), _jsx("span", { style: { color: '#e2e8f0', fontFamily: 'monospace' }, children: chainId })] })), contractAddress && (_jsxs("div", { style: rowStyle, children: [_jsx("span", { style: { color: '#94a3b8', minWidth: 60 }, children: "Contract" }), _jsx("span", { style: { color: '#e2e8f0', fontFamily: 'monospace', wordBreak: 'break-all', fontSize: 10 }, children: contractAddress })] }))] }), _jsx("div", { style: { flex: 1 } }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { type: "button", onClick: onReject, disabled: busy, style: {
                            flex: 1,
                            borderRadius: 8,
                            border: '1px solid #334155',
                            background: 'transparent',
                            padding: '10px 0',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#94a3b8',
                            cursor: busy ? 'default' : 'pointer',
                            opacity: busy ? 0.5 : 1,
                        }, children: "Reject" }), _jsx("button", { type: "button", onClick: onApprove, disabled: busy, style: {
                            flex: 1,
                            borderRadius: 8,
                            border: 'none',
                            background: '#5981F3',
                            padding: '10px 0',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#ffffff',
                            cursor: busy ? 'default' : 'pointer',
                            opacity: busy ? 0.7 : 1,
                        }, children: busy ? 'Signing…' : 'Approve' })] })] }));
}
