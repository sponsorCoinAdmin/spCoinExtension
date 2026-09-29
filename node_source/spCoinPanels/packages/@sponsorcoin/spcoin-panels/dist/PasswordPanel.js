// File: node_source/spCoinPanels/packages/@sponsorcoin/spcoin-panels/src/PasswordPanel.tsx
// 2026-09-23 — real migration (parity pass). The portable presentation
// (logo, title, password field(s), submit button, checking/setup/unlock modes)
// moved here from the real app's version
// (components/views/RadioOverlayPanels/PasswordPanel.tsx), which is now a thin
// wrapper resolving useSpCoinWallet (setWalletPassword/unlockWallet/
// walletPasswordCheckError) and passing them as props. A new `clearOnSubmit`
// opt-in prop was added so the web app's "clear typed password on submit"
// behavior survives the split. Inline styles (no Tailwind), same reasoning
// as every sibling component.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
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
export default function PasswordPanel({ mode = 'unlock', icon, errorText, onSubmit, submitting = false, clearOnSubmit = false, }) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const isSetupMode = mode === 'setup';
    const isCheckingStatus = mode === 'checking';
    const title = isCheckingStatus
        ? 'Checking Merit Wallet…'
        : isSetupMode
            ? 'Create Your Merit Wallet Password'
            : 'Unlock Merit Wallet';
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center' }, children: [icon && _jsx("div", { style: { width: '100%', maxWidth: 160 }, children: icon }), _jsx("h2", { style: { margin: 0, fontSize: 15, fontWeight: 600, color: '#ffffff' }, children: title }), isSetupMode && (_jsx("p", { style: { margin: 0, fontSize: 11, color: '#94a3b8' }, children: "This one password protects every account you Import or Create in Merit Wallet." }))] }), errorText && (_jsx("div", { style: { borderRadius: 8, background: 'rgba(127,29,29,0.6)', padding: '6px 10px', fontSize: 10, color: '#fca5a5' }, children: errorText })), !isCheckingStatus && (_jsxs("form", { onSubmit: (e) => {
                    e.preventDefault();
                    onSubmit?.(password);
                    if (clearOnSubmit) {
                        setPassword('');
                        setConfirmPassword('');
                    }
                }, style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsx("input", { type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Password", autoComplete: isSetupMode ? 'new-password' : 'current-password', style: inputStyle }), isSetupMode && (_jsx("input", { type: "password", value: confirmPassword, onChange: (e) => setConfirmPassword(e.target.value), placeholder: "Confirm password", autoComplete: "new-password", style: inputStyle })), _jsx("button", { type: "submit", disabled: submitting || !password || (isSetupMode && !confirmPassword), style: {
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
