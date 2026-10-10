// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/WalletOnboardingPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, tables rows 21 and 23) -- first-run setup for a wallet that owns its keys, MetaMask's onboarding:
// choose a password and either create a new wallet (the Secret Recovery Phrase is shown ONCE, and the user must confirm they saved it before
// continuing) or import an existing phrase. Host-independent: the host supplies two async calls and gets told when setup is finished.
'use client';
import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { isValidMnemonic, normalizeMnemonic } from './vault/walletAccounts';
import { MIN_WALLET_PASSWORD_LENGTH } from './session/walletSession';
const BLUE = '#5981F3';
const BORDER = '#334155';
const box = { boxSizing: 'border-box', width: '100%', padding: '12px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 8 };
const primary = { boxSizing: 'border-box', width: '100%', borderRadius: 8, border: 0, background: BLUE, padding: '8px 16px', fontWeight: 600, color: '#fff', cursor: 'pointer', font: 'inherit' };
const ghost = { ...primary, background: 'transparent', border: `1px solid ${BORDER}`, fontWeight: 500 };
const field = { boxSizing: 'border-box', width: '100%', borderRadius: 8, border: `1px solid ${BORDER}`, background: '#0E111B', padding: '8px 12px', color: '#fff', font: 'inherit', outline: 'none' };
const muted = { color: '#94a3b8', fontSize: 12, margin: 0 };
const err = { color: '#f87171', fontSize: 12, margin: 0 };
export default function WalletOnboardingPanel({ createWallet, importWallet, onDone }) {
    const [step, setStep] = useState('choose');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [phraseInput, setPhraseInput] = useState('');
    const [phrase, setPhrase] = useState('');
    const [saved, setSaved] = useState(false);
    const [copied, setCopied] = useState(false);
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
        const words = phrase.split(' ');
        return (_jsxs("div", { id: "WALLET_ONBOARDING_PHRASE", style: box, children: [_jsx("p", { style: { margin: 0, fontWeight: 600 }, children: "Your Secret Recovery Phrase" }), _jsx("p", { style: muted, children: "Write these words down in order and keep them somewhere safe. They are the only way to get your accounts back, and anyone who has them can take everything. This is the only time they are shown automatically." }), _jsx("ol", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, margin: 0, padding: 0, listStylePosition: 'inside', fontFamily: 'monospace', fontSize: 12 }, children: words.map((w, i) => _jsx("li", { style: { border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 6px' }, children: w }, i)) }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }, children: [_jsxs("label", { style: { display: 'flex', gap: 8, alignItems: 'center', flex: 1 }, children: [_jsx("input", { type: "checkbox", checked: saved, onChange: (e) => setSaved(e.target.checked) }), " I have saved my Secret Recovery Phrase"] }), _jsx("button", { type: "button", title: copied ? 'Copied' : 'Copy the phrase (words separated by commas)', "aria-label": "Copy Secret Recovery Phrase", onClick: () => {
                                void navigator.clipboard.writeText(words.join(',')).then(() => {
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 1500);
                                });
                            }, style: { background: 'none', border: 0, padding: 2, cursor: 'pointer', color: copied ? '#4ade80' : '#94a3b8', display: 'flex' }, children: copied ? (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) })) : (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] })) })] }), _jsx("button", { type: "button", disabled: !saved, style: { ...primary, opacity: saved ? 1 : 0.5 }, onClick: () => { setPhrase(''); onDone(); }, children: "Continue" })] }));
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
    return (_jsxs("div", { id: "WALLET_ONBOARDING", style: box, children: [_jsx("p", { style: { margin: 0, fontWeight: 600 }, children: "Set up your wallet" }), _jsx("p", { style: muted, children: "This wallet keeps your keys on this device, encrypted with your password." }), _jsx("button", { type: "button", style: primary, onClick: () => { setError(''); setStep('create'); }, children: "Create a new wallet" }), _jsx("button", { type: "button", style: ghost, onClick: () => { setError(''); setStep('import'); }, children: "I already have a Secret Recovery Phrase" })] }));
}
