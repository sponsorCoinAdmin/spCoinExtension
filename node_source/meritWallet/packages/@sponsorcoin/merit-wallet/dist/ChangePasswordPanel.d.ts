import React from 'react';
/**
 * 2026-10-11 (docs/design/accountAuthDesign.txt 14.3, item V5): `note` is the host's own small print (the web's development keystore says that every account is re-encrypted); `title` and `confirmLabel`
 * let a host keep its wording. The new password must also differ from the current one.
 */
export default function ChangePasswordPanel({ changePassword, onDone, note, title, confirmLabel }: {
    changePassword(oldPassword: string, newPassword: string): Promise<void>;
    onDone(): void;
    note?: string;
    title?: string;
    confirmLabel?: string;
}): React.JSX.Element;
