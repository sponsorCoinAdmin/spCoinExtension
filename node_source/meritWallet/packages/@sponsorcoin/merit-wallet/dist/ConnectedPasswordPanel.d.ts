import React from 'react';
import { type WalletSessionAdapter, type WalletSessionPhase } from './session/walletSession';
export interface ConnectedPasswordPanelProps {
    /** Where the host's wallet is: no answer yet, no wallet, locked, or unlocked. */
    phase: WalletSessionPhase;
    /** The host's create / unlock calls. */
    adapter: Pick<WalletSessionAdapter, 'create' | 'unlock'>;
    /** An error the host already has (for example its password-status check failed). */
    hostError?: string;
    /** Artwork above the form. */
    icon?: React.ReactNode;
}
export default function ConnectedPasswordPanel({ phase, adapter, hostError, icon }: ConnectedPasswordPanelProps): React.JSX.Element;
