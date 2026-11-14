// File: src/SecuritySetupScreen.tsx
//
// 2026-11-13 (owner request: "put all the options on this page with a checkbox in front of each; unchecked: do not expand it; checked: open it; this is also the screen the Config option check opens to set up"):
// the ONE sign-in options screen. First-run setup shows it as the third page (password -> Secret Recovery Phrase -> this -> warning, with Skip / Continue), and Config -> Security shows the same screen (no Skip button).
// Every option is a check box row: unticked it is just its title; ticked it opens. Ticking one that is not set up opens its setup; ticking one that is set up switches it on; unticking switches it off (the setup is kept).
// The password is always on. Passcode and a phone or email code are listed as coming soon. The host supplies what is kept and checked (enrollTotp / enrollPasskey / signIn); an option the host does not supply is not offered.
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { assetPreviewRowStyle, formKitStyle, recoveryPhraseStyle } from '@sponsorcoin/spcoin-common/styles';
import { STATIC_INFO_ICON_URL } from '@sponsorcoin/spcoin-feeds/shared';
import { useState } from 'react';
import { LOCAL_STORAGE_WARNING } from './SecurityWarningScreen';
import { useCopyFeedback } from './platform/useCopyFeedback';
import { passkeysSupported, registerPasskey } from './security/passkey';
import { generateTotpSecret, otpauthUri, verifyTotp } from './security/totp';
export const TOTP_INFO = 'An authenticator app keeps a secret key and turns it into a 6 digit code that changes every 30 seconds. When a second step is asked for, you type the current code. Someone who knows your password still cannot approve without your phone. If you lose the phone, set it up again.';
export const PASSKEY_INFO = 'A passkey is a private key held by this device, your phone or a security key, and unlocked with your fingerprint, face or screen lock. It never leaves the device and cannot be phished. Approving means unlocking the device instead of typing a code. If you lose the device, set it up again.';
const PASSWORD_INFO = 'The password unlocks this wallet on this device and protects its keys, so it is always on and cannot be switched off. Press its name to show or hide its settings.';
const PASSCODE_INFO = 'A short number you type to unlock the wallet. Coming soon.';
const MFA_INFO = 'A code sent to your phone or email as a further step. It needs the Merit server to send the message. Coming soon.';
const muted = formKitStyle.muted;
const box = formKitStyle.box('12px');
/**
 * An option's header line: its name (press it to open or close the option), a check box that only says whether the method is ACTIVE, and the info icon at the end of the line (the same icon the lists use);
 * pressing the icon shows what the option is for. An option with no `expanded` (coming soon) has a plain name.
 */
export function OptionTitle({ id, title, info, expanded, onToggle, active }) {
    const [shown, setShown] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { style: recoveryPhraseStyle.titleRow, children: [_jsxs("div", { style: recoveryPhraseStyle.saveLabel, children: [expanded === undefined ? (_jsx("span", { style: formKitStyle.heading, children: title })) : (_jsx("button", { type: "button", id: `${id}_HEADER`, "aria-expanded": expanded, onClick: onToggle, style: recoveryPhraseStyle.iconButton('inherit'), children: _jsxs("span", { style: formKitStyle.heading, children: [expanded ? '▾' : '▸', " ", title] }) })), _jsx("input", { type: "checkbox", id: `${id}_CHECK`, "aria-label": `${title}: active`, title: active.checked ? 'Active' : 'Not active', checked: active.checked, disabled: active.disabled, onChange: (e) => active.onChange(e.target.checked) })] }), _jsx("button", { type: "button", id: id, "aria-label": `About ${title}`, title: info, onClick: () => setShown((open) => !open), style: assetPreviewRowStyle.button(true), children: _jsx("img", { src: STATIC_INFO_ICON_URL, alt: "Info", style: assetPreviewRowStyle.img }) })] }), shown && _jsx("p", { id: `${id}_TEXT`, style: muted, children: info })] }));
}
export default function SecuritySetupScreen({ enrollTotp, enrollPasskey, credentials, accountLabel = 'Merit Wallet', signIn, onDone, makeSecret = generateTotpSecret, passwordContent, accountButtons }) {
    const [, setTick] = useState(0);
    const refresh = () => setTick((n) => n + 1);
    // which rows are open: pressing a name opens or closes it (the password's settings start open; the check boxes only say whether a method is active)
    const [open, setOpen] = useState({ password: true, passkey: false, totp: false });
    const [localDone, setLocalDone] = useState({ passkey: false, totp: false });
    const [secret, setSecret] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const { copied, copy } = useCopyFeedback();
    const canPasskey = !!enrollPasskey && !!credentials && passkeysSupported(credentials);
    const enrolled = (key) => (signIn ? signIn.enrolled()[key] : localDone[key]);
    const anyEnrolled = enrolled('passkey') || enrolled('totp');
    const active = (key) => (signIn ? signIn.options()[key] : localDone[key]);
    // pressing a name: open or close the option; opening the authenticator when it is not set up starts its setup
    const toggleOpen = (key) => {
        setError('');
        const next = !open[key];
        setOpen((previous) => ({ ...previous, [key]: next }));
        if (key === 'totp') {
            if (next && !enrolled('totp') && !secret)
                setSecret(makeSecret());
            if (!next && !enrolled('totp')) {
                setSecret('');
                setCode('');
            }
        }
    };
    // the check box: switch a method on or off. A method that is not set up cannot be on, so ticking it opens its setup (it turns on when the setup finishes).
    const setActive = (key, on) => {
        setError('');
        if (!on) {
            signIn?.setOption(key, false);
            if (!signIn)
                setLocalDone((previous) => ({ ...previous, [key]: false }));
        }
        else if (enrolled(key)) {
            signIn?.setOption(key, true);
        }
        else {
            setOpen((previous) => ({ ...previous, [key]: true }));
            if (key === 'totp' && !secret)
                setSecret(makeSecret());
        }
        refresh();
    };
    const startTotpAgain = () => {
        setError('');
        setSecret(makeSecret());
        setCode('');
    };
    const confirmTotp = async () => {
        setBusy(true);
        setError('');
        try {
            if (!(await verifyTotp(secret, code)))
                throw new Error('That code did not match. Check the code in your app and try again.');
            await enrollTotp?.(secret);
            setLocalDone((previous) => ({ ...previous, totp: true }));
            setSecret('');
            setCode('');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'The authenticator app could not be added.');
        }
        finally {
            setBusy(false);
            refresh();
        }
    };
    const addPasskey = async () => {
        setBusy(true);
        setError('');
        try {
            await enrollPasskey?.(await registerPasskey({ id: accountLabel, name: accountLabel }, credentials));
            setLocalDone((previous) => ({ ...previous, passkey: true }));
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'The passkey could not be added.');
        }
        finally {
            setBusy(false);
            refresh();
        }
    };
    const totpSettingUp = open.totp && !!secret && !enrolled('totp');
    return (_jsxs("div", { id: "WALLET_ONBOARDING_SECURITY", style: onDone ? formKitStyle.scrollBox(12) : box, children: [_jsx("p", { style: formKitStyle.heading, children: onDone ? 'Protect your wallet (optional)' : 'Sign-in options' }), _jsxs("p", { style: muted, children: ["Choose what the wallet asks for when you unlock it. A second step proves it is really you, so a password alone is not enough. Press an option's name to open it and set it up; its box says whether it is active.", onDone ? ' You can change these later in Config, Security.' : ''] }), _jsx(OptionTitle, { id: "WALLET_SIGN_IN_PASSWORD", title: "Use password", info: PASSWORD_INFO, expanded: passwordContent ? open.password : undefined, onToggle: () => toggleOpen('password'), active: { checked: true, disabled: true, onChange: () => undefined } }), passwordContent && open.password && _jsx("div", { id: "WALLET_SIGN_IN_PASSWORD_CARD", style: box, children: passwordContent }), enrollPasskey && (_jsxs(_Fragment, { children: [_jsx(OptionTitle, { id: "WALLET_SIGN_IN_PASSKEY", title: canPasskey ? 'Use passkey' : 'Use passkey (not available in this browser)', info: PASSKEY_INFO, expanded: open.passkey, onToggle: () => toggleOpen('passkey'), active: { checked: active('passkey'), disabled: !canPasskey, onChange: (on) => setActive('passkey', on) } }), open.passkey && (_jsx("div", { id: "WALLET_SECURITY_PASSKEY_CARD", style: box, children: enrolled('passkey') ? (_jsxs(_Fragment, { children: [_jsx("p", { id: "WALLET_SECURITY_PASSKEY_DONE", style: muted, children: "Passkey is set up. The wallet asks for it when you unlock." }), _jsx("button", { type: "button", id: "WALLET_SECURITY_PASSKEY_ADD", disabled: busy, style: formKitStyle.ghost, onClick: () => void addPasskey(), children: busy ? 'Waiting for your device…' : 'Set up another passkey' })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { style: muted, children: "Use your fingerprint, face or screen lock, or a security key, instead of typing a code. Nothing to type or remember." }), _jsx("button", { type: "button", id: "WALLET_SECURITY_PASSKEY_ADD", disabled: busy, style: formKitStyle.ghost, onClick: () => void addPasskey(), children: busy ? 'Waiting for your device…' : 'Set up passkey' })] })) }))] })), enrollTotp && (_jsxs(_Fragment, { children: [_jsx(OptionTitle, { id: "WALLET_SIGN_IN_TOTP", title: "Use authenticator app", info: TOTP_INFO, expanded: open.totp, onToggle: () => toggleOpen('totp'), active: { checked: active('totp'), onChange: (on) => setActive('totp', on) } }), open.totp && (_jsx("div", { id: "WALLET_SECURITY_TOTP_CARD", style: box, children: totpSettingUp ? (_jsxs("div", { id: "WALLET_SECURITY_TOTP", style: box, children: [_jsx("p", { style: muted, children: "A free app on your phone (Google Authenticator, Microsoft Authenticator, 1Password or Authy) that shows a new 6 digit code every 30 seconds." }), _jsx("p", { style: muted, children: "1. Open your authenticator app and choose \"Add account\" then \"Enter a setup key\"." }), _jsx("p", { style: muted, children: "2. Type or copy this key into it:" }), _jsx("input", { id: "WALLET_SECURITY_TOTP_SECRET", readOnly: true, value: secret, style: formKitStyle.input, onFocus: (e) => e.currentTarget.select() }), _jsx("button", { type: "button", style: formKitStyle.ghost, onClick: () => copy(secret), children: copied ? 'Copied' : 'Copy key' }), _jsx("a", { href: otpauthUri(secret, accountLabel), style: muted, children: "Open in an authenticator app on this device" }), _jsx("p", { style: muted, children: "3. Type the 6 digit code the app now shows:" }), _jsx("input", { id: "WALLET_SECURITY_TOTP_CODE", inputMode: "numeric", autoComplete: "one-time-code", maxLength: 7, placeholder: "6 digit code", value: code, onChange: (e) => setCode(e.target.value), style: formKitStyle.input }), _jsx("button", { type: "button", disabled: busy || code.replace(/\s/g, '').length !== 6, style: formKitStyle.primaryDim(busy || code.replace(/\s/g, '').length !== 6), onClick: () => void confirmTotp(), children: busy ? 'Checking…' : 'Verify and add' })] })) : (_jsxs(_Fragment, { children: [_jsx("p", { id: "WALLET_SECURITY_TOTP_DONE", style: muted, children: "Authenticator app is set up. The wallet asks for its code when you unlock." }), _jsx("button", { type: "button", id: "WALLET_SECURITY_TOTP_ADD", disabled: busy, style: formKitStyle.ghost, onClick: startTotpAgain, children: "Set up again" })] })) }))] })), _jsx(OptionTitle, { id: "WALLET_SIGN_IN_PASSCODE", title: "Use passcode (coming soon)", info: PASSCODE_INFO, active: { checked: false, disabled: true, onChange: () => undefined } }), _jsx(OptionTitle, { id: "WALLET_SIGN_IN_MFA", title: "Use phone or email code (coming soon)", info: MFA_INFO, active: { checked: false, disabled: true, onChange: () => undefined } }), accountButtons, !onDone && (_jsxs("div", { id: "WALLET_SECURITY_LOCAL_WARNING", role: "note", children: [_jsx("p", { style: formKitStyle.error, children: "Stored only on this device" }), LOCAL_STORAGE_WARNING.map((line) => _jsx("p", { style: muted, children: line }, line))] })), error && _jsx("p", { style: formKitStyle.error, children: error }), onDone && _jsx("button", { type: "button", id: "WALLET_SECURITY_DONE", disabled: totpSettingUp, style: formKitStyle.primaryDim(totpSettingUp), onClick: onDone, children: anyEnrolled ? 'Continue' : 'Skip for now' })] }));
}
