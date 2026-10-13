// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/WalletOnboardingPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, tables rows 21 and 23) -- first-run setup for a wallet that owns its keys, MetaMask's onboarding:
// choose a password and either create a new wallet (the Secret Recovery Phrase is shown ONCE, and the user must confirm they saved it before
// continuing) or import an existing phrase. Host-independent: the host supplies two async calls and gets told when setup is finished.
'use client';

import React, { useState } from 'react';
import { isValidMnemonic, normalizeMnemonic } from './vault/walletAccounts';
import { MIN_WALLET_PASSWORD_LENGTH } from './session/walletSession';
import { NEW_PHRASE_SHOWN_MAX_MS, useSecretClearing } from './security/secretClearing';

export interface WalletOnboardingPanelProps {
  /** Create a new wallet under `password`; resolves with the Secret Recovery Phrase to show once. */
  createWallet(password: string): Promise<{ recoveryPhrase: string }>;
  /** Restore a wallet from an existing phrase under `password`. */
  importWallet(recoveryPhrase: string, password: string): Promise<void>;
  /** 2026-10-12 (accountAuthDesign V8): restore the wallet from an encrypted backup file (its text) and the password it was made with. Omitted: the option is not shown. */
  restoreBackup?(file: string, password: string): Promise<void>;
  /** Setup is finished and the wallet is unlocked. */
  onDone(): void;
}

type Step = 'choose' | 'create' | 'phrase' | 'import' | 'restore';

const BLUE = '#5981F3';
const BORDER = '#334155';
const box: React.CSSProperties = { boxSizing: 'border-box', width: '100%', padding: '12px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 8 };
const primary: React.CSSProperties = { boxSizing: 'border-box', width: '100%', borderRadius: 8, border: 0, background: BLUE, padding: '8px 16px', fontWeight: 600, color: '#fff', cursor: 'pointer', font: 'inherit' };
const ghost: React.CSSProperties = { ...primary, background: 'transparent', border: `1px solid ${BORDER}`, fontWeight: 500 };
const field: React.CSSProperties = { boxSizing: 'border-box', width: '100%', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#0E111B', padding: '8px 12px', color: '#fff', font: 'inherit', outline: 'none' };
const muted: React.CSSProperties = { color: '#94a3b8', fontSize: 12, margin: 0 };
const err: React.CSSProperties = { color: '#f87171', fontSize: 12, margin: 0 };

export default function WalletOnboardingPanel({ createWallet, importWallet, restoreBackup, onDone }: WalletOnboardingPanelProps) {
  const [step, setStep] = useState<Step>('choose');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phraseInput, setPhraseInput] = useState('');
  const [backupText, setBackupText] = useState('');
  const [backupName, setBackupName] = useState('');
  const [phrase, setPhrase] = useState('');
  const [phraseHidden, setPhraseHidden] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const passwordProblem = () =>
    password.length < MIN_WALLET_PASSWORD_LENGTH ? `Password must be at least ${MIN_WALLET_PASSWORD_LENGTH} characters.` : password !== confirm ? 'Passwords do not match.' : '';

  const passwordFields = (
    <>
      <input type="password" autoComplete="new-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={field} />
      <input type="password" autoComplete="new-password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={field} />
    </>
  );

  // the new phrase does not stay on the screen forever: hidden when the page is hidden or after five minutes (it can be shown again in Security, with the password)
  useSecretClearing(!!phrase, () => { setPhrase(''); setPhraseHidden(true); }, NEW_PHRASE_SHOWN_MAX_MS);

  if (step === 'create') {
    return (
      <form
        id="WALLET_ONBOARDING_CREATE"
        style={box}
        onSubmit={(e) => {
          e.preventDefault();
          const problem = passwordProblem();
          if (problem) return setError(problem);
          setBusy(true);
          setError('');
          createWallet(password)
            .then((result) => {
              setPhrase(result.recoveryPhrase);
              setPassword('');
              setConfirm('');
              setStep('phrase');
            })
            .catch((e2: unknown) => setError(e2 instanceof Error ? e2.message : 'The wallet could not be created.'))
            .finally(() => setBusy(false));
        }}
      >
        <p style={muted}>Choose a password. It unlocks this wallet on this device.</p>
        {passwordFields}
        {error && <p style={err}>{error}</p>}
        <button type="submit" disabled={busy} style={{ ...primary, opacity: busy ? 0.6 : 1 }}>{busy ? 'Creating…' : 'Create wallet'}</button>
        <button type="button" style={ghost} onClick={() => { setError(''); setStep('choose'); }}>Back</button>
      </form>
    );
  }

  if (step === 'phrase') {
    const words = phrase ? phrase.split(' ') : [];
    return (
      <div id="WALLET_ONBOARDING_PHRASE" style={box}>
        <p style={{ margin: 0, fontWeight: 600 }}>Your Secret Recovery Phrase</p>
        <p style={muted}>Write these words down in order and keep them somewhere safe. They are the only way to get your accounts back, and anyone who has them can take everything. This is the only time they are shown automatically.</p>
        {phraseHidden && <p id="WALLET_ONBOARDING_PHRASE_HIDDEN" style={muted}>The phrase was hidden for your safety (the page was hidden or the screen was open for a while). Your wallet is created: show the phrase again in Security, with your password.</p>}
        {!phraseHidden && <ol style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, margin: 0, padding: 0, listStylePosition: 'inside', fontFamily: 'monospace', fontSize: 12 }}>
          {words.map((w, i) => <li key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 6px' }}>{w}</li>)}
        </ol>}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
            <input type="checkbox" checked={saved} disabled={phraseHidden} onChange={(e) => setSaved(e.target.checked)} /> I have saved my Secret Recovery Phrase
          </label>
          <button
            type="button"
            title={copied ? 'Copied' : 'Copy the phrase (words separated by commas)'}
            aria-label="Copy Secret Recovery Phrase"
            onClick={() => {
              void navigator.clipboard.writeText(words.join(',')).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            style={{ background: 'none', border: 0, padding: 2, cursor: 'pointer', color: copied ? '#4ade80' : '#94a3b8', display: 'flex' }}
          >
            {copied ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
            )}
          </button>
        </div>
        <button type="button" disabled={!saved && !phraseHidden} style={{ ...primary, opacity: saved || phraseHidden ? 1 : 0.5 }} onClick={() => { setPhrase(''); setPhraseHidden(false); onDone(); }}>Continue</button>
      </div>
    );
  }

  if (step === 'restore' && restoreBackup) {
    return (
      <form
        id="WALLET_ONBOARDING_RESTORE"
        style={box}
        onSubmit={(e) => {
          e.preventDefault();
          if (!backupText) return setError('Choose a backup file first.');
          setBusy(true);
          setError('');
          restoreBackup(backupText, password)
            .then(() => {
              setPassword('');
              setBackupText('');
              onDone();
            })
            .catch((e2: unknown) => setError(e2 instanceof Error ? e2.message : 'The backup could not be restored.'))
            .finally(() => setBusy(false));
        }}
      >
        <p style={muted}>Choose the backup file and enter the password it was made with.</p>
        <input
          type="file"
          accept=".json,application/json"
          style={field}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBackupName(file.name);
            void file.text().then(setBackupText);
          }}
        />
        {backupName && <p style={muted}>{backupName}</p>}
        <input type="password" autoComplete="current-password" placeholder="Backup password" value={password} onChange={(e) => setPassword(e.target.value)} style={field} />
        {error && <p style={err}>{error}</p>}
        <button type="submit" disabled={busy || !backupText || !password} style={{ ...primary, opacity: busy || !backupText || !password ? 0.6 : 1 }}>{busy ? 'Restoring…' : 'Restore wallet'}</button>
        <button type="button" style={ghost} onClick={() => { setError(''); setStep('choose'); }}>Back</button>
      </form>
    );
  }

  if (step === 'import') {
    const normalized = normalizeMnemonic(phraseInput);
    return (
      <form
        id="WALLET_ONBOARDING_IMPORT"
        style={box}
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          void (async () => {
            try {
              if (!(await isValidMnemonic(normalized))) throw new Error('That Secret Recovery Phrase is not valid.');
              const problem = passwordProblem();
              if (problem) throw new Error(problem);
              await importWallet(normalized, password);
              setPassword('');
              setConfirm('');
              setPhraseInput('');
              onDone();
            } catch (e2) {
              setError(e2 instanceof Error ? e2.message : 'The wallet could not be imported.');
            } finally {
              setBusy(false);
            }
          })();
        }}
      >
        <p style={muted}>Enter your 12-word Secret Recovery Phrase, then choose a password for this device.</p>
        <textarea rows={3} placeholder="Secret Recovery Phrase" value={phraseInput} onChange={(e) => setPhraseInput(e.target.value)} style={{ ...field, resize: 'none' }} />
        {passwordFields}
        {error && <p style={err}>{error}</p>}
        <button type="submit" disabled={busy || !phraseInput.trim()} style={{ ...primary, opacity: busy || !phraseInput.trim() ? 0.6 : 1 }}>{busy ? 'Importing…' : 'Import wallet'}</button>
        <button type="button" style={ghost} onClick={() => { setError(''); setStep('choose'); }}>Back</button>
      </form>
    );
  }

  return (
    <div id="WALLET_ONBOARDING" style={box}>
      <p style={{ margin: 0, fontWeight: 600 }}>Set up your wallet</p>
      <p style={muted}>This wallet keeps your keys on this device, encrypted with your password.</p>
      <button type="button" style={primary} onClick={() => { setError(''); setStep('create'); }}>Create a new wallet</button>
      <button type="button" style={ghost} onClick={() => { setError(''); setStep('import'); }}>I already have a Secret Recovery Phrase</button>
      {restoreBackup ? <button type="button" style={ghost} onClick={() => { setError(''); setStep('restore'); }}>Restore from a backup file</button> : null}
    </div>
  );
}
