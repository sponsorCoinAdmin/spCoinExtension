import React from 'react';
export default function ChangePasswordPanel({ changePassword, onDone }: {
    changePassword(oldPassword: string, newPassword: string): Promise<void>;
    onDone(): void;
}): React.JSX.Element;
