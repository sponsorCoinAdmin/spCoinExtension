import React from 'react';
export interface WalletOnboardingPanelProps {
    /** Create a new wallet under `password`; resolves with the Secret Recovery Phrase to show once. */
    createWallet(password: string): Promise<{
        recoveryPhrase: string;
    }>;
    /** Restore a wallet from an existing phrase under `password`. */
    importWallet(recoveryPhrase: string, password: string): Promise<void>;
    /** Setup is finished and the wallet is unlocked. */
    onDone(): void;
}
export default function WalletOnboardingPanel({ createWallet, importWallet, onDone }: WalletOnboardingPanelProps): React.JSX.Element;
