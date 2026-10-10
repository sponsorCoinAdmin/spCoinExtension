// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AddAccountFlow.tsx
//
// 2026-10-10 (docs/connectionDesign.txt item 2) -- the "Add a Wallet/Account" flow, written once in the package: the menu (spcoin-panels' AddWalletMenu, the same entries, order and wording the web app shows), and the screens behind
// the entries a host can offer. A host passes an AddAccountHost: what each entry does for ITS approver (the extension: create = derive the next vault account, import = a private key into the vault) and, for every entry it cannot offer,
// the reason (shown disabled, connectionDesign 2.7). Whatever is added is made the active account by the host's callback, never by this component (connectionDesign 2.6: the app does not choose the active account).
'use client';

import React, { useState } from 'react';
import { privateKeyToAddress } from 'viem/accounts';
import { AddWalletMenu, ImportAccountForm } from '@sponsorcoin/spcoin-panels';

export type AddAccountEntry = 'importWallet' | 'importAccount' | 'createAccount' | 'connectMetaMask' | 'connectHardware';

export interface AddAccountHost {
  /** Create a new account under this host's approver (the extension: derive the next account from its recovery phrase). Throw a readable message on failure. */
  createAccount(): Promise<void>;
  /** Import one account from a private key into this host's approver. Throw a readable message on failure (wrong format is checked here first). */
  importAccount(privateKey: string): Promise<void>;
  /** Entries this host cannot offer, each with the reason shown on the disabled row. */
  unavailable?: Partial<Record<AddAccountEntry, string>>;
}

type Screen = 'menu' | 'importAccount' | 'createAccount';

const buttonStyle: React.CSSProperties = { flex: 1, borderRadius: 8, border: 'none', padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#243056', color: '#ffffff' };
const primaryStyle: React.CSSProperties = { ...buttonStyle, background: '#5981F3' };

const KEY_FORMAT = /^0x[0-9a-fA-F]{64}$/;

export default function AddAccountFlow({ host, onDone }: { host: AddAccountHost; onDone(): void }) {
  const [screen, setScreen] = useState<Screen>('menu');
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const trimmed = key.trim();
  const formatInvalid = trimmed.length > 0 && !KEY_FORMAT.test(trimmed);
  let previewAddress = '';
  if (KEY_FORMAT.test(trimmed)) {
    try {
      previewAddress = privateKeyToAddress(trimmed as `0x${string}`);
    } catch {
      previewAddress = '';
    }
  }

  const back = () => {
    setError('');
    setKey('');
    if (screen === 'menu') onDone();
    else setScreen('menu');
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The account could not be added.');
    } finally {
      setBusy(false);
    }
  };
  const unavailable = host.unavailable ?? {};
  const open = (entry: AddAccountEntry, next: Screen) => () => {
    if (unavailable[entry]) return;
    setError('');
    setScreen(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, color: '#fff' }}>
      <button type="button" onClick={back} style={{ ...buttonStyle, flex: 'none', alignSelf: 'flex-start', padding: '6px 12px' }}>
        {screen === 'menu' ? 'Back' : '← Back'}
      </button>
      {screen === 'menu' && (
        <AddWalletMenu
          onImportWallet={() => undefined}
          onImportAccount={open('importAccount', 'importAccount')}
          onCreateAccount={open('createAccount', 'createAccount')}
          onConnectMetaMask={() => undefined}
          onConnectHardware={() => undefined}
          unavailable={unavailable}
          error={error}
        />
      )}
      {screen === 'importAccount' && (
        <ImportAccountForm
          value={key}
          onChange={setKey}
          formatInvalid={formatInvalid}
          previewAddress={previewAddress}
          error={error}
          isImporting={busy}
          onImport={() => void run(() => host.importAccount(trimmed))}
        />
      )}
      {screen === 'createAccount' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 4px' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1' }}>Create a new account: a new address and private key, kept under this wallet.</p>
          {error && <p style={{ margin: 0, fontSize: 12, color: '#fca5a5' }}>{error}</p>}
          <button type="button" disabled={busy} onClick={() => void run(() => host.createAccount())} style={{ ...primaryStyle, opacity: busy ? 0.5 : 1 }}>
            {busy ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      )}
    </div>
  );
}
