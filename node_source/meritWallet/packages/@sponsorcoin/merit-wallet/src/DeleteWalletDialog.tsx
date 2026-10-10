// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/DeleteWalletDialog.tsx
//
// 2026-10-08 -- the confirmation popup for deleting the wallet from this device: it asks for the wallet password and deletes only when the host says
// the password is right. Host-independent: the host supplies confirmDelete(password), which throws a readable message for a wrong password.
'use client';

import React, { useState } from 'react';

export default function DeleteWalletDialog({ confirmDelete, onClose }: { confirmDelete(password: string): Promise<void>; onClose(): void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div
      id="DELETE_WALLET_DIALOG"
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}
    >
      <form
        style={{ boxSizing: 'border-box', width: '100%', maxWidth: 340, background: '#0E111B', border: '1px solid #7f1d1d', borderRadius: 12, padding: 16, color: '#fff', display: 'flex', flexDirection: 'column', gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          confirmDelete(password)
            .catch((err: unknown) => {
              setError(err instanceof Error ? err.message : 'The wallet could not be deleted.');
              setPassword('');
            })
            .finally(() => setBusy(false));
        }}
      >
        <p style={{ margin: 0, fontWeight: 700 }}>Delete wallet</p>
        <p style={{ margin: 0, fontSize: 12, color: '#fbbf24' }}>
          This deletes the wallet and all its accounts from this device. You can only get them back with your Secret Recovery Phrase (imported accounts need their private keys).
        </p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Enter your password to confirm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ boxSizing: 'border-box', width: '100%', borderRadius: 8, border: '1px solid #334155', background: '#0b0e17', padding: '8px 12px', color: '#fff', font: 'inherit', outline: 'none' }}
        />
        {error && <p style={{ margin: 0, fontSize: 12, color: '#f87171' }}>{error}</p>}
        <button type="submit" disabled={busy || !password} style={{ borderRadius: 8, border: 0, background: '#b91c1c', color: '#fff', padding: '8px 16px', fontWeight: 600, cursor: 'pointer', font: 'inherit', opacity: busy || !password ? 0.6 : 1 }}>
          {busy ? 'Deleting…' : 'Delete wallet'}
        </button>
        <button type="button" onClick={onClose} style={{ borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#fff', padding: '8px 16px', cursor: 'pointer', font: 'inherit' }}>
          Cancel
        </button>
      </form>
    </div>
  );
}
