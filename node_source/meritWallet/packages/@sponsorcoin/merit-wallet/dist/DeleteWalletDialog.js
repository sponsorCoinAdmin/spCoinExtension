// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/DeleteWalletDialog.tsx
//
// 2026-10-08 -- the confirmation popup for deleting the wallet from this device: it asks for the wallet password and deletes only when the host says
// the password is right. Host-independent: the host supplies confirmDelete(password), which throws a readable message for a wrong password.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { dialogStyle } from '@sponsorcoin/spcoin-common/styles';
import { useState } from 'react';
import DialogPortal from './DialogPortal';
/**
 * 2026-10-11 (docs/design/accountAuthDesign.txt 14.3, item V5): `warning` carries the host's wording for what is lost (the default says the wallet is removed from this device); `title` and `confirmLabel` keep a
 * host's own words (the web's development keystore says "Remove Account"); `footnote` is optional small print under the buttons.
 */
export default function DeleteWalletDialog({ confirmDelete, onClose, warning, title = 'Delete wallet', confirmLabel = 'Delete wallet', footnote }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    return (_jsx(DialogPortal, { children: _jsx("div", { id: "DELETE_WALLET_DIALOG", role: "dialog", "aria-modal": "true", style: dialogStyle.backdrop, children: _jsxs("form", { style: dialogStyle.formCardDanger, onSubmit: (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError('');
                    confirmDelete(password)
                        .catch((err) => {
                        setError(err instanceof Error ? err.message : 'The wallet could not be deleted.');
                        setPassword('');
                    })
                        .finally(() => setBusy(false));
                }, children: [_jsx("p", { style: dialogStyle.title, children: title }), _jsx("p", { style: dialogStyle.warning, children: warning ?? 'This deletes the wallet and all its accounts from this device. You can only get them back with your Secret Recovery Phrase (imported accounts need their private keys).' }), _jsx("input", { type: "password", autoFocus: true, autoComplete: "current-password", placeholder: "Enter your password to confirm", value: password, onChange: (e) => setPassword(e.target.value), style: dialogStyle.input }), error && _jsx("p", { style: dialogStyle.error, children: error }), _jsx("button", { type: "submit", disabled: busy || !password, style: dialogStyle.dangerButton(busy || !password), children: busy ? 'Deleting…' : confirmLabel }), _jsx("button", { type: "button", onClick: onClose, style: dialogStyle.cancelButton, children: "Cancel" }), footnote && _jsx("p", { style: dialogStyle.footnote, children: footnote })] }) }) }));
}
