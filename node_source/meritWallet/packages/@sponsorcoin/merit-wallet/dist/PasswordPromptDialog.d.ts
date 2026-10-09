import React from 'react';
export default function PasswordPromptDialog({ title, message, confirmLabel, onConfirm, onClose, }: {
    title: string;
    message: string;
    confirmLabel: string;
    /** Throw (a readable message) for a wrong password; resolve to close. */
    onConfirm(password: string): Promise<void>;
    onClose(): void;
}): React.JSX.Element;
