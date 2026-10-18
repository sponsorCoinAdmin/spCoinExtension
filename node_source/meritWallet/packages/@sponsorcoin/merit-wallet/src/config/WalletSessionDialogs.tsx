// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/config/WalletSessionDialogs.tsx
//
// docs/meritMigration.txt row 18 -- the Reset Password and Delete Wallet dialogs of the Config tab, drawn once by the component for every host; the host's WalletSessionHost supplies the calls and words.
'use client';

import React from 'react';
import ChangePasswordPanel from '../ChangePasswordPanel';
import DeleteWalletDialog from '../DeleteWalletDialog';
import type { WalletSessionHost } from '../walletSessionHost';

export type WalletSessionDialog = 'password' | 'delete' | null;

/** Which handlers the Config buttons get: the dialog openers when the host supplies the call, else the host's own handlers. */
export function sessionConfigHandlers(
  session: WalletSessionHost | undefined,
  open: (dialog: Exclude<WalletSessionDialog, null>) => void,
  host: { onResetPassword?: () => void; onDeleteAccount?: () => void; onDeleteWallet?: () => void },
) {
  const deleteFromRemoveAccount = session?.deleteButton === 'removeAccount';
  return {
    onResetPassword: session?.changePassword ? () => open('password') : host.onResetPassword,
    onDeleteAccount: session?.deleteWallet && deleteFromRemoveAccount ? () => open('delete') : host.onDeleteAccount,
    onDeleteWallet: session?.deleteWallet && !deleteFromRemoveAccount ? () => open('delete') : host.onDeleteWallet,
  };
}

export default function WalletSessionDialogs({ dialog, onClose, session }: { dialog: WalletSessionDialog; onClose(): void; session: WalletSessionHost | undefined }) {
  if (dialog === 'password' && session?.changePassword) {
    return (
      <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
        <div style={{ boxSizing: 'border-box', width: '100%', maxWidth: 340, background: '#0E111B', border: '1px solid #334155', borderRadius: 12, color: '#fff' }}>
          <ChangePasswordPanel title="Reset password" confirmLabel="Update Password" note={session.changePasswordNote} changePassword={session.changePassword} onDone={onClose} />
          <div style={{ padding: '0 12px 12px' }}>
            <button type="button" onClick={onClose} style={{ width: '100%', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#fff', padding: '8px 16px', cursor: 'pointer', font: 'inherit' }}>Cancel</button>
          </div>
        </div>
      </div>
    );
  }
  if (dialog === 'delete' && session?.deleteWallet) {
    return (
      <DeleteWalletDialog
        {...session.deleteWording}
        confirmDelete={async (password) => {
          await session.deleteWallet!(password);
          onClose();
        }}
        onClose={onClose}
      />
    );
  }
  return null;
}
