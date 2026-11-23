// File: src/approval/useApprovalPage.ts
//
// 2026-11-23 (consolidation): the approval PAGE of a wallet that holds its own vault: the first request waiting in the vault's approval queue, drawn by the shared TransactionApprovalScreen in the wallet's `approvalPage` slot, so it appears inside the wallet's chrome.
// The browser wallet and the stand-alone wallet each carried a copy of this hook (the stand-alone one still drew the old plain panel); both now use this one. Nothing signs until Approve is clicked; Reject (or the page's back arrow) rejects the request,
// which the caller sees as a rejection. Several requests queue and are shown one at a time.
'use client';
import { createElement, useCallback, useRef, useState, useSyncExternalStore } from 'react';
import TransactionApprovalScreen from './TransactionApprovalScreen';
import { describeApproval } from './transactionApproval';
/** The approval page for the first pending request, or undefined when none is waiting. `rpcUrl` lets the screen estimate gas. */
export function useApprovalPage(approvals, nativeSymbol, rpcUrl) {
    // the queue's ids are the snapshot: it changes exactly when a request arrives or is decided
    useSyncExternalStore((listener) => approvals.onChange(listener), () => approvals.list().map((a) => a.id).join(','), () => '');
    const [busyId, setBusyId] = useState(undefined);
    // the ids already decided (or being decided): a fast double click on Approve or Reject must not decide the same request twice (the second call would throw "No such pending request")
    const decided = useRef(new Set());
    const pending = approvals.list()[0];
    const approve = useCallback(async () => {
        if (!pending || decided.current.has(pending.id))
            return;
        decided.current.add(pending.id);
        setBusyId(pending.id);
        try {
            // runs the signing and broadcast; a failure is delivered to the original caller, not thrown here
            await approvals.approve(pending.id);
        }
        finally {
            setBusyId(undefined);
        }
    }, [approvals, pending]);
    const reject = useCallback(() => {
        if (!pending || decided.current.has(pending.id))
            return;
        decided.current.add(pending.id);
        approvals.reject(pending.id);
    }, [approvals, pending]);
    if (!pending)
        return undefined;
    const view = describeApproval(pending, nativeSymbol);
    const element = createElement(TransactionApprovalScreen, {
        info: pending,
        nativeSymbol,
        rpcUrl,
        busy: busyId === pending.id,
        onApprove: approve,
        onReject: reject,
    });
    return { title: view.title, element, onCancel: reject };
}
