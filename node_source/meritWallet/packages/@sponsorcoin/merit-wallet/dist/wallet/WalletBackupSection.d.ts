import React from 'react';
import type { Wallet } from './wallet';
/** The file name a backup is saved under. */
export declare const BACKUP_FILE_NAME = "merit-wallet-backup.json";
export default function WalletBackupSection({ wallet }: {
    wallet: Wallet;
}): React.JSX.Element | null;
