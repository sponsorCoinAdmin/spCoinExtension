// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/config/ConnectedWalletConfig.tsx
//
// docs/meritMigration.txt row 18 -- the Config tab with everything derived from the wallet, written once: the shared WalletConfigPanel, its Wallet Security / Who signs / Backup sections derived from the `wallet` a host passes, Logoff from the host or the
// wallet's lock, and the Reset Password / Delete Wallet dialogs over the host's WalletSessionHost. The web app's Config slot renders this, so neither app supplies a React node for a section.
'use client';

import React, { useState } from 'react';
import { WalletConfigPanel } from '@sponsorcoin/spcoin-panels';
import { useWalletDerivedProps, type WalletDerivation } from '../wallet/walletProps';
import type { Wallet } from '../wallet/wallet';
import type { WalletSessionHost } from '../walletSessionHost';
import TestAccountsSection, { type TestAccountsApi } from '../TestAccountsSection';
import type { AuthenticationType } from '../auth/authenticationType';
import WalletSessionDialogs, { sessionConfigHandlers, type WalletSessionDialog } from './WalletSessionDialogs';

type PanelProps = React.ComponentProps<typeof WalletConfigPanel>;

export interface ConnectedWalletConfigProps extends Omit<PanelProps, 'securityPanelContent' | 'signingPanelContent' | 'backupPanelContent' | 'passwordResetPanelContent'> {
  /** The wallet whose active account the sections are about. */
  wallet?: Wallet;
  activeAddress?: string;
  /** What the sections may derive from `wallet` (default: security, signing and backup). */
  derives?: readonly WalletDerivation[];
  walletSession?: WalletSessionHost;
  /** The Test Accounts section (loads Hardhat's standard accounts into the host's store); omit to hide it. */
  testAccounts?: { api: TestAccountsApi; authenticationType?: AuthenticationType; onChanged?(): void };
}

const SECTIONS: readonly WalletDerivation[] = ['security', 'signing', 'backup'];

export default function ConnectedWalletConfig({ wallet, activeAddress, derives = SECTIONS, walletSession, testAccounts, onLogoff, onResetPassword, onDeleteAccount, onDeleteWallet, ...panel }: ConnectedWalletConfigProps) {
  const derived = useWalletDerivedProps(wallet, activeAddress, derives);
  const [dialog, setDialog] = useState<WalletSessionDialog>(null);
  const handlers = sessionConfigHandlers(walletSession, setDialog, { onResetPassword, onDeleteAccount, onDeleteWallet });
  return (
    <>
      <WalletConfigPanel
        {...panel}
        securityPanelContent={derived.configSecurityPanelContent}
        signingPanelContent={derived.configSigningPanelContent}
        backupPanelContent={derived.configBackupPanelContent}
        testAccountsContent={testAccounts ? <TestAccountsSection api={testAccounts.api} authenticationType={testAccounts.authenticationType} onChanged={testAccounts.onChanged} /> : undefined}
        onLogoff={onLogoff}
        onResetPassword={handlers.onResetPassword}
        onDeleteAccount={handlers.onDeleteAccount}
        onDeleteWallet={handlers.onDeleteWallet}
      />
      <WalletSessionDialogs dialog={dialog} onClose={() => setDialog(null)} session={walletSession} />
    </>
  );
}
