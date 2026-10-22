// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/DeleteWalletDialog.tsx
//
// 2026-10-08 -- the confirmation popup for deleting the wallet from this device: it asks for the wallet password and deletes only when the host says
// the password is right. Host-independent: the host supplies confirmDelete(password), which throws a readable message for a wrong password.
//
// 2026-10-22 (owner request): the submit button itself carries the whole state (see dialogStyle.deleteConfirmButton's own doc comment) -- blue
// "Password Required" while empty, green with the host's confirmLabel once something is typed, a quick double red/green flash on a wrong password,
// then solid red with the server's own message for a few seconds before it reverts on its own. A wrong password is kept, not cleared (the same
// rule the login screen follows), so a typo can be fixed instead of retyped. An eye icon toggles the field between masked and plain text.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { dialogStyle } from '@sponsorcoin/spcoin-common/styles';
import { Eye, EyeOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import DialogPortal from './DialogPortal';
const FLASH_STEP_MS = 150;
const FLASH_STEPS = 4; // two full red/green cycles
const ERROR_SHOWN_MS = 5000; // how long the solid red state stays, after the flash settles
/**
 * 2026-10-11 (docs/design/accountAuthDesign.txt 14.3, item V5): `warning` carries the host's wording for what is lost (the default says the wallet is removed from this device); `title` and `confirmLabel` keep a
 * host's own words (the web's development keystore says "Remove Account"); `footnote` is optional small print under the buttons.
 */
export default function DeleteWalletDialog({ confirmDelete, onClose, warning, title = 'Delete wallet', confirmLabel = 'Delete wallet', footnote }) {
    const [password, setPassword] = useState('');
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState('');
    const [errorNonce, setErrorNonce] = useState(0);
    const [flashOn, setFlashOn] = useState(false);
    const [errorSettled, setErrorSettled] = useState(false);
    const [busy, setBusy] = useState(false);
    // one failed submit runs the flash, then the solid error, then clears itself -- a SECOND failure (even with the identical message) must restart the
    // whole sequence, which is why this keys off a nonce rather than the error text (two equal strings would not re-trigger a dependent effect).
    useEffect(() => {
        if (errorNonce === 0)
            return;
        setErrorSettled(false);
        setFlashOn(true);
        let step = 1;
        const flashTimer = setInterval(() => {
            step += 1;
            setFlashOn((v) => !v);
            if (step >= FLASH_STEPS) {
                clearInterval(flashTimer);
                setErrorSettled(true);
            }
        }, FLASH_STEP_MS);
        const revertTimer = setTimeout(() => {
            setError('');
            setErrorSettled(false);
        }, FLASH_STEPS * FLASH_STEP_MS + ERROR_SHOWN_MS);
        return () => {
            clearInterval(flashTimer);
            clearTimeout(revertTimer);
        };
    }, [errorNonce]);
    const variant = error ? (errorSettled ? 'error' : 'flash') : password ? 'ready' : 'empty';
    const label = busy ? 'Deleting…' : error ? error : password ? confirmLabel : 'Password Required';
    return (_jsx(DialogPortal, { children: _jsx("div", { id: "DELETE_WALLET_DIALOG", role: "dialog", "aria-modal": "true", style: dialogStyle.backdrop, children: _jsxs("form", { style: dialogStyle.formCardDanger, onSubmit: (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setError('');
                    confirmDelete(password)
                        .catch((err) => {
                        setError(err instanceof Error ? err.message : 'The wallet could not be deleted.');
                        setErrorNonce((n) => n + 1);
                    })
                        .finally(() => setBusy(false));
                }, children: [_jsx("p", { style: dialogStyle.title, children: title }), _jsx("p", { style: dialogStyle.warning, children: warning ?? 'This deletes the wallet and all its accounts from this device. You can only get them back with your Secret Recovery Phrase (imported accounts need their private keys).' }), _jsxs("div", { style: dialogStyle.inputWrap, children: [_jsx("input", { type: visible ? 'text' : 'password', autoFocus: true, autoComplete: "current-password", placeholder: "Enter your password to confirm", value: password, onChange: (e) => setPassword(e.target.value), style: dialogStyle.input }), _jsx("button", { type: "button", onClick: () => setVisible((v) => !v), "aria-label": visible ? 'Hide password' : 'Show password', title: visible ? 'Hide password' : 'Show password', style: dialogStyle.eyeButton, children: visible ? _jsx(EyeOff, { size: 16 }) : _jsx(Eye, { size: 16 }) })] }), _jsx("button", { type: "submit", disabled: busy || !password, style: dialogStyle.deleteConfirmButton(variant, flashOn, busy), children: label }), _jsx("button", { type: "button", onClick: onClose, style: dialogStyle.cancelButton, children: "Cancel" }), footnote && _jsx("p", { style: dialogStyle.footnote, children: footnote })] }) }) }));
}
