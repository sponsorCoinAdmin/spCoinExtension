// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/PasswordPanel.tsx
// Portable placeholder for PASSWORD_PANEL (2026-09-12) — the real app
// version (components/views/RadioOverlayPanels/PasswordPanel.tsx) reads a
// live `useSpCoinWallet()` (real setWalletPassword/unlockWallet calls
// against the actual Merit keystore) — none of which exists in a
// standalone consumer (the extension, today). Same shape (logo, title,
// password field(s), submit button), entirely inert unless the caller
// wires `onSubmit` — same "presentation only, no sync yet" scope every
// other extension-bound component here follows. Inline styles (no
// Tailwind), same reasoning as every sibling component.
'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PasswordPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#0e111b',
    padding: '8px 10px',
    fontSize: 12,
    color: '#ffffff',
    outline: 'none',
};
function PasswordPanel({ mode = 'unlock', icon, errorText, onSubmit, submitting = false, }) {
    const [password, setPassword] = (0, react_1.useState)('');
    const [confirmPassword, setConfirmPassword] = (0, react_1.useState)('');
    const isSetupMode = mode === 'setup';
    const isCheckingStatus = mode === 'checking';
    const title = isCheckingStatus
        ? 'Checking Merit Wallet…'
        : isSetupMode
            ? 'Create Your Merit Wallet Password'
            : 'Unlock Merit Wallet';
    return ((0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }, children: [(0, jsx_runtime_1.jsxs)("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }, children: [icon && (0, jsx_runtime_1.jsx)("div", { style: { width: '100%', maxWidth: 160 }, children: icon }), (0, jsx_runtime_1.jsx)("h2", { style: { margin: 0, fontSize: 15, fontWeight: 600, color: '#ffffff' }, children: title }), isSetupMode && ((0, jsx_runtime_1.jsx)("p", { style: { margin: 0, fontSize: 11, color: '#94a3b8' }, children: "This one password protects every account you Import or Create in Merit Wallet." }))] }), errorText && ((0, jsx_runtime_1.jsx)("div", { style: { borderRadius: 8, background: 'rgba(127,29,29,0.6)', padding: '6px 10px', fontSize: 10, color: '#fca5a5' }, children: errorText })), !isCheckingStatus && ((0, jsx_runtime_1.jsxs)("form", { onSubmit: (e) => {
                    e.preventDefault();
                    onSubmit === null || onSubmit === void 0 ? void 0 : onSubmit(password);
                }, style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [(0, jsx_runtime_1.jsx)("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Password", autoComplete: isSetupMode ? 'new-password' : 'current-password', style: inputStyle }), isSetupMode && ((0, jsx_runtime_1.jsx)("input", { type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "Confirm password", autoComplete: "new-password", style: inputStyle })), (0, jsx_runtime_1.jsx)("button", { type: "submit", disabled: submitting || !password || (isSetupMode && !confirmPassword), style: {
                            width: '100%',
                            borderRadius: 8,
                            border: 'none',
                            background: '#5981F3',
                            padding: '8px 0',
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#ffffff',
                            cursor: submitting ? 'default' : 'pointer',
                            opacity: submitting || !password || (isSetupMode && !confirmPassword) ? 0.5 : 1,
                        }, children: submitting ? 'Please wait...' : isSetupMode ? 'Create Password' : 'Unlock' })] }))] }));
}
