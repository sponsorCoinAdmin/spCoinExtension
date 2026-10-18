// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/config/ConnectedWalletConfig.tsx
//
// docs/meritMigration.txt row 18 -- the Config tab with everything derived from the wallet, written once: the shared WalletConfigPanel, its Wallet Security / Who signs / Backup sections derived from the `wallet` a host passes, Logoff from the host or the
// wallet's lock, and the Reset Password / Delete Wallet dialogs over the host's WalletSessionHost. The web app's Config slot renders this, so neither app supplies a React node for a section.
'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { WalletConfigPanel } from '@sponsorcoin/spcoin-panels';
import { useWalletDerivedProps } from '../wallet/walletProps';
import TestAccountsSection from '../TestAccountsSection';
import WalletSessionDialogs, { sessionConfigHandlers } from './WalletSessionDialogs';
const SECTIONS = ['security', 'signing', 'backup'];
export default function ConnectedWalletConfig({ wallet, activeAddress, derives = SECTIONS, walletSession, testAccounts, onLogoff, onResetPassword, onDeleteAccount, onDeleteWallet, ...panel }) {
    const derived = useWalletDerivedProps(wallet, activeAddress, derives);
    const [dialog, setDialog] = useState(null);
    const handlers = sessionConfigHandlers(walletSession, setDialog, { onResetPassword, onDeleteAccount, onDeleteWallet });
    return (_jsxs(_Fragment, { children: [_jsx(WalletConfigPanel, { ...panel, securityPanelContent: derived.configSecurityPanelContent, signingPanelContent: derived.configSigningPanelContent, backupPanelContent: derived.configBackupPanelContent, testAccountsContent: testAccounts ? _jsx(TestAccountsSection, { api: testAccounts.api, authenticationType: testAccounts.authenticationType, onChanged: testAccounts.onChanged }) : undefined, onLogoff: onLogoff, onResetPassword: handlers.onResetPassword, onDeleteAccount: handlers.onDeleteAccount, onDeleteWallet: handlers.onDeleteWallet }), _jsx(WalletSessionDialogs, { dialog: dialog, onClose: () => setDialog(null), session: walletSession })] }));
}
