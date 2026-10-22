// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/config/WalletSessionDialogs.tsx
//
// docs/meritMigration.txt row 18 -- the Reset Password and Delete Wallet dialogs of the Config tab, drawn once by the component for every host; the host's WalletSessionHost supplies the calls and words.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { dialogStyle } from '@sponsorcoin/spcoin-common/styles';
import ChangePasswordPanel from '../ChangePasswordPanel';
import DeleteWalletDialog from '../DeleteWalletDialog';
import DialogPortal from '../DialogPortal';
/** Which handlers the Config buttons get: the dialog openers when the host supplies the call, else the host's own handlers. */
export function sessionConfigHandlers(session, open, host) {
    const deleteFromRemoveAccount = session?.deleteButton === 'removeAccount';
    return {
        onResetPassword: session?.changePassword ? () => open('password') : host.onResetPassword,
        onDeleteAccount: session?.deleteWallet && deleteFromRemoveAccount ? () => open('delete') : host.onDeleteAccount,
        onDeleteWallet: session?.deleteWallet && !deleteFromRemoveAccount ? () => open('delete') : host.onDeleteWallet,
    };
}
export default function WalletSessionDialogs({ dialog, onClose, session }) {
    if (dialog === 'password' && session?.changePassword) {
        return (_jsx(DialogPortal, { children: _jsx("div", { role: "dialog", "aria-modal": "true", style: dialogStyle.backdrop, children: _jsxs("div", { style: dialogStyle.card, children: [_jsx(ChangePasswordPanel, { title: "Reset password", confirmLabel: "Update Password", note: session.changePasswordNote, changePassword: session.changePassword, onDone: onClose }), _jsx("div", { style: dialogStyle.footer, children: _jsx("button", { type: "button", onClick: onClose, style: dialogStyle.cancelButton, children: "Cancel" }) })] }) }) }));
    }
    if (dialog === 'delete' && session?.deleteWallet) {
        return (_jsx(DeleteWalletDialog, { ...session.deleteWording, confirmDelete: async (password) => {
                await session.deleteWallet(password);
                onClose();
            }, onClose: onClose }));
    }
    return null;
}
