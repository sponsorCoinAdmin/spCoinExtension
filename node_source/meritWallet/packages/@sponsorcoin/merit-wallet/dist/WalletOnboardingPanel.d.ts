import React from 'react';
export interface WalletOnboardingPanelProps {
    /** Create a new wallet under `password`; resolves with the Secret Recovery Phrase to show once. */
    createWallet(password: string): Promise<{
        recoveryPhrase: string;
    }>;
    /** Restore a wallet from an existing phrase under `password`. */
    importWallet(recoveryPhrase: string, password: string): Promise<void>;
    /** 2026-10-12 (accountAuthDesign V8): restore the wallet from an encrypted backup file (its text) and the password it was made with. Omitted: the option is not shown. */
    restoreBackup?(file: string, password: string): Promise<void>;
    /** Setup is finished and the wallet is unlocked. */
    onDone(): void;
}
export default function WalletOnboardingPanel({ createWallet, importWallet, restoreBackup, onDone }: WalletOnboardingPanelProps): React.JSX.Element;
