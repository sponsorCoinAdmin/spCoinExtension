// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/ChangePasswordPanel.tsx
//
// 2026-10-08 -- change the wallet password: old password, new password, confirmation. Host-independent: the host supplies the call that
// re-encrypts the vault (the extension sends merit/vault/changePassword to its worker, which checks the old password again).
'use client';

import { formKitStyle } from '@sponsorcoin/spcoin-common/styles';
import React, { useState } from 'react';
import { MIN_WALLET_PASSWORD_LENGTH } from './session/walletSession';

const box = formKitStyle.box(12);
const field = formKitStyle.input;
const primary = formKitStyle.primary;

/**
 * 2026-10-11 (docs/design/accountAuthDesign.txt 14.3, item V5): `note` is the host's own small print (the web's development keystore says that every account is re-encrypted); `title` and `confirmLabel`
 * let a host keep its wording. The new password must also differ from the current one.
 */
export default function ChangePasswordPanel({ changePassword, onDone, note, title = 'Change password', confirmLabel = 'Change password' }: { changePassword(oldPassword: string, newPassword: string): Promise<void>; onDone(): void; note?: string; title?: string; confirmLabel?: string }) {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [changed, setChanged] = useState(false);

  if (changed) {
    return (
      <div id="WALLET_PASSWORD_CHANGED" style={box}>
        <p style={formKitStyle.plain}>Your password was changed.</p>
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
        if (newPw === oldPw) return setError('The new password must be different from the current password.');
        setBusy(true);
        setError('');
        changePassword(oldPw, newPw)
          .then(() => setChanged(true))
          .catch((err: unknown) => setError(err instanceof Error ? err.message : 'The password could not be changed.'))
          .finally(() => setBusy(false));
      }}
    >
      <p style={formKitStyle.heading}>{title}</p>
      <input type="password" autoComplete="current-password" placeholder="Current password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} style={field} />
      <input type="password" autoComplete="new-password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={field} />
      <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={field} />
      {error && <p style={formKitStyle.error}>{error}</p>}
      <button type="submit" disabled={busy || !oldPw} style={formKitStyle.primaryDim(busy || !oldPw)}>{busy ? 'Changing…' : confirmLabel}</button>
      {note && <p style={formKitStyle.note}>{note}</p>}
    </form>
  );
}
