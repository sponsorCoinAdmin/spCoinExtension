// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/ChangePasswordPanel.tsx
//
// 2026-10-08 -- change the wallet password: old password, new password, confirmation. Host-independent: the host supplies the call that
// re-encrypts the vault (the extension sends merit/vault/changePassword to its worker, which checks the old password again).
'use client';

import React, { useState } from 'react';
import { MIN_WALLET_PASSWORD_LENGTH } from './session/walletSession';

const BORDER = '#334155';
const box: React.CSSProperties = { boxSizing: 'border-box', width: '100%', padding: 12, color: '#fff', display: 'flex', flexDirection: 'column', gap: 8 };
const field: React.CSSProperties = { boxSizing: 'border-box', width: '100%', borderRadius: 8, border: '1px solid ' + BORDER, background: '#0E111B', padding: '8px 12px', color: '#fff', font: 'inherit', outline: 'none' };
const primary: React.CSSProperties = { boxSizing: 'border-box', width: '100%', borderRadius: 8, border: 0, background: '#5981F3', padding: '8px 16px', fontWeight: 600, color: '#fff', cursor: 'pointer', font: 'inherit' };

export default function ChangePasswordPanel({ changePassword, onDone }: { changePassword(oldPassword: string, newPassword: string): Promise<void>; onDone(): void }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);

  if (changed) {
    return (
      <div id="WALLET_PASSWORD_CHANGED" style={box}>
        <p style={{ margin: 0 }}>Your password was changed.</p>
        <button type="button" style={primary} onClick={onDone}>Done</button>
      </div>
    );
  }
  return (
    <form
      id="WALLET_CHANGE_PASSWORD"
      style={box}
      onSubmit={(e) => {
        e.preventDefault();
        if (newPw.length < MIN_WALLET_PASSWORD_LENGTH) return setError('Password must be at least ' + MIN_WALLET_PASSWORD_LENGTH + ' characters.');
        if (newPw !== confirm) return setError('Passwords do not match.');
        setBusy(true);
        setError('');
        changePassword(oldPw, newPw)
          .then(() => setChanged(true))
          .catch((err: unknown) => setError(err instanceof Error ? err.message : 'The password could not be changed.'))
          .finally(() => setBusy(false));
      }}
    >
      <p style={{ margin: 0, fontWeight: 600 }}>Change password</p>
      <input type="password" autoComplete="current-password" placeholder="Current password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} style={field} />
      <input type="password" autoComplete="new-password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={field} />
      <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={field} />
      {error && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{error}</p>}
      <button type="submit" disabled={busy || !oldPw} style={{ ...primary, opacity: busy || !oldPw ? 0.6 : 1 }}>{busy ? 'Changing…' : 'Change password'}</button>
    </form>
  );
}
