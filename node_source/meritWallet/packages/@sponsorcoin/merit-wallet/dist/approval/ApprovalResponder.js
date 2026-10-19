// File: src/approval/ApprovalResponder.tsx
//
// 2026-10-18 (docs/meritMigration.txt row 12): the screen that ANSWERS a write's approval request. A write (swap, send, stake, claim) asks the approval store (approval/meritApproval.ts) and waits; this component, which the wallet
// draws itself, shows the same confirmation the extension shows (spcoin-panels TransactionConfirmPanel: Approve / Reject, and the password field when the wallet is locked) when a person is needed, and resolves the request.
//   - the dev chain's quiet signing and a wallet that is unlocked with no mandatory approval need no person: the request resolves at once (as the extension's does; MetaMask asks only when it needs an answer);
//   - a locked wallet asks for the password on the same screen (the host says how it is checked: `unlock`), a wrong password stays on the screen with its error;
//   - Reject resolves the request false.
// It moved here from the web's components/views/RadioOverlayPanels/ProcessFlowPanel.tsx (350 lines, with a 5 s debug hold), so every app answers an approval the same way and the host mounts nothing.
'use client';
import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { TransactionConfirmPanel } from '@sponsorcoin/spcoin-panels';
import { approvalStyle } from '@sponsorcoin/spcoin-common/styles';
import { getPendingMeritApproval, resolveMeritApproval, subscribeMeritApproval } from './meritApproval';
export default function ApprovalResponder({ host }) {
    const [request, setRequest] = useState(getPendingMeritApproval());
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [isApprovalOpen, setIsApprovalOpen] = useState(false);
    const [passwordConfirmed, setPasswordConfirmed] = useState(false);
    const [isSigning, setIsSigning] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    useEffect(() => subscribeMeritApproval(setRequest), []);
    // a new request starts every step closed
    useEffect(() => {
        setIsPasswordOpen(false);
        setIsApprovalOpen(false);
        setPasswordConfirmed(false);
        setIsSigning(false);
        setPasswordError('');
    }, [request?.id]);
    // 'decide': a person is needed (password, then approval) or the request resolves at once; resolveMeritApproval ignores a request that already moved on
    useEffect(() => {
        if (request?.phase !== 'decide')
            return;
        if (request.isLocked && !passwordConfirmed) {
            setIsPasswordOpen(true);
            return;
        }
        if (request.needsApproval) {
            setIsApprovalOpen(true);
            return;
        }
        if (request.manualAdvance && host?.waitForManualAdvance) {
            let cancelled = false;
            host.waitForManualAdvance().then(() => { if (!cancelled)
                resolveMeritApproval(true); }).catch(() => undefined);
            return () => { cancelled = true; };
        }
        const timer = setTimeout(() => resolveMeritApproval(true), 0);
        return () => clearTimeout(timer);
    }, [request?.id, request?.phase, request?.isLocked, request?.needsApproval, request?.manualAdvance, passwordConfirmed, host]);
    // one screen, one action: Approve (with the password when the wallet is locked) unlocks and approves in that one step
    const approve = async (password) => {
        if (request?.isLocked && !passwordConfirmed) {
            const unlocked = host?.unlock ? await host.unlock(password ?? '') : false;
            if (!unlocked) {
                setPasswordError('Incorrect password.');
                return;
            }
            setPasswordError('');
            setPasswordConfirmed(true);
            setIsPasswordOpen(false);
        }
        setIsSigning(true);
        resolveMeritApproval(true);
    };
    const phase = request?.phase;
    const showing = (phase === 'decide' || isSigning) && ((request?.isLocked && !passwordConfirmed && isPasswordOpen) || (request?.needsApproval && isApprovalOpen));
    if (!showing || !request)
        return null;
    return (_jsx("div", { style: approvalStyle.backdrop, children: _jsx("div", { style: approvalStyle.column, children: _jsx(TransactionConfirmPanel, { title: request.title ?? `Approve ${request.label}`, message: "Review this transaction before it is signed.", accounts: request.accounts?.map((entry) => ({
                    role: entry.role,
                    address: String(entry.account?.address ?? ''),
                    symbol: entry.account?.symbol,
                    name: entry.account?.name,
                    logoURL: entry.account?.logoURL,
                })), tokens: request.tokens?.map((entry) => ({
                    label: entry.label,
                    symbol: entry.token?.symbol,
                    name: entry.token?.name,
                    address: entry.token?.address,
                    logoURL: entry.token?.logoURL,
                })), amount: request.amount ? { label: request.amount.label, value: request.amount.value } : undefined, chainId: request.chainId, contractAddress: request.contractAddress, busy: isSigning, requirePassword: Boolean(request.isLocked && !passwordConfirmed), passwordError: passwordError, onApprove: (password) => void approve(password), onReject: () => {
                    setIsApprovalOpen(false);
                    setIsPasswordOpen(false);
                    resolveMeritApproval(false);
                } }) }) }));
}
