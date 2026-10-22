// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/PasswordPromptDialog.tsx
//
// 2026-10-08 -- a small popup that asks for the wallet password and hands it to the host's confirm call; a wrong password shows the host's message
// inside the popup and keeps it open. Host-independent (no web or chrome code). DeleteWalletDialog is the red, wording-specific cousin of this.
'use client';

import { dialogStyle } from '@sponsorcoin/spcoin-common/styles';
import React, { useState } from 'react';
import DialogPortal from './DialogPortal';

export default function PasswordPromptDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  /** Throw (a readable message) for a wrong password; resolve to close. */
  onConfirm(password: string): Promise<void>;
  onClose(): void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // No form element: the dialog is mounted inside other forms (the account detail's), and a native submit from a nested form reloaded the extension's page and could run that form's own save. A button click and the Enter key do the work.
  const submit = () => {
    if (busy || !password) return;
    setBusy(true);
    setError('');
    onConfirm(password)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'That did not work.');
        setPassword('');
      })
      .finally(() => setBusy(false));
  };
  return (
    <DialogPortal>
    <div
      role="dialog"
      aria-modal="true"
      style={dialogStyle.backdrop}
    >
      <div
        style={dialogStyle.formCard}
      >
        <p style={dialogStyle.title}>{title}</p>
        <p style={dialogStyle.message}>{message}</p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Wallet password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          style={dialogStyle.input}
        />
        {error && <p style={dialogStyle.error}>{error}</p>}
        <button type="button" onClick={submit} disabled={busy || !password} style={dialogStyle.primaryButton(busy || !password)}>
          {busy ? 'Working…' : confirmLabel}
        </button>
        <button type="button" onClick={onClose} style={dialogStyle.cancelButton}>
          Cancel
        </button>
      </div>
    </div>
    </DialogPortal>
  );
}
