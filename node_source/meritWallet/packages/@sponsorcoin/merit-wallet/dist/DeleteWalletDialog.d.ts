import React from 'react';
/**
 * 2026-10-11 (docs/design/accountAuthDesign.txt 14.3, item V5): `warning` carries the host's wording for what is lost (the default says the wallet is removed from this device); `title` and `confirmLabel` keep a
 * host's own words (the web's development keystore says "Remove Account"); `footnote` is optional small print under the buttons.
 */
export default function DeleteWalletDialog({ confirmDelete, onClose, warning, title, confirmLabel, footnote }: {
    confirmDelete(password: string): Promise<void>;
    onClose(): void;
    warning?: React.ReactNode;
    title?: string;
    confirmLabel?: string;
    footnote?: string;
}): React.JSX.Element;
