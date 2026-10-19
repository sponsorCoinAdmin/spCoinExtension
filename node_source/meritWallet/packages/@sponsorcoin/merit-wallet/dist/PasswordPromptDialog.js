// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/PasswordPromptDialog.tsx
//
// 2026-10-08 -- a small popup that asks for the wallet password and hands it to the host's confirm call; a wrong password shows the host's message
// inside the popup and keeps it open. Host-independent (no web or chrome code). DeleteWalletDialog is the red, wording-specific cousin of this.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { dialogStyle } from '@sponsorcoin/spcoin-common/styles';
import { useState } from 'react';
export default function PasswordPromptDialog({ title, message, confirmLabel, onConfirm, onClose, }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    // No form element: the dialog is mounted inside other forms (the account detail's), and a native submit from a nested form reloaded the extension's page and could run that form's own save. A button click and the Enter key do the work.
    const submit = () => {
        if (busy || !password)
            return;
        setBusy(true);
        setError('');
        onConfirm(password)
            .catch((err) => {
            setError(err instanceof Error ? err.message : 'That did not work.');
            setPassword('');
        })
            .finally(() => setBusy(false));
    };
    return (_jsx("div", { role: "dialog", "aria-modal": "true", style: dialogStyle.backdrop, children: _jsxs("div", { style: dialogStyle.formCard, children: [_jsx("p", { style: dialogStyle.title, children: title }), _jsx("p", { style: dialogStyle.message, children: message }), _jsx("input", { type: "password", autoFocus: true, autoComplete: "current-password", placeholder: "Wallet password", value: password, onChange: (e) => setPassword(e.target.value), onKeyDown: (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            submit();
                        }
                    }, style: dialogStyle.input }), error && _jsx("p", { style: dialogStyle.error, children: error }), _jsx("button", { type: "button", onClick: submit, disabled: busy || !password, style: dialogStyle.primaryButton(busy || !password), children: busy ? 'Working…' : confirmLabel }), _jsx("button", { type: "button", onClick: onClose, style: dialogStyle.cancelButton, children: "Cancel" })] }) }));
}
