// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/ConnectedPasswordPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 21) -- the PASSWORD_PANEL overlay slot, moved from the web app's
// components/views/RadioOverlayPanels/PasswordPanel.tsx. The form is spcoin-panels' PasswordPanel; the rules (length, match, "Incorrect password.",
// busy state) are the shared unlock gate in ./session/walletSession (the same function the Merit Wallet component's own password screen uses). What a
// host supplies is the phase it knows and the two calls that create / unlock its wallet, so the web app passes walletState's and the
// extension passes the vault's.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { PanelGate, PasswordPanel as PortablePasswordPanel } from '@sponsorcoin/spcoin-panels';
import { passwordModeFor, submitWalletPassword } from './session/walletSession';
export default function ConnectedPasswordPanel({ phase, adapter, hostError, icon }) {
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const handleSubmit = async (password, confirmPassword) => {
        setSubmitting(true);
        setError('');
        try {
            const result = await submitWalletPassword(phase, adapter, password, confirmPassword);
            if (!result.ok)
                setError(result.error);
        }
        finally {
            setSubmitting(false);
        }
    };
    return (_jsx(PanelGate, { panel: SP_COIN_DISPLAY.PASSWORD_PANEL, lazyLoad: false, children: _jsx(PortablePasswordPanel, { mode: passwordModeFor(phase), icon: icon, errorText: hostError || error, onSubmit: (pw, confirm) => void handleSubmit(pw, confirm), submitting: submitting, clearOnSubmit: true }) }));
}
