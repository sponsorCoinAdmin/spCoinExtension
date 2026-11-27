import React from 'react';
import { WalletConfigPanel } from '@sponsorcoin/spcoin-panels';
import { type WalletDerivation } from '../wallet/walletProps';
import type { Wallet } from '../wallet/wallet';
import type { WalletSessionHost } from '../walletSessionHost';
type PanelProps = React.ComponentProps<typeof WalletConfigPanel>;
export interface ConnectedWalletConfigProps extends Omit<PanelProps, 'securityPanelContent' | 'backupPanelContent' | 'passwordResetPanelContent'> {
    /** The wallet whose active account the sections are about. */
    wallet?: Wallet;
    activeAddress?: string;
    /** What the sections may derive from `wallet` (default: security and backup). */
    derives?: readonly WalletDerivation[];
    walletSession?: WalletSessionHost;
    /** The Test Accounts section (loads Hardhat's standard accounts into the host's store); omit to hide it. */
    /** The Test Accounts section, built by the host (see MeritWalletProps.configTestAccountsContent). */
    testAccountsContent?: React.ReactNode;
}
export default function ConnectedWalletConfig({ wallet, activeAddress, derives, walletSession, testAccountsContent, onLogoff, onResetPassword, onDeleteAccount, onDeleteWallet, ...panel }: ConnectedWalletConfigProps): React.JSX.Element;
export {};
