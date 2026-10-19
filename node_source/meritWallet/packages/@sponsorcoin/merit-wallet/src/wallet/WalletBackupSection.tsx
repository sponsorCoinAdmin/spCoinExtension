// File: src/wallet/WalletBackupSection.tsx
//
// 2026-10-12 (docs/design/accountAuthDesign.txt 14.9 / item V8): the encrypted backup file in the Config tab of every host whose key-keeping backend can make one (the extension's vault, the browser vault). "Back up" asks for the password and downloads
// a file encrypted with it (a format name and a version, no plain key). Restoring is the first screen's job (WalletOnboardingPanel): a wallet that exists is never overwritten. A backend that cannot make one (the dev server, a phone) gets no section.
'use client';

import { configSectionStyle } from '@sponsorcoin/spcoin-common/styles';
import React, { useCallback, useEffect, useState } from 'react';
import { usePlatform } from '../platform/platform';
import { SmallYellowButton } from '@sponsorcoin/spcoin-panels';
import PasswordPromptDialog from '../PasswordPromptDialog';
import type { VaultCapability } from '../vault/vaultCapability';
import type { Wallet } from './wallet';


/** The file name a backup is saved under. */
export const BACKUP_FILE_NAME = 'merit-wallet-backup.json';

export default function WalletBackupSection({ wallet }: { wallet: Wallet }) {
  const platform = usePlatform();
  const [vault, setVault] = useState<VaultCapability | undefined>(undefined);
  const [dialog, setDialog] = useState<'none' | 'backup'>('none');
  const [message, setMessage] = useState<{ text: string; good: boolean } | undefined>(undefined);

  const load = useCallback(async () => {
    const primary = await wallet.primaryVault();
    setVault(primary?.vault.capabilities.backup ? primary.vault : undefined);
  }, [wallet]);
  useEffect(() => {
    void load();
    return wallet.onChange(() => void load());
  }, [wallet, load]);

  if (!vault) return null;

  return (
    <div style={configSectionStyle.column(8)}>
      <p style={configSectionStyle.note}>A backup file holds every account of this wallet, encrypted with your password. Keep it somewhere safe: anyone with the file and the password can use the accounts.</p>
      <div style={configSectionStyle.buttonsWrap}>
        <SmallYellowButton onClick={() => { setMessage(undefined); setDialog('backup'); }}>Back up to a file</SmallYellowButton>
      </div>
      <p style={configSectionStyle.note}>To restore a backup, remove this wallet first, then choose "Restore from a backup file" on the first screen: a wallet that already exists is never overwritten.</p>
      {message ? <p style={message.good ? configSectionStyle.good : configSectionStyle.bad}>{message.text}</p> : null}
      {dialog === 'backup' ? (
        <PasswordPromptDialog
          title="Back up this wallet"
          message="Enter your wallet password. The file is encrypted with it."
          confirmLabel="Download backup"
          onConfirm={async (password) => {
            const text = await vault.exportBackup({ kind: 'password', value: password }).catch((e: unknown) => { throw new Error(e instanceof Error ? e.message : 'The backup could not be made.'); });
            platform.saveFile(BACKUP_FILE_NAME, text, 'application/json');
            setDialog('none');
            setMessage({ text: `Saved ${BACKUP_FILE_NAME}.`, good: true });
          }}
          onClose={() => setDialog('none')}
        />
      ) : null}
    </div>
  );
}
