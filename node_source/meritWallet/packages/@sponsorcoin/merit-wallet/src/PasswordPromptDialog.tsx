// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/PasswordPromptDialog.tsx
//
// 2026-10-08 -- a small popup that asks for the wallet password and hands it to the host's confirm call; a wrong password shows the host's message
// inside the popup and keeps it open. Host-independent (no web or chrome code). DeleteWalletDialog is the red, wording-specific cousin of this.
'use client';

import React, { useState } from 'react';

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
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
    >
      <form
        style={{ boxSizing: 'border-box', width: '100%', maxWidth: 340, background: '#0E111B', border: '1px solid #334155', borderRadius: 12, padding: 16, color: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          onConfirm(password)
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : 'That did not work.');
              setPassword('');
            })
            .finally(() => setBusy(false));
        }}
      >
        <p style={{ margin: 0, fontWeight: 700 }}>{title}</p>
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{message}</p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Wallet password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ boxSizing: 'border-box', width: '100%', borderRadius: 8, border: '1px solid #334155', background: '#0b0e17', padding: '8px 12px', color: '#fff', font: 'inherit', outline: 'none' }}
        />
        {error && <p style={{ margin: 0, fontSize: 12, color: '#f87171' }}>{error}</p>}
        <button type="submit" disabled={busy || !password} style={{ borderRadius: 8, border: 0, background: '#5981F3', color: '#fff', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', font: 'inherit', opacity: busy || !password ? 0.6 : 1 }}>
          {busy ? 'Working…' : confirmLabel}
        </button>
        <button type="button" onClick={onClose} style={{ borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#fff', padding: '8px 16px', cursor: 'pointer', font: 'inherit' }}>
          Cancel
        </button>
      </form>
    </div>
  );
}
