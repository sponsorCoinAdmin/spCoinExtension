// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/config/WalletSessionDialogs.tsx
//
// docs/meritMigration.txt row 18 -- the Reset Password and Delete Wallet dialogs of the Config tab, drawn once by the component for every host; the host's WalletSessionHost supplies the calls and words.
'use client';

import { dialogStyle } from '@sponsorcoin/spcoin-common/styles';
import React from 'react';
import ChangePasswordPanel from '../ChangePasswordPanel';
import DeleteWalletDialog from '../DeleteWalletDialog';
import DialogPortal from '../DialogPortal';
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
      <DialogPortal>
      <div role="dialog" aria-modal="true" style={dialogStyle.backdrop}>
        <div style={dialogStyle.card}>
          <ChangePasswordPanel title="Reset password" confirmLabel="Update Password" note={session.changePasswordNote} changePassword={session.changePassword} onDone={onClose} />
          <div style={dialogStyle.footer}>
            <button type="button" onClick={onClose} style={dialogStyle.cancelButton}>Cancel</button>
          </div>
        </div>
      </div>
      </DialogPortal>
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
