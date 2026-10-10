// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/ConnectedPasswordPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 21) -- the PASSWORD_PANEL overlay slot, moved from the web app's
// components/views/RadioOverlayPanels/PasswordPanel.tsx. The form is spcoin-panels' PasswordPanel; the rules (length, match, "Incorrect password.",
// busy state) are the shared unlock gate in ./session/walletSession (the same function the Merit Wallet component's own password screen uses). What a
// host supplies is the phase it knows and the two calls that create / unlock its wallet, so the web app passes walletState's and the
// extension passes the vault's.
'use client';

import React, { useState } from 'react';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { PanelGate, PasswordPanel as PortablePasswordPanel } from '@sponsorcoin/spcoin-panels';
import { passwordModeFor, submitWalletPassword, type WalletSessionAdapter, type WalletSessionPhase } from './session/walletSession';

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

export default function ConnectedPasswordPanel({ phase, adapter, hostError, icon }: ConnectedPasswordPanelProps) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (password: string, confirmPassword: string) => {
    setSubmitting(true);
    setError('');
    try {
      const result = await submitWalletPassword(phase, adapter, password, confirmPassword);
      if (!result.ok) setError(result.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PanelGate panel={SP_COIN_DISPLAY.PASSWORD_PANEL} lazyLoad={false}>
      <PortablePasswordPanel
        mode={passwordModeFor(phase)}
        icon={icon}
        errorText={hostError || error}
        onSubmit={(pw, confirm) => void handleSubmit(pw, confirm)}
        submitting={submitting}
        clearOnSubmit
      />
    </PanelGate>
  );
}
