// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/panels/AcknowledgeDialog.tsx
//
// 2026-11-10 (owner, docs/design/removeAccountPlan.txt): the small popup behind a check box of the Remove Account confirmation. Two shapes:
// The words, a radio button that is a TOGGLE (pressing it again clears it; "I understand" ...), and two buttons: the accepting one (Delete Anyway / Confirm) is dimmed until the radio is on and then checks the box; Reject / Cancel, or the X at the top right, closes the popup and leaves the box unchecked.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { acknowledgeStyle, dialogStyle } from '@sponsorcoin/spcoin-common/styles';
import { X } from 'lucide-react';
import { useState } from 'react';
import DialogPortal from '../DialogPortal';
export default function AcknowledgeDialog({ ack, onAccept, onClose }) {
    const [understood, setUnderstood] = useState(false);
    return (_jsx(DialogPortal, { children: _jsx("div", { role: "dialog", "aria-modal": "true", "aria-label": ack.title, style: dialogStyle.backdrop, children: _jsxs("div", { style: acknowledgeStyle.card, children: [_jsx("button", { type: "button", onClick: onClose, "aria-label": "Close", title: "Close", style: acknowledgeStyle.closeButton, children: _jsx(X, { size: 16 }) }), _jsx("p", { style: acknowledgeStyle.title, children: ack.title }), _jsx("p", { style: acknowledgeStyle.leftWarning, children: ack.message }), ack.detail ? _jsx("p", { style: acknowledgeStyle.detail, children: ack.detail }) : null, _jsxs("label", { style: acknowledgeStyle.radioRow, children: [_jsx("input", { type: "radio", name: "acknowledge", checked: understood, onChange: () => undefined, onClick: () => setUnderstood((v) => !v), style: acknowledgeStyle.input }), ack.choiceLabel] }), _jsx("button", { type: "button", disabled: !understood, onClick: onAccept, style: dialogStyle.dangerButton(!understood, true), children: ack.acceptLabel }), _jsx("button", { type: "button", onClick: onClose, style: dialogStyle.cancelButton, children: ack.rejectLabel })] }) }) }));
}
