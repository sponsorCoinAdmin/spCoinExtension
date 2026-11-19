// File: src/standalone/useStandaloneApproval.ts
//
// 2026-11-19 (docs/design/standAloneWalletInstall.txt) -- the stand-alone wallet's APPROVAL SCREEN: the first request waiting in the vault's approval queue, drawn as the wallet's own approval page (the same TransactionConfirmPanel the extension and the web
// app show, in the same `approvalPage` slot, so it appears inside the wallet's chrome). Nothing signs until Approve is clicked; Reject (or the page's back arrow) rejects the request, which the caller sees as a rejection. Several requests queue and are shown one at a time.
'use client';
import { createElement, useCallback, useState, useSyncExternalStore } from 'react';
import { TransactionConfirmPanel } from '@sponsorcoin/spcoin-panels';
import { describeApproval } from './describeApproval';
/** The approval page for the first pending request, or undefined when none is waiting. */
export function useStandaloneApproval(approvals, nativeSymbol) {
    // the queue's ids are the snapshot: it changes exactly when a request arrives or is decided
    useSyncExternalStore((listener) => approvals.onChange(listener), () => approvals.list().map((a) => a.id).join(','), () => '');
    const [busyId, setBusyId] = useState(undefined);
    const pending = approvals.list()[0];
    const approve = useCallback(async () => {
        if (!pending)
            return;
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
        if (pending)
            approvals.reject(pending.id);
    }, [approvals, pending]);
    if (!pending)
        return undefined;
    const view = describeApproval(pending, nativeSymbol);
    const element = createElement(TransactionConfirmPanel, {
        title: view.title,
        message: view.message,
        accounts: view.accounts,
        amount: view.amount,
        chainId: view.chainId,
        contractAddress: view.contractAddress,
        busy: busyId === pending.id,
        embedded: true,
        onApprove: approve,
        onReject: reject,
    });
    return { title: view.title, element, onCancel: reject };
}
