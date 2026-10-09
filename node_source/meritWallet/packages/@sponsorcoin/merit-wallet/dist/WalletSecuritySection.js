// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/WalletSecuritySection.tsx
//
// 2026-10-09 -- the Config tab's "Wallet Security" content for a host whose keys live in the wallet itself (the extension's vault), written once in the package.
// The web app's WalletSecurityPanel does the same job against its server keystore; this is the vault's version, modelled on MetaMask's Security & privacy
// screen: every reveal asks for the wallet password, a revealed key stays hidden until the user chooses Show, and Copy puts it on the clipboard. Two rows:
// the active account's private key, and (as in MetaMask) the Secret Recovery Phrase. No host imports: the host passes the two reveal calls.
'use client';
import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { SmallYellowButton } from '@sponsorcoin/spcoin-panels';
import PasswordPromptDialog from './PasswordPromptDialog';
import { useActiveAccountProfile } from './swap/activeAccountProfile';
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#fff', marginBottom: 6 };
const boxStyle = {
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
function RevealRow({ title, hint, dialogTitle, dialogMessage, disabled, reveal, }) {
    const [asking, setAsking] = useState(false);
    const [secret, setSecret] = useState('');
    const [visible, setVisible] = useState(false);
    const [copied, setCopied] = useState(false);
    const clear = () => {
        setSecret('');
        setVisible(false);
    };
    const copy = () => {
        if (!secret)
            return;
        void navigator.clipboard.writeText(secret).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 6 }, children: [_jsx("span", { style: labelStyle, children: title }), hint && _jsx("span", { style: { fontSize: 11, color: '#94a3b8' }, children: hint }), secret ? (_jsxs(_Fragment, { children: [_jsx("div", { style: boxStyle, children: visible ? secret : '•'.repeat(Math.min(secret.length, 48)) }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx(SmallYellowButton, { onClick: () => setVisible((v) => !v), children: visible ? 'Hide' : 'Show' }), _jsx(SmallYellowButton, { onClick: copy, children: copied ? 'Copied' : 'Copy' }), _jsx(SmallYellowButton, { onClick: clear, children: "Clear" })] })] })) : (_jsx("div", { children: _jsx(SmallYellowButton, { disabled: disabled, onClick: () => setAsking(true), children: "Reveal" }) })), asking && (_jsx(PasswordPromptDialog, { title: dialogTitle, message: dialogMessage, confirmLabel: "Reveal", onClose: () => setAsking(false), onConfirm: async (password) => {
                    const value = await reveal(password);
                    setSecret(value);
                    setVisible(false);
                    setAsking(false);
                } }))] }));
}
export default function WalletSecuritySection({ api }) {
    const profile = useActiveAccountProfile();
    const address = profile?.address ?? '';
    const who = [profile?.symbol, profile?.name].filter(Boolean).join(' | ');
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 14 }, children: [_jsx(RevealRow, { title: "Security \u2014 Reveal Private Key", hint: address ? `${who ? `${who} — ` : ''}${address}` : 'Select an account first.', dialogTitle: "Reveal Private Key", dialogMessage: "Anyone with this key controls the account. Enter your wallet password to continue.", disabled: !address, reveal: (password) => api.revealPrivateKey(password, address) }), api.revealPhrase && (_jsx(RevealRow, { title: "Security \u2014 Reveal Secret Recovery Phrase", hint: "The phrase restores every account of this wallet.", dialogTitle: "Reveal Secret Recovery Phrase", dialogMessage: "Anyone with this phrase controls every account. Enter your wallet password to continue.", reveal: (password) => api.revealPhrase(password) }))] }));
}
