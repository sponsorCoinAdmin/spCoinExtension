// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/WalletOnboardingPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, tables rows 21 and 23) -- first-run setup for a wallet that owns its keys, MetaMask's onboarding:
// choose a password and either create a new wallet (the Secret Recovery Phrase is shown ONCE, and the user must confirm they saved it before
// continuing) or import an existing phrase. Host-independent: the host supplies two async calls and gets told when setup is finished.
'use client';

import { formKitStyle } from '@sponsorcoin/spcoin-common/styles';
import React, { useState } from 'react';
import { isValidMnemonic, normalizeMnemonic } from './vault/walletAccounts';
import { MIN_WALLET_PASSWORD_LENGTH } from './session/walletSession';
import RecoveryPhraseScreen from './RecoveryPhraseScreen';

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

const box = formKitStyle.box('12px');
const primary = formKitStyle.primary;
const ghost = formKitStyle.ghost;
const field = formKitStyle.input;
const muted = formKitStyle.muted;
const err = formKitStyle.error;

export default function WalletOnboardingPanel({ createWallet, importWallet, restoreBackup, onDone }: WalletOnboardingPanelProps) {
  const [step, setStep] = useState<Step>('choose');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phraseInput, setPhraseInput] = useState('');
  const [backupText, setBackupText] = useState('');
  const [backupName, setBackupName] = useState('');
  const [phrase, setPhrase] = useState('');
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
        <button type="submit" disabled={busy} style={formKitStyle.primaryDim(busy)}>{busy ? 'Creating…' : 'Create wallet'}</button>
        <button type="button" style={ghost} onClick={() => { setError(''); setStep('choose'); }}>Back</button>
      </form>
    );
  }

  if (step === 'phrase') {
    return <RecoveryPhraseScreen recoveryPhrase={phrase} onContinue={() => { setPhrase(''); onDone(); }} />;
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
        <button type="submit" disabled={busy || !backupText || !password} style={formKitStyle.primaryDim(busy || !backupText || !password)}>{busy ? 'Restoring…' : 'Restore wallet'}</button>
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
        <textarea rows={3} placeholder="Secret Recovery Phrase" value={phraseInput} onChange={(e) => setPhraseInput(e.target.value)} style={formKitStyle.inputNoResize} />
        {passwordFields}
        {error && <p style={err}>{error}</p>}
        <button type="submit" disabled={busy || !phraseInput.trim()} style={formKitStyle.primaryDim(busy || !phraseInput.trim())}>{busy ? 'Importing…' : 'Import wallet'}</button>
        <button type="button" style={ghost} onClick={() => { setError(''); setStep('choose'); }}>Back</button>
      </form>
    );
  }

  return (
    <div id="WALLET_ONBOARDING" style={box}>
      <p style={formKitStyle.heading}>Set up your wallet</p>
      <p style={muted}>This wallet keeps your keys on this device, encrypted with your password.</p>
      <button type="button" style={primary} onClick={() => { setError(''); setStep('create'); }}>Create a new wallet</button>
      <button type="button" style={ghost} onClick={() => { setError(''); setStep('import'); }}>I already have a Secret Recovery Phrase</button>
      {restoreBackup ? <button type="button" style={ghost} onClick={() => { setError(''); setStep('restore'); }}>Restore from a backup file</button> : null}
    </div>
  );
}
