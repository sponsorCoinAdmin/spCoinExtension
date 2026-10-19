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
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { formKitStyle, vaultAccountsStyle } from '@sponsorcoin/spcoin-common/styles';
import { useCallback, useEffect, useState } from 'react';
import { privateKeyToAccount } from 'viem/accounts';
import { AddWalletAccountButton, ImportAccountForm } from '@sponsorcoin/spcoin-panels';
const PRIVATE_KEY_RE = /^0x[a-fA-F0-9]{64}$/;
const box = formKitStyle.box('8px 12px');
const primaryButton = formKitStyle.primary;
const ghostButton = formKitStyle.ghost;
const dangerButton = formKitStyle.danger;
const input = formKitStyle.input;
const muted = formKitStyle.muted;
const errorStyle = formKitStyle.error;
const short = (a) => `${a.slice(0, 6)}...${a.slice(-4)}`;
const same = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
/** Ask for the password again, then run `action` with it. Shows what the action returns (a key or a phrase) until dismissed. */
function PasswordGate({ label, run, revealTitle }) {
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
        return (_jsxs("div", { style: formKitStyle.box(0), children: [_jsxs("p", { style: muted, children: [revealTitle, ". Anyone who sees it can take everything in this account. Do not share it."] }), _jsx("textarea", { readOnly: true, value: secret, rows: 3, style: vaultAccountsStyle.secretText, onFocus: (e) => e.currentTarget.select() }), _jsx("button", { type: "button", style: ghostButton, onClick: close, children: "Hide" })] }));
    }
    if (!open)
        return _jsx("button", { type: "button", style: ghostButton, onClick: () => setOpen(true), children: label });
    return (_jsxs("form", { style: formKitStyle.box(0), onSubmit: (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            void run(password)
                .then((value) => setSecret(value))
                .catch((err) => setError(err instanceof Error ? err.message : 'That did not work.'))
                .finally(() => {
                setBusy(false);
                setPassword('');
            });
        }, children: [_jsx("p", { style: muted, children: "Enter your wallet password to continue." }), _jsx("input", { type: "password", autoFocus: true, value: password, onChange: (e) => setPassword(e.target.value), placeholder: "Password", style: input }), error && _jsx("p", { style: errorStyle, children: error }), _jsx("button", { type: "submit", disabled: busy || !password, style: formKitStyle.primaryDim(busy || !password), children: busy ? 'Checking…' : 'Continue' }), _jsx("button", { type: "button", style: ghostButton, onClick: close, children: "Cancel" })] }));
}
export default function VaultAccountsPanel({ api, onActiveChanged }) {
    const [screen, setScreen] = useState({ kind: 'list' });
    const [accounts, setAccounts] = useState([]);
    const [active, setActive] = useState(undefined);
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
        void reload().catch((err) => setError(err instanceof Error ? err.message : 'Could not load the accounts.'));
    }, [reload]);
    const run = async (work, then) => {
        setBusy(true);
        setError('');
        try {
            await work();
            await reload();
            if (then)
                setScreen(then);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'That did not work.');
        }
        finally {
            setBusy(false);
        }
    };
    const trimmedKey = keyInput.trim();
    const keyNormalized = trimmedKey.startsWith('0x') ? trimmedKey : `0x${trimmedKey}`;
    const keyValid = PRIVATE_KEY_RE.test(keyNormalized);
    let previewAddress = '';
    if (keyValid) {
        try {
            previewAddress = privateKeyToAccount(keyNormalized).address;
        }
        catch {
            previewAddress = '';
        }
    }
    if (screen.kind === 'add') {
        return (_jsxs("div", { id: "VAULT_ADD_ACCOUNT", style: box, children: [_jsx("p", { style: muted, children: "Create a new account from your Secret Recovery Phrase, or import one you already have." }), _jsx("button", { type: "button", disabled: busy, style: primaryButton, onClick: () => void run(() => api.addDerived(), { kind: 'list' }), children: busy ? 'Creating…' : 'Create account' }), _jsx("button", { type: "button", style: ghostButton, onClick: () => { setKeyInput(''); setError(''); setScreen({ kind: 'importKey' }); }, children: "Import account (private key)" }), _jsx("button", { type: "button", style: ghostButton, onClick: () => { setError(''); setScreen({ kind: 'list' }); }, children: "Back" }), error && _jsx("p", { style: errorStyle, children: error })] }));
    }
    if (screen.kind === 'importKey') {
        return (_jsxs("div", { id: "VAULT_IMPORT_ACCOUNT", style: formKitStyle.box(0), children: [_jsx(ImportAccountForm, { value: keyInput, onChange: setKeyInput, formatInvalid: trimmedKey.length > 0 && !keyValid, previewAddress: previewAddress, error: error, isImporting: busy, onImport: () => void run(() => api.importPrivateKey(keyNormalized), { kind: 'list' }).then(() => setKeyInput('')) }), _jsx("div", { style: vaultAccountsStyle.footer, children: _jsx("button", { type: "button", style: ghostButton, onClick: () => { setKeyInput(''); setError(''); setScreen({ kind: 'add' }); }, children: "Back" }) })] }));
    }
    if (screen.kind === 'phrase') {
        return (_jsxs("div", { id: "VAULT_PHRASE", style: box, children: [_jsx(PasswordGate, { label: "Show Secret Recovery Phrase", revealTitle: "Your Secret Recovery Phrase", run: (password) => api.revealMnemonic(password) }), _jsx("button", { type: "button", style: ghostButton, onClick: () => setScreen({ kind: 'list' }), children: "Back" })] }));
    }
    if (screen.kind === 'detail') {
        const account = accounts.find((a) => same(a.address, screen.address));
        if (!account) {
            return (_jsxs("div", { style: box, children: [_jsx("p", { style: muted, children: "That account is no longer in the wallet." }), _jsx("button", { type: "button", style: ghostButton, onClick: () => setScreen({ kind: 'list' }), children: "Back" })] }));
        }
        return (_jsxs("div", { id: "VAULT_ACCOUNT_DETAIL", style: box, children: [_jsx("label", { style: muted, htmlFor: "vault-account-name", children: "Name" }), _jsxs("div", { style: vaultAccountsStyle.renameRow, children: [_jsx("input", { id: "vault-account-name", value: renameValue, onChange: (e) => setRenameValue(e.target.value), style: input }), _jsx("button", { type: "button", disabled: busy || !renameValue.trim() || renameValue.trim() === account.name, style: vaultAccountsStyle.primaryAuto, onClick: () => void run(() => api.rename(account.address, renameValue.trim())), children: "Save" })] }), _jsx("p", { style: muted, children: "Address" }), _jsx("p", { style: vaultAccountsStyle.address, children: account.address }), account.devOrigin && _jsx("p", { style: muted, children: "This account uses a published development key. It can only be used on the local test chain." }), !same(account.address, active) && (_jsx("button", { type: "button", disabled: busy, style: primaryButton, onClick: () => void run(async () => { await api.setActive(account.address); onActiveChanged?.(account.address); }), children: "Use this account" })), _jsx(PasswordGate, { label: "Show private key", revealTitle: "Private key", run: (password) => api.exportPrivateKey(password, account.address) }), account.source === 'imported' && (_jsx("button", { type: "button", disabled: busy, style: dangerButton, onClick: () => void run(() => api.remove(account.address), { kind: 'list' }), children: "Remove account" })), _jsx("button", { type: "button", style: ghostButton, onClick: () => { setError(''); setScreen({ kind: 'list' }); }, children: "Back" }), error && _jsx("p", { style: errorStyle, children: error })] }));
    }
    return (_jsxs("div", { id: "VAULT_ACCOUNTS", style: vaultAccountsStyle.listBox, children: [_jsxs("div", { style: vaultAccountsStyle.scroll, children: [accounts.map((a) => (_jsxs("div", { style: vaultAccountsStyle.accountRow, children: [_jsx("button", { type: "button", "aria-label": `Use ${a.name}`, style: vaultAccountsStyle.rowButton(same(a.address, active)), onClick: () => void run(async () => { await api.setActive(a.address); onActiveChanged?.(a.address); }), children: _jsxs("span", { style: vaultAccountsStyle.rowBody, children: [_jsxs("span", { style: vaultAccountsStyle.rowName, children: [a.name, same(a.address, active) ? ' (active)' : ''] }), _jsxs("span", { style: vaultAccountsStyle.rowAddress, children: [short(a.address), a.devOrigin ? ' · test key' : ''] })] }) }), _jsx("button", { type: "button", "aria-label": `Details for ${a.name}`, style: vaultAccountsStyle.ghostAuto, onClick: () => { setRenameValue(a.name); setError(''); setScreen({ kind: 'detail', address: a.address }); }, children: "\u22EF" })] }, a.address))), accounts.length === 0 && _jsx("p", { style: muted, children: "No accounts yet." })] }), error && _jsx("p", { style: errorStyle, children: error }), _jsx(AddWalletAccountButton, { label: "Add an Account", onClick: () => { setError(''); setScreen({ kind: 'add' }); } }), _jsx("button", { type: "button", style: ghostButton, onClick: () => setScreen({ kind: 'phrase' }), children: "Secret Recovery Phrase" })] }));
}
