import React from 'react';
import type { WalletSessionHost } from '../walletSessionHost';
export type WalletSessionDialog = 'password' | 'delete' | null;
/** Which handlers the Config buttons get: the dialog openers when the host supplies the call, else the host's own handlers. */
export declare function sessionConfigHandlers(session: WalletSessionHost | undefined, open: (dialog: Exclude<WalletSessionDialog, null>) => void, host: {
    onResetPassword?: () => void;
    onDeleteAccount?: () => void;
    onDeleteWallet?: () => void;
}): {
    onResetPassword: (() => void) | undefined;
    onDeleteAccount: (() => void) | undefined;
    onDeleteWallet: (() => void) | undefined;
};
export default function WalletSessionDialogs({ dialog, onClose, session }: {
    dialog: WalletSessionDialog;
    onClose(): void;
    session: WalletSessionHost | undefined;
}): React.JSX.Element | null;
