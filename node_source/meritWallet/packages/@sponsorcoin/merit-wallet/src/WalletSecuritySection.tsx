// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/WalletSecuritySection.tsx
//
// 2026-10-09 -- the Config tab's "Wallet Security" content for a host whose keys live in the wallet itself (the extension's vault), written once in the package.
// The web app's WalletSecurityPanel does the same job against its server keystore; this is the vault's version, modelled on MetaMask's Security & privacy
// screen: every reveal asks for the wallet password, a revealed key stays hidden until the user chooses Show, and Copy puts it on the clipboard. Two rows:
// the active account's private key, and (as in MetaMask) the Secret Recovery Phrase. No host imports: the host passes the two reveal calls.
'use client';

import React, { useState } from 'react';
import { SmallYellowButton } from '@sponsorcoin/spcoin-panels';
import PasswordPromptDialog from './PasswordPromptDialog';
import { useActiveAccountProfile } from './swap/activeAccountProfile';

export interface WalletSecurityApi {
  /** Resolve with the account's private key; throw a readable message for a wrong password. */
  revealPrivateKey(password: string, address: string): Promise<string>;
  /** Resolve with the Secret Recovery Phrase; throw a readable message for a wrong password. Omit to hide that row. */
  revealPhrase?(password: string): Promise<string>;
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 6 };
const boxStyle: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  borderRadius: 8,
  border: '1px solid #334155',
  background: '#0b0e17',
  padding: '8px 10px',
  color: '#fff',
  fontSize: 11,
  wordBreak: 'break-all',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

function RevealRow({
  title,
  hint,
  dialogTitle,
  dialogMessage,
  disabled,
  reveal,
}: {
  title: string;
  hint?: string;
  dialogTitle: string;
  dialogMessage: string;
  disabled?: boolean;
  reveal(password: string): Promise<string>;
}) {
  const [asking, setAsking] = useState(false);
  const [secret, setSecret] = useState('');
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const clear = () => {
    setSecret('');
    setVisible(false);
  };

  const copy = () => {
    if (!secret) return;
    void navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={labelStyle}>{title}</span>
      {hint && <span style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</span>}
      {secret ? (
        <>
          <div style={boxStyle}>{visible ? secret : '•'.repeat(Math.min(secret.length, 48))}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <SmallYellowButton onClick={() => setVisible((v) => !v)}>{visible ? 'Hide' : 'Show'}</SmallYellowButton>
            <SmallYellowButton onClick={copy}>{copied ? 'Copied' : 'Copy'}</SmallYellowButton>
            <SmallYellowButton onClick={clear}>Clear</SmallYellowButton>
          </div>
        </>
      ) : (
        <div>
          <SmallYellowButton disabled={disabled} onClick={() => setAsking(true)}>
            Reveal
          </SmallYellowButton>
        </div>
      )}
      {asking && (
        <PasswordPromptDialog
          title={dialogTitle}
          message={dialogMessage}
          confirmLabel="Reveal"
          onClose={() => setAsking(false)}
          onConfirm={async (password) => {
            const value = await reveal(password);
            setSecret(value);
            setVisible(false);
            setAsking(false);
          }}
        />
      )}
    </div>
  );
}

export default function WalletSecuritySection({ api }: { api: WalletSecurityApi }) {
  const profile = useActiveAccountProfile();
  const address = profile?.address ?? '';
  const who = [profile?.symbol, profile?.name].filter(Boolean).join(' | ');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <RevealRow
        title="Security — Reveal Private Key"
        hint={address ? `${who ? `${who} — ` : ''}${address}` : 'Select an account first.'}
        dialogTitle="Reveal Private Key"
        dialogMessage="Anyone with this key controls the account. Enter your wallet password to continue."
        disabled={!address}
        reveal={(password) => api.revealPrivateKey(password, address)}
      />
      {api.revealPhrase && (
        <RevealRow
          title="Security — Reveal Secret Recovery Phrase"
          hint="The phrase restores every account of this wallet."
          dialogTitle="Reveal Secret Recovery Phrase"
          dialogMessage="Anyone with this phrase controls every account. Enter your wallet password to continue."
          reveal={(password) => api.revealPhrase!(password)}
        />
      )}
    </div>
  );
}
