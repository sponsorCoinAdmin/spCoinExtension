// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AccountPrivateKeyRow.tsx
//
// docs/meritMigration.txt row 14 -- the Private Key row of the account detail table, written once in the package (it was the web app's PrivateKeyRow). Click-to-reveal with a password step-up: the host's revealPrivateKey is tried
// first without a password (the host may hold an approved, cached one) and, when it answers PasswordRequiredError, the shared PasswordPromptDialog asks for the wallet password. The key is shown in a field that hides again on a click.
// The row itself never talks to a server: how a key is revealed (the web app's keystore route, the extension's vault) is the host's function.
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useState } from 'react';
import PasswordPromptDialog from '../PasswordPromptDialog';
import { useCopyFeedback } from '../platform/useCopyFeedback';
/** Thrown by a host's revealPrivateKey when it needs the wallet password (none given, or the cached one no longer works). */
export class PasswordRequiredError extends Error {
    constructor(message = 'The wallet password is required.') {
        super(message);
        this.name = 'PasswordRequiredError';
    }
}
export const isPasswordRequired = (error) => error instanceof PasswordRequiredError || error?.name === 'PasswordRequiredError';
export default function AccountPrivateKeyRow({ address, reveal, idPrefix = '', zebra, cell, }) {
    const [mode, setMode] = useState('masked');
    const [key, setKey] = useState('');
    const [trying, setTrying] = useState(false);
    const { copied, copy: copyText } = useCopyFeedback();
    const [error, setError] = useState('');
    const hide = useCallback(() => {
        setMode('masked');
        setKey('');
        setError('');
    }, []);
    const attempt = useCallback(async () => {
        setTrying(true);
        setError('');
        try {
            setKey(await reveal(address));
            setMode('revealed');
        }
        catch (e) {
            if (isPasswordRequired(e))
                setMode('confirming');
            else
                setError(e instanceof Error ? e.message : 'The key could not be revealed.');
        }
        finally {
            setTrying(false);
        }
    }, [address, reveal]);
    const copy = () => {
        if (key)
            copyText(key);
    };
    const inputClasses = 'w-full rounded bg-transparent font-mono text-xs text-amber-400 focus:outline-none focus:ring-0';
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "contents", children: [_jsx("div", { className: `${zebra} ${cell} whitespace-nowrap border-b border-black`, children: "Private Key" }), _jsx("div", { className: `${zebra} ${cell} min-w-0 border-b border-black`, children: mode === 'revealed' ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "flex w-full min-w-0 items-center justify-between gap-1", children: [_jsx("input", { id: `${idPrefix}privateKey`, type: "text", readOnly: true, value: key, title: "Click to hide", onClick: hide, className: `${inputClasses} cursor-pointer` }), _jsx("button", { type: "button", onClick: copy, title: "Copy private key", className: "shrink-0 text-xs text-slate-400 transition-colors hover:text-white", children: copied ? 'Copied' : 'Copy' })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "text-xs text-amber-400", children: "Keep this private." }), _jsx("button", { type: "button", onClick: hide, className: "text-xs text-[#8FA8FF] hover:text-white", children: "Hide" })] })] })) : trying ? (_jsx("span", { className: "w-full truncate text-left font-mono text-xs text-slate-400", children: "Loading\u2026" })) : (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => void attempt(), title: "Click to reveal \u2014 password required", className: "w-full truncate text-left font-mono text-xs text-slate-400 hover:text-white", children: "***...***" }), error && _jsx("p", { className: "text-xs text-red-400", children: error })] })) })] }), mode === 'confirming' ? (_jsx(PasswordPromptDialog, { title: "Keep your private key private", message: "Anyone with this key controls the account and everything in it. Enter your wallet password to reveal it.", confirmLabel: "Reveal", onConfirm: async (password) => {
                    setKey(await reveal(address, password));
                    setMode('revealed');
                }, onClose: hide })) : null] }));
}
