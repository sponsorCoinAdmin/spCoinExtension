export interface WalletSessionHost {
    /** Reset Password: change the wallet password; throw a readable message on failure. Omitted: Reset Password does what the host's own onConfigResetPassword does. */
    changePassword?(currentPassword: string, newPassword: string): Promise<void>;
    /** The small print under the change-password form (what the host's change really does). */
    changePasswordNote?: string;
    /** Delete the wallet for good; the host checks the password first and throws a readable message when it is wrong. */
    deleteWallet?(password: string): Promise<void>;
    /** The delete dialog's words. */
    deleteWording?: {
        title?: string;
        confirmLabel?: string;
        warning?: string;
        footnote?: string;
    };
    /** Which Config button opens the delete dialog: 'removeAccount' (the web app: its Remove Account deletes the whole wallet) or 'deleteWallet' (the extension: Remove Account removes one account, Delete Wallet is its own button). Default 'deleteWallet'. */
    deleteButton?: 'removeAccount' | 'deleteWallet';
}
