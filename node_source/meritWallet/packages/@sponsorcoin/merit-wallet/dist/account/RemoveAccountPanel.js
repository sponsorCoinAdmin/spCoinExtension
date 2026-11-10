// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/RemoveAccountPanel.tsx
//
// 2026-11-08 (owner, docs/design/removeAccountPlan.txt rows 5 and 6): the red "Remove Account" button under the account details, and the plain confirmation it opens (no password: the account still exists in the wallet that holds it).
// The button's words, the dialog's words and the call all come from the AccountRemoval the screen was given (accountSource.ts); this file only draws them. Disabled (with the reason under it) for the active account.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { dialogStyle, removeAccountStyle } from '@sponsorcoin/spcoin-common/styles';
import DialogPortal from '../DialogPortal';
import AccountDisplayDropDown from '../panels/AccountDisplayDropDown';
export default function RemoveAccountPanel({ removal, account, onRemoved }) {
    const [confirming, setConfirming] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const disabled = !!removal.disabledReason;
    const confirm = () => {
        if (busy)
            return;
        setBusy(true);
        setError('');
        removal
            .remove()
            .then(() => {
            setConfirming(false);
            onRemoved?.();
        })
            .catch((err) => setError(err instanceof Error && err.message ? err.message : 'The account could not be removed.'))
            .finally(() => setBusy(false));
    };
    const close = () => {
        if (busy)
            return;
        setConfirming(false);
        setError('');
    };
    return (_jsxs("div", { id: "REMOVE_ACCOUNT", style: removeAccountStyle.wrap, children: [_jsx("button", { type: "button", disabled: disabled, title: removal.disabledReason, onClick: () => setConfirming(true), style: removeAccountStyle.button(disabled, removal.destructive), children: removal.label }), removal.disabledReason ? _jsx("p", { style: removeAccountStyle.note, children: removal.disabledReason }) : null, confirming ? (_jsx(DialogPortal, { children: _jsx("div", { role: "dialog", "aria-modal": "true", style: dialogStyle.backdrop, children: _jsxs("div", { style: removal.destructive ? dialogStyle.formCardDanger : dialogStyle.formCard, children: [_jsx("p", { style: removeAccountStyle.title, children: removal.title }), _jsx(AccountDisplayDropDown, { address: account.address, name: account.name, symbol: account.symbol, logoURL: account.logoURL }), _jsx("p", { style: dialogStyle.message, children: removal.message }), error ? _jsx("p", { style: dialogStyle.error, children: error }) : null, _jsx("button", { type: "button", onClick: confirm, disabled: busy, style: dialogStyle.dangerButton(busy, removal.destructive), children: busy ? 'Working…' : removal.confirmLabel }), _jsx("button", { type: "button", autoFocus: true, onClick: close, style: dialogStyle.cancelButton, children: "Cancel" })] }) }) })) : null] }));
}
