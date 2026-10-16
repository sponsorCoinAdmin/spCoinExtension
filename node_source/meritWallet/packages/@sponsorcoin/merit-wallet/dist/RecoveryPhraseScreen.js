// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/RecoveryPhraseScreen.tsx
//
// 2026-10-13: the "Your Secret Recovery Phrase" screen, moved out of WalletOnboardingPanel so the extension's first-run flow and the web popup's first-run flow (password page -> this screen -> the wallet) show
// the same one: the words in a grid, a copy icon (words separated by commas), an "I have saved it" checkbox and Continue. The phrase is shown once; it is hidden when the page is hidden or after a time limit
// (security/secretClearing.ts), and Continue stays available then (the wallet already exists; the phrase can be shown again in Security with the password).
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { usePlatform } from './platform/platform';
import { NEW_PHRASE_SHOWN_MAX_MS, useSecretClearing } from './security/secretClearing';
const BLUE = '#5981F3';
const BORDER = '#334155';
const box = { boxSizing: 'border-box', width: '100%', padding: '12px', color: '#fff', display: 'flex', flexDirection: 'column', gap: 8 };
const primary = { boxSizing: 'border-box', width: '100%', borderRadius: 8, border: 0, background: BLUE, padding: '8px 16px', fontWeight: 600, color: '#fff', cursor: 'pointer', font: 'inherit' };
const muted = { color: '#94a3b8', fontSize: 12, margin: 0 };
export default function RecoveryPhraseScreen({ recoveryPhrase, onContinue, autoHide = true }) {
    const [phrase, setPhrase] = useState(recoveryPhrase);
    const [phraseHidden, setPhraseHidden] = useState(false);
    const [saved, setSaved] = useState(false);
    const platform = usePlatform();
    const [copied, setCopied] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    useSecretClearing(!!phrase, () => { if (autoHide) {
        setPhrase('');
        setPhraseHidden(true);
    } }, NEW_PHRASE_SHOWN_MAX_MS);
    const infoText = autoHide
        ? (phraseHidden ? 'The phrase was hidden for your safety (the page was hidden or the screen was open for a while). Your wallet is created: show the phrase again in Security, with your password.' : 'The phrase is hidden automatically if the page is hidden or this screen stays open for a while. It can be shown again in Security, with your password.')
        : 'The phrase is shown only now and is not stored, so it cannot be shown again later. Anyone who has it can take everything: keep it somewhere safe.';
    const words = phrase ? phrase.split(' ') : [];
    return (_jsxs("div", { id: "WALLET_ONBOARDING_PHRASE", style: box, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, children: [_jsx("p", { style: { margin: 0, fontWeight: 600 }, children: "Your Secret Recovery Phrase" }), _jsx("button", { type: "button", id: "WALLET_ONBOARDING_PHRASE_INFO", "aria-label": "About the Secret Recovery Phrase", title: infoText, onClick: () => setInfoOpen((open) => !open), style: { background: 'none', border: 0, padding: 2, cursor: 'pointer', color: infoOpen ? '#8FA8FF' : '#94a3b8', display: 'flex' }, children: _jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "16", x2: "12", y2: "12" }), _jsx("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })] }) })] }), infoOpen && _jsx("p", { id: "WALLET_ONBOARDING_PHRASE_INFO_TEXT", style: muted, children: infoText }), _jsx("p", { style: muted, children: "Write these words down in order and keep them somewhere safe. They are the only way to get your accounts back, and anyone who has them can take everything. This is the only time they are shown automatically." }), !phraseHidden && _jsx("ol", { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, margin: 0, padding: 0, listStylePosition: 'inside', fontFamily: 'monospace', fontSize: 12 }, children: words.map((w, i) => _jsx("li", { style: { border: `1px solid ${BORDER}`, borderRadius: 6, padding: '4px 6px' }, children: w }, i)) }), _jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }, children: [_jsxs("label", { style: { display: 'flex', gap: 8, alignItems: 'center', flex: 1 }, children: [_jsx("input", { type: "checkbox", checked: saved, onChange: (e) => setSaved(e.target.checked) }), " I have saved my Secret Recovery Phrase"] }), _jsx("button", { type: "button", title: copied ? 'Copied' : 'Copy the phrase (words separated by commas)', "aria-label": "Copy Secret Recovery Phrase", onClick: () => {
                            void platform.copyText(words.join(',')).then(() => {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                            });
                        }, style: { background: 'none', border: 0, padding: 2, cursor: 'pointer', color: copied ? '#4ade80' : '#94a3b8', display: 'flex' }, children: copied ? (_jsx("svg", { xmlns: "http://www.w3.org/2000/svg", width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) })) : (_jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "22", height: "22", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), _jsx("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })] })) })] }), _jsx("button", { type: "button", disabled: !saved && !phraseHidden, style: { ...primary, opacity: saved || phraseHidden ? 1 : 0.5 }, onClick: () => { setPhrase(''); setPhraseHidden(false); onContinue(); }, children: "Continue" })] }));
}
