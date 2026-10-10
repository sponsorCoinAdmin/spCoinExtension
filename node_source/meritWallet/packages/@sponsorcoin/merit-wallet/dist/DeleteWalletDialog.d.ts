import React from 'react';
export default function DeleteWalletDialog({ confirmDelete, onClose }: {
    confirmDelete(password: string): Promise<void>;
    onClose(): void;
}): React.JSX.Element;
