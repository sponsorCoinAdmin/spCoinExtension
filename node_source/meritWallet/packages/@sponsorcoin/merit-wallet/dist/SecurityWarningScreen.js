// File: src/SecurityWarningScreen.tsx
//
// 2026-11-13 (owner request: a warning page with a Continue option, the 4th page of first-run setup: password -> Secret Recovery Phrase -> second step -> this): says plainly that everything is kept only on this device and that
// the Merit server cannot help if it is lost. Shown whether or not a second step was added; Continue needs the "I understand" box.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { recoveryPhraseStyle } from '@sponsorcoin/spcoin-common/styles';
import { useState } from 'react';
/** The warning, one sentence group per line (owner wording, cleaned up 2026-11-13). Also the short note inside Security. */
export const LOCAL_STORAGE_WARNING = [
    'Your password, Secret Recovery Phrase, keys and any second step you add are stored only on this device. This is for your privacy: the Merit server cannot see them and cannot recover them.',
    'If this device is lost or destroyed, they can be lost permanently along with funds they protect.',
    'Safeguard your passwords and private keys in a secure, backed up location such as a hardware wallet or secured paper wallet.',
];
export default function SecurityWarningScreen({ onContinue }) {
    const [understood, setUnderstood] = useState(false);
    return (_jsxs("div", { id: "WALLET_ONBOARDING_WARNING", style: recoveryPhraseStyle.scrollBox, children: [_jsx("p", { style: recoveryPhraseStyle.title, children: "Keep your own backup" }), LOCAL_STORAGE_WARNING.map((line) => _jsx("p", { style: recoveryPhraseStyle.muted, children: line }, line)), _jsxs("label", { style: recoveryPhraseStyle.saveLabel, children: [_jsx("input", { id: "WALLET_ONBOARDING_WARNING_CHECK", type: "checkbox", checked: understood, onChange: (e) => setUnderstood(e.target.checked) }), " I understand the risk"] }), _jsx("button", { type: "button", id: "WALLET_ONBOARDING_WARNING_CONTINUE", disabled: !understood, style: recoveryPhraseStyle.primaryButton(understood), onClick: onContinue, children: "Continue" })] }));
}
