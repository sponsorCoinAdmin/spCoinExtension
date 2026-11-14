// File: src/UnlockSecondStep.tsx
//
// 2026-11-13 (owner request: sign-in options): after the password is typed on the unlock screen, the steps the person switched on in Config -> Security (passkey, authenticator app) are asked for here, and only when every
// one passes does the unlock go ahead (MeritWallet then calls the host's password submit). These steps are checked on this device.
'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { formKitStyle } from '@sponsorcoin/spcoin-common/styles';
import { useEffect, useRef, useState } from 'react';
const muted = formKitStyle.muted;
export default function UnlockSecondStep({ steps, signIn, onPassed, onCancel }) {
    const [passkeyOk, setPasskeyOk] = useState(!steps.passkey);
    const [totpOk, setTotpOk] = useState(!steps.totp);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const started = useRef(false);
    // The passkey is used as soon as this step shows: no button to press, the device asks straight away (a Try again button appears only if it was refused).
    useEffect(() => {
        if (!steps.passkey || started.current)
            return;
        started.current = true;
        void usePasskey();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const usePasskey = async () => {
        setBusy(true);
        setError('');
        const ok = await signIn.verifyPasskey();
        setBusy(false);
        if (!ok)
            return setError('The passkey was not confirmed.');
        setPasskeyOk(true);
        if (totpOk)
            onPassed();
    };
    const checkCode = async () => {
        setBusy(true);
        setError('');
        const ok = await signIn.verifyTotp(code);
        setBusy(false);
        if (!ok)
            return setError('That code did not match. Check the code in your app and try again.');
        setTotpOk(true);
        setCode('');
        if (passkeyOk)
            onPassed();
    };
    const codeReady = code.replace(/\s/g, '').length === 6;
    return (_jsxs("div", { id: "WALLET_UNLOCK_SECOND_STEP", style: formKitStyle.box('12px'), children: [passkeyOk && _jsx("p", { style: formKitStyle.heading, children: "One more step" }), !passkeyOk && (_jsxs(_Fragment, { children: [_jsx("p", { style: muted, children: error ? 'Your passkey was not confirmed.' : 'Confirm with your passkey on this device…' }), !busy && error && _jsx("button", { type: "button", id: "WALLET_UNLOCK_PASSKEY", style: formKitStyle.primary, onClick: () => void usePasskey(), children: "Try again" })] })), passkeyOk && !totpOk && (_jsxs(_Fragment, { children: [_jsx("p", { style: muted, children: "Type the 6 digit code from your authenticator app." }), _jsx("input", { id: "WALLET_UNLOCK_TOTP_CODE", inputMode: "numeric", autoComplete: "one-time-code", maxLength: 7, placeholder: "6 digit code", value: code, onChange: (e) => setCode(e.target.value), style: formKitStyle.input }), _jsx("button", { type: "button", id: "WALLET_UNLOCK_TOTP", disabled: busy || !codeReady, style: formKitStyle.primaryDim(busy || !codeReady), onClick: () => void checkCode(), children: busy ? 'Checking…' : 'Unlock' })] })), error && passkeyOk && _jsx("p", { style: formKitStyle.error, children: error }), _jsx("button", { type: "button", id: "WALLET_UNLOCK_CANCEL", style: formKitStyle.ghost, onClick: onCancel, children: "Back" })] }));
}
