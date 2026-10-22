// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/DeleteWalletDialog.tsx
//
// 2026-10-08 -- the confirmation popup for deleting the wallet from this device: it asks for the wallet password and deletes only when the host says
// the password is right. Host-independent: the host supplies confirmDelete(password), which throws a readable message for a wrong password.
'use client';

import { dialogStyle } from '@sponsorcoin/spcoin-common/styles';
import React, { useState } from 'react';
import DialogPortal from './DialogPortal';

/**
 * 2026-10-11 (docs/design/accountAuthDesign.txt 14.3, item V5): `warning` carries the host's wording for what is lost (the default says the wallet is removed from this device); `title` and `confirmLabel` keep a
 * host's own words (the web's development keystore says "Remove Account"); `footnote` is optional small print under the buttons.
 */
export default function DeleteWalletDialog({ confirmDelete, onClose, warning, title = 'Delete wallet', confirmLabel = 'Delete wallet', footnote }: { confirmDelete(password: string): Promise<void>; onClose(): void; warning?: React.ReactNode; title?: string; confirmLabel?: string; footnote?: string }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <DialogPortal>
    <div
      id="DELETE_WALLET_DIALOG"
      role="dialog"
      aria-modal="true"
      style={dialogStyle.backdrop}
    >
      <form
        style={dialogStyle.formCardDanger}
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
        <p style={dialogStyle.title}>{title}</p>
        <p style={dialogStyle.warning}>
          {warning ?? 'This deletes the wallet and all its accounts from this device. You can only get them back with your Secret Recovery Phrase (imported accounts need their private keys).'}
        </p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Enter your password to confirm"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={dialogStyle.input}
        />
        {error && <p style={dialogStyle.error}>{error}</p>}
        <button type="submit" disabled={busy || !password} style={dialogStyle.dangerButton(busy || !password)}>
          {busy ? 'Deleting…' : confirmLabel}
        </button>
        <button type="button" onClick={onClose} style={dialogStyle.cancelButton}>
          Cancel
        </button>
        {footnote && <p style={dialogStyle.footnote}>{footnote}</p>}
      </form>
    </div>
    </DialogPortal>
  );
}
