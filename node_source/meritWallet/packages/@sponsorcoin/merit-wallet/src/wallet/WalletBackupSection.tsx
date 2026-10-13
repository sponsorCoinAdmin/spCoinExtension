// File: src/wallet/WalletBackupSection.tsx
//
// 2026-10-12 (docs/design/accountAuthDesign.txt 14.9 / item V8): the encrypted backup file in the Config tab of every host whose key-keeping backend can make one (the extension's vault, the browser vault). "Back up" asks for the password and downloads
// a file encrypted with it (a format name and a version, no plain key). Restoring is the first screen's job (WalletOnboardingPanel): a wallet that exists is never overwritten. A backend that cannot make one (the dev server, a phone) gets no section.
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SmallYellowButton } from '@sponsorcoin/spcoin-panels';
import PasswordPromptDialog from '../PasswordPromptDialog';
import type { VaultCapability } from '../vault/vaultCapability';
import type { Wallet } from './wallet';

const note: React.CSSProperties = { fontSize: 11, color: '#94a3b8', margin: 0 };
const ok: React.CSSProperties = { fontSize: 11, color: '#86efac', margin: 0 };
const bad: React.CSSProperties = { fontSize: 11, color: '#fca5a5', margin: 0 };

/** The file name a backup is saved under. */
export const BACKUP_FILE_NAME = 'merit-wallet-backup.json';

function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function WalletBackupSection({ wallet }: { wallet: Wallet }) {
  const [vault, setVault] = useState<VaultCapability | undefined>(undefined);
  const [dialog, setDialog] = useState<'none' | 'backup'>('none');
  const [message, setMessage] = useState<{ text: string; good: boolean } | undefined>(undefined);

  const load = useCallback(async () => {
    const primary = await wallet.primaryVault();
    setVault(primary && primary.vault.capabilities.backup ? primary.vault : undefined);
  }, [wallet]);
  useEffect(() => {
    void load();
    return wallet.onChange(() => void load());
  }, [wallet, load]);

  if (!vault) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={note}>A backup file holds every account of this wallet, encrypted with your password. Keep it somewhere safe: anyone with the file and the password can use the accounts.</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <SmallYellowButton onClick={() => { setMessage(undefined); setDialog('backup'); }}>Back up to a file</SmallYellowButton>
      </div>
      <p style={note}>To restore a backup, remove this wallet first, then choose "Restore from a backup file" on the first screen: a wallet that already exists is never overwritten.</p>
      {message ? <p style={message.good ? ok : bad}>{message.text}</p> : null}
      {dialog === 'backup' ? (
        <PasswordPromptDialog
          title="Back up this wallet"
          message="Enter your wallet password. The file is encrypted with it."
          confirmLabel="Download backup"
          onConfirm={async (password) => {
            const text = await vault.exportBackup({ kind: 'password', value: password }).catch((e: unknown) => { throw new Error(e instanceof Error ? e.message : 'The backup could not be made.'); });
            download(text, BACKUP_FILE_NAME);
            setDialog('none');
            setMessage({ text: `Saved ${BACKUP_FILE_NAME}.`, good: true });
          }}
          onClose={() => setDialog('none')}
        />
      ) : null}
    </div>
  );
}
