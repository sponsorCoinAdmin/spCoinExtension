// File: src/TransferApprovalHost.ts
//
// 2026-10-12 (docs/authenticationDesign.txt V11): the extension's own screen for "a site wants a copy of an account's private key": the warning in plain words and the wallet password (checked against the vault first; a wrong one stays on the screen). Closing it says no.
// Plain .ts with React.createElement, like TransactionConfirmOrchestrator.ts. It lives in the extension, never in the page, so a page cannot draw it or answer it.
import { createElement, useEffect, useState } from 'react';
import { PasswordPromptDialog } from '@sponsorcoin/merit-wallet';
import { finishTransferApproval, getTransferApproval, subscribeTransferApproval, type TransferApprovalRequest } from './transferApprovalStore';

export function TransferApprovalHost() {
  const [request, setRequest] = useState<TransferApprovalRequest | null>(getTransferApproval());
  useEffect(() => subscribeTransferApproval(setRequest), []);
  if (!request) return null;
  return createElement(PasswordPromptDialog, {
    title: 'Give this site a copy of an account key?',
    message: `${request.origin} is asking for a COPY of the private key of ${request.address}. Anyone who has that key controls the account. Only agree if you trust this site and want it to hold the account (for example your own browser wallet). Type your wallet password to agree, or close this to say no.`,
    confirmLabel: 'Give a copy',
    onClose: () => finishTransferApproval(undefined),
    onConfirm: async (password: string) => {
      const verified = (await chrome.runtime.sendMessage({ type: 'merit/vault/verifyPassword', password })) as { ok: boolean; error?: string; message?: string };
      if (!verified.ok) throw new Error(verified.error === 'too-many-attempts' ? verified.message || 'Too many incorrect passwords. Wait a moment and try again.' : 'Incorrect password.');
      finishTransferApproval(password);
    },
  });
}
