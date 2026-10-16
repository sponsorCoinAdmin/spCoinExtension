// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/WalletOnboardingPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, tables rows 21 and 23) -- first-run setup for a wallet that owns its keys, MetaMask's onboarding:
// choose a password and either create a new wallet (the Secret Recovery Phrase is shown ONCE, and the user must confirm they saved it before
// continuing) or import an existing phrase. Host-independent: the host supplies two async calls and gets told when setup is finished.
'use client';
import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { isValidMnemonic, normalizeMnemonic } from './vault/walletAccounts';
import { MIN_WALLET_PASSWORD_LENGTH } from './session/walletSession';
import RecoveryPhraseScreen from './RecoveryPhraseScreen';
const BLUE = '#5981F3';
const BORDER = '#334155';
const box = { boxSizing: 'border-box', width: '100%', padding: '12px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 8 };
const primary = { boxSizing: 'border-box', width: '100%', borderRadius: 8, border: 0, background: BLUE, padding: '8px 16px', fontWeight: 600, color: '#fff', cursor: 'pointer', font: 'inherit' };
const ghost = { ...primary, background: 'transparent', border: `1px solid ${BORDER}`, fontWeight: 500 };
const field = { boxSizing: 'border-box', width: '100%', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#0E111B', padding: '8px 12px', color: '#fff', font: 'inherit', outline: 'none' };
const muted = { color: '#94a3b8', fontSize: 12, margin: 0 };
const err = { color: '#f87171', fontSize: 12, margin: 0 };
export default function WalletOnboardingPanel({ createWallet, importWallet, restoreBackup, onDone }) {
    const [step, setStep] = useState('choose');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [phraseInput, setPhraseInput] = useState('');
    const [backupText, setBackupText] = useState('');
    const [backupName, setBackupName] = useState('');
    const [phrase, setPhrase] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const passwordProblem = () => password.length < MIN_WALLET_PASSWORD_LENGTH ? `Password must be at least ${MIN_WALLET_PASSWORD_LENGTH} characters.` : password !== confirm ? 'Passwords do not match.' : '';
    const passwordFields = (_jsxs(_Fragment, { children: [_jsx("input", { type: "password", autoComplete: "new-password", placeholder: "Password", value: password, onChange: (e) => setPassword(e.target.value), style: field }), _jsx("input", { type: "password", autoComplete: "new-password", placeholder: "Confirm password", value: confirm, onChange: (e) => setConfirm(e.target.value), style: field })] }));
    if (step === 'create') {
        return (_jsxs("form", { id: "WALLET_ONBOARDING_CREATE", style: box, onSubmit: (e) => {
                e.preventDefault();
                const problem = passwordProblem();
                if (problem)
                    return setError(problem);
                setBusy(true);
                setError('');
                createWallet(password)
                    .then((result) => {
                    setPhrase(result.recoveryPhrase);
                    setPassword('');
                    setConfirm('');
                    setStep('phrase');
                })
                    .catch((e2) => setError(e2 instanceof Error ? e2.message : 'The wallet could not be created.'))
                    .finally(() => setBusy(false));
            }, children: [_jsx("p", { style: muted, children: "Choose a password. It unlocks this wallet on this device." }), passwordFields, error && _jsx("p", { style: err, children: error }), _jsx("button", { type: "submit", disabled: busy, style: { ...primary, opacity: busy ? 0.6 : 1 }, children: busy ? 'Creating…' : 'Create wallet' }), _jsx("button", { type: "button", style: ghost, onClick: () => { setError(''); setStep('choose'); }, children: "Back" })] }));
    }
    if (step === 'phrase') {
        return _jsx(RecoveryPhraseScreen, { recoveryPhrase: phrase, onContinue: () => { setPhrase(''); onDone(); } });
    }
    if (step === 'restore' && restoreBackup) {
        return (_jsxs("form", { id: "WALLET_ONBOARDING_RESTORE", style: box, onSubmit: (e) => {
                e.preventDefault();
                if (!backupText)
                    return setError('Choose a backup file first.');
                setBusy(true);
                setError('');
                restoreBackup(backupText, password)
                    .then(() => {
                    setPassword('');
                    setBackupText('');
                    onDone();
                })
                    .catch((e2) => setError(e2 instanceof Error ? e2.message : 'The backup could not be restored.'))
                    .finally(() => setBusy(false));
            }, children: [_jsx("p", { style: muted, children: "Choose the backup file and enter the password it was made with." }), _jsx("input", { type: "file", accept: ".json,application/json", style: field, onChange: (event) => {
                        const file = event.target.files?.[0];
                        if (!file)
                            return;
                        setBackupName(file.name);
                        void file.text().then(setBackupText);
                    } }), backupName && _jsx("p", { style: muted, children: backupName }), _jsx("input", { type: "password", autoComplete: "current-password", placeholder: "Backup password", value: password, onChange: (e) => setPassword(e.target.value), style: field }), error && _jsx("p", { style: err, children: error }), _jsx("button", { type: "submit", disabled: busy || !backupText || !password, style: { ...primary, opacity: busy || !backupText || !password ? 0.6 : 1 }, children: busy ? 'Restoring…' : 'Restore wallet' }), _jsx("button", { type: "button", style: ghost, onClick: () => { setError(''); setStep('choose'); }, children: "Back" })] }));
    }
    if (step === 'import') {
        const normalized = normalizeMnemonic(phraseInput);
        return (_jsxs("form", { id: "WALLET_ONBOARDING_IMPORT", style: box, onSubmit: (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                void (async () => {
                    try {
                        if (!(await isValidMnemonic(normalized)))
                            throw new Error('That Secret Recovery Phrase is not valid.');
                        const problem = passwordProblem();
                        if (problem)
                            throw new Error(problem);
                        await importWallet(normalized, password);
                        setPassword('');
                        setConfirm('');
                        setPhraseInput('');
                        onDone();
                    }
                    catch (e2) {
                        setError(e2 instanceof Error ? e2.message : 'The wallet could not be imported.');
                    }
                    finally {
                        setBusy(false);
                    }
                })();
            }, children: [_jsx("p", { style: muted, children: "Enter your 12-word Secret Recovery Phrase, then choose a password for this device." }), _jsx("textarea", { rows: 3, placeholder: "Secret Recovery Phrase", value: phraseInput, onChange: (e) => setPhraseInput(e.target.value), style: { ...field, resize: 'none' } }), passwordFields, error && _jsx("p", { style: err, children: error }), _jsx("button", { type: "submit", disabled: busy || !phraseInput.trim(), style: { ...primary, opacity: busy || !phraseInput.trim() ? 0.6 : 1 }, children: busy ? 'Importing…' : 'Import wallet' }), _jsx("button", { type: "button", style: ghost, onClick: () => { setError(''); setStep('choose'); }, children: "Back" })] }));
    }
    return (_jsxs("div", { id: "WALLET_ONBOARDING", style: box, children: [_jsx("p", { style: { margin: 0, fontWeight: 600 }, children: "Set up your wallet" }), _jsx("p", { style: muted, children: "This wallet keeps your keys on this device, encrypted with your password." }), _jsx("button", { type: "button", style: primary, onClick: () => { setError(''); setStep('create'); }, children: "Create a new wallet" }), _jsx("button", { type: "button", style: ghost, onClick: () => { setError(''); setStep('import'); }, children: "I already have a Secret Recovery Phrase" }), restoreBackup ? _jsx("button", { type: "button", style: ghost, onClick: () => { setError(''); setStep('restore'); }, children: "Restore from a backup file" }) : null] }));
}
