// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/VaultAccountsPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 21; "Create Account rewrite") -- account management for a wallet that owns its keys, the
// MetaMask way: the wallet itself creates and imports accounts. The accounts live in the vault (src/vault/walletAccounts.ts); this panel never
// touches a key except when the user asks to see one, and then only after typing the password again. It is host-independent: everything it does
// goes through a VaultAccountsApi the host supplies (the extension maps it to the worker's merit/accounts/* messages), so it needs no panel tree, no
// exchange context and no web library.
//
// Screens: the account list (select the active account, add), Add (create the next account from the Secret Recovery Phrase, or import a private key),
// and an account's details (rename, copy the address, show its private key, remove an imported account), plus "Show Secret Recovery Phrase".
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { privateKeyToAccount } from 'viem/accounts';
import { AddWalletAccountButton, ImportAccountForm } from '@sponsorcoin/spcoin-panels';

export interface VaultAccountRow {
  address: string;
  name: string;
  source: 'generated' | 'imported';
  /** Made from a published development key: usable only on the local test chain. */
  devOrigin: boolean;
}

export interface VaultAccountsApi {
  list(): Promise<{ accounts: VaultAccountRow[]; active?: string }>;
  setActive(address: string): Promise<void>;
  addDerived(name?: string): Promise<void>;
  importPrivateKey(privateKey: string, name?: string): Promise<void>;
  rename(address: string, name: string): Promise<void>;
  remove(address: string): Promise<void>;
  /** Throws (a message the user can read) for a wrong password. */
  exportPrivateKey(password: string, address: string): Promise<string>;
  revealMnemonic(password: string): Promise<string>;
}

export interface VaultAccountsPanelProps {
  api: VaultAccountsApi;
  /** Called after the active account changes, so the host can refresh what depends on it. */
  onActiveChanged?: (address: string) => void;
}

type Screen =
  | { kind: 'list' }
  | { kind: 'add' }
  | { kind: 'importKey' }
  | { kind: 'detail'; address: string }
  | { kind: 'phrase' };

const BLUE = '#5981F3';
const CARD = '#243056';
const BORDER = '#334155';
const PRIVATE_KEY_RE = /^0x[a-fA-F0-9]{64}$/;

const box: React.CSSProperties = { boxSizing: 'border-box', width: '100%', padding: '8px 12px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 8 };
const rowButton: React.CSSProperties = {
  boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD,
  padding: '8px 12px', textAlign: 'left', color: 'inherit', cursor: 'pointer', font: 'inherit',
};
const primaryButton: React.CSSProperties = { boxSizing: 'border-box', width: '100%', borderRadius: 8, border: 0, background: BLUE, padding: '8px 16px', fontWeight: 600, color: '#fff', cursor: 'pointer', font: 'inherit' };
const ghostButton: React.CSSProperties = { ...primaryButton, background: 'transparent', border: `1px solid ${BORDER}`, fontWeight: 500 };
const dangerButton: React.CSSProperties = { ...ghostButton, color: '#f87171', borderColor: '#7f1d1d' };
const input: React.CSSProperties = { boxSizing: 'border-box', width: '100%', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#0E111B', padding: '8px 12px', color: '#fff', font: 'inherit', outline: 'none' };
const muted: React.CSSProperties = { color: '#94a3b8', fontSize: 12, margin: 0 };
const errorStyle: React.CSSProperties = { color: '#f87171', fontSize: 12, margin: 0 };

const short = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`;
const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/** Ask for the password again, then run `action` with it. Shows what the action returns (a key or a phrase) until dismissed. */
function PasswordGate({ label, run, revealTitle }: { label: string; run: (password: string) => Promise<string>; revealTitle: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    setOpen(false);
    setPassword('');
    setSecret('');
    setError('');
  };

  if (secret) {
    return (
      <div style={{ ...box, padding: 0 }}>
        <p style={muted}>{revealTitle}. Anyone who sees it can take everything in this account. Do not share it.</p>
        <textarea readOnly value={secret} rows={3} style={{ ...input, fontFamily: 'monospace', fontSize: 12, resize: 'none' }} onFocus={(e) => e.currentTarget.select()} />
        <button type="button" style={ghostButton} onClick={close}>Hide</button>
      </div>
    );
  }
  if (!open) return <button type="button" style={ghostButton} onClick={() => setOpen(true)}>{label}</button>;
  return (
    <form
      style={{ ...box, padding: 0 }}
      onSubmit={(e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        void run(password)
          .then((value) => setSecret(value))
          .catch((err: unknown) => setError(err instanceof Error ? err.message : 'That did not work.'))
          .finally(() => {
            setBusy(false);
            setPassword('');
          });
      }}
    >
      <p style={muted}>Enter your wallet password to continue.</p>
      <input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={input} />
      {error && <p style={errorStyle}>{error}</p>}
      <button type="submit" disabled={busy || !password} style={{ ...primaryButton, opacity: busy || !password ? 0.6 : 1 }}>{busy ? 'Checking…' : 'Continue'}</button>
      <button type="button" style={ghostButton} onClick={close}>Cancel</button>
    </form>
  );
}

export default function VaultAccountsPanel({ api, onActiveChanged }: VaultAccountsPanelProps) {
  const [screen, setScreen] = useState<Screen>({ kind: 'list' });
  const [accounts, setAccounts] = useState<VaultAccountRow[]>([]);
  const [active, setActive] = useState<string | undefined>(undefined);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [renameValue, setRenameValue] = useState('');

  const reload = useCallback(async () => {
    const result = await api.list();
    setAccounts(result.accounts);
    setActive(result.active);
  }, [api]);

  useEffect(() => {
    void reload().catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load the accounts.'));
  }, [reload]);

  const run = async (work: () => Promise<void>, then?: Screen) => {
    setBusy(true);
    setError('');
    try {
      await work();
      await reload();
      if (then) setScreen(then);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  };

  const trimmedKey = keyInput.trim();
  const keyNormalized = trimmedKey.startsWith('0x') ? trimmedKey : `0x${trimmedKey}`;
  const keyValid = PRIVATE_KEY_RE.test(keyNormalized);
  let previewAddress = '';
  if (keyValid) {
    try {
      previewAddress = privateKeyToAccount(keyNormalized as `0x${string}`).address;
    } catch {
      previewAddress = '';
    }
  }

  if (screen.kind === 'add') {
    return (
      <div id="VAULT_ADD_ACCOUNT" style={box}>
        <p style={muted}>Create a new account from your Secret Recovery Phrase, or import one you already have.</p>
        <button type="button" disabled={busy} style={primaryButton} onClick={() => void run(() => api.addDerived(), { kind: 'list' })}>
          {busy ? 'Creating…' : 'Create account'}
        </button>
        <button type="button" style={ghostButton} onClick={() => { setKeyInput(''); setError(''); setScreen({ kind: 'importKey' }); }}>Import account (private key)</button>
        <button type="button" style={ghostButton} onClick={() => { setError(''); setScreen({ kind: 'list' }); }}>Back</button>
        {error && <p style={errorStyle}>{error}</p>}
      </div>
    );
  }

  if (screen.kind === 'importKey') {
    return (
      <div id="VAULT_IMPORT_ACCOUNT" style={{ ...box, padding: 0 }}>
        <ImportAccountForm
          value={keyInput}
          onChange={setKeyInput}
          formatInvalid={trimmedKey.length > 0 && !keyValid}
          previewAddress={previewAddress}
          error={error}
          isImporting={busy}
          onImport={() => void run(() => api.importPrivateKey(keyNormalized), { kind: 'list' }).then(() => setKeyInput(''))}
        />
        <div style={{ padding: '0 12px 8px' }}>
          <button type="button" style={ghostButton} onClick={() => { setKeyInput(''); setError(''); setScreen({ kind: 'add' }); }}>Back</button>
        </div>
      </div>
    );
  }

  if (screen.kind === 'phrase') {
    return (
      <div id="VAULT_PHRASE" style={box}>
        <PasswordGate label="Show Secret Recovery Phrase" revealTitle="Your Secret Recovery Phrase" run={(password) => api.revealMnemonic(password)} />
        <button type="button" style={ghostButton} onClick={() => setScreen({ kind: 'list' })}>Back</button>
      </div>
    );
  }

  if (screen.kind === 'detail') {
    const account = accounts.find((a) => same(a.address, screen.address));
    if (!account) {
      return (
        <div style={box}>
          <p style={muted}>That account is no longer in the wallet.</p>
          <button type="button" style={ghostButton} onClick={() => setScreen({ kind: 'list' })}>Back</button>
        </div>
      );
    }
    return (
      <div id="VAULT_ACCOUNT_DETAIL" style={box}>
        <label style={muted} htmlFor="vault-account-name">Name</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="vault-account-name" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} style={input} />
          <button type="button" disabled={busy || !renameValue.trim() || renameValue.trim() === account.name} style={{ ...primaryButton, width: 'auto' }} onClick={() => void run(() => api.rename(account.address, renameValue.trim()))}>Save</button>
        </div>
        <p style={muted}>Address</p>
        <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{account.address}</p>
        {account.devOrigin && <p style={muted}>This account uses a published development key. It can only be used on the local test chain.</p>}
        {!same(account.address, active) && (
          <button type="button" disabled={busy} style={primaryButton} onClick={() => void run(async () => { await api.setActive(account.address); onActiveChanged?.(account.address); })}>Use this account</button>
        )}
        <PasswordGate label="Show private key" revealTitle="Private key" run={(password) => api.exportPrivateKey(password, account.address)} />
        {account.source === 'imported' && (
          <button type="button" disabled={busy} style={dangerButton} onClick={() => void run(() => api.remove(account.address), { kind: 'list' })}>Remove account</button>
        )}
        <button type="button" style={ghostButton} onClick={() => { setError(''); setScreen({ kind: 'list' }); }}>Back</button>
        {error && <p style={errorStyle}>{error}</p>}
      </div>
    );
  }

  return (
    <div id="VAULT_ACCOUNTS" style={{ ...box, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', minHeight: 0 }}>
        {accounts.map((a) => (
          <div key={a.address} style={{ display: 'flex', gap: 6 }}>
            <button
              type="button"
              aria-label={`Use ${a.name}`}
              style={{ ...rowButton, borderColor: same(a.address, active) ? BLUE : BORDER }}
              onClick={() => void run(async () => { await api.setActive(a.address); onActiveChanged?.(a.address); })}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 600 }}>{a.name}{same(a.address, active) ? ' (active)' : ''}</span>
                <span style={{ display: 'block', ...muted, fontFamily: 'monospace' }}>{short(a.address)}{a.devOrigin ? ' · test key' : ''}</span>
              </span>
            </button>
            <button type="button" aria-label={`Details for ${a.name}`} style={{ ...ghostButton, width: 'auto' }} onClick={() => { setRenameValue(a.name); setError(''); setScreen({ kind: 'detail', address: a.address }); }}>⋯</button>
          </div>
        ))}
        {accounts.length === 0 && <p style={muted}>No accounts yet.</p>}
      </div>
      {error && <p style={errorStyle}>{error}</p>}
      <AddWalletAccountButton label="Add an Account" onClick={() => { setError(''); setScreen({ kind: 'add' }); }} />
      <button type="button" style={ghostButton} onClick={() => setScreen({ kind: 'phrase' })}>Secret Recovery Phrase</button>
    </div>
  );
}
