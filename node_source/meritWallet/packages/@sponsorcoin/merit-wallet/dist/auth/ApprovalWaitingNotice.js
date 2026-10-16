// File: src/auth/ApprovalWaitingNotice.tsx
//
// 2026-10-12 (docs/design/accountAuthDesign.txt row 11 / 6A): the neutral "Waiting for X to approve ..." line shown while another wallet is deciding (src/auth/approvalWaiting.ts). It renders nothing when nothing is pending.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState, useSyncExternalStore } from 'react';
import { approvalWaiting, approvalWaitingText } from './approvalWaiting';
export default function ApprovalWaitingNotice({ store = approvalWaiting }) {
    const pending = useSyncExternalStore(store.subscribe, store.getState, store.getState);
    const outcome = useSyncExternalStore(store.subscribe, store.getOutcome, store.getOutcome);
    // while a request is open the line says who is deciding; when one just ended in a refusal it says so, in the wallet's own words
    const text = approvalWaitingText(pending) || outcome?.text || '';
    // 2026-10-14 (owner report: the notice hid the wallet's own buttons): a popup that never blocks. Mouse clicks pass straight through it to what is underneath; its own X dismisses it until the text changes.
    const [dismissed, setDismissed] = useState('');
    useEffect(() => { if (!text)
        setDismissed(''); }, [text]);
    if (!text || dismissed === text)
        return null;
    return (_jsxs("div", { role: "status", "aria-live": "polite", style: { boxSizing: 'border-box', position: 'absolute', top: 6, left: 8, right: 8, zIndex: 40, padding: '8px 10px', borderRadius: 8, border: '1px solid #334155', background: '#0b1220', color: '#cbd5e1', fontSize: 11, boxShadow: '0 8px 24px rgba(0,0,0,0.55)', pointerEvents: 'none', paddingRight: 28 }, children: [text, _jsx("button", { type: "button", "aria-label": "Dismiss", onClick: () => setDismissed(text), style: { position: 'absolute', top: 4, right: 6, pointerEvents: 'auto', background: 'none', border: 0, color: '#94a3b8', cursor: 'pointer', fontSize: 14, lineHeight: 1 }, children: "\u00D7" })] }));
}
