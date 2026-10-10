// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/TestAccountsSection.tsx
//
// 2026-10-08 (docs/authenticationDesign.txt) -- the Config tab's "Test Accounts" section: Load puts Hardhat's standard test accounts into whatever store this
// wallet authenticates with (the server keystore for AuthenticationType.KEYSTORE, the vault for VAULT), Unload takes them out again. Wallet setup no
// longer adds them. Host-independent: the host supplies status / load / unload. When the store needs the password to add keys (the web keystore
// encrypts them under the master key), the section asks for it in a small popup first.
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from 'react';
import { WalletActionButton } from '@sponsorcoin/spcoin-panels';
import { authenticationTypeLabel } from './auth/authenticationType';
import PasswordPromptDialog from './PasswordPromptDialog';
export default function TestAccountsSection({ api, authenticationType, onChanged }) {
    const [status, setStatus] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [asking, setAsking] = useState(null);
    const where = authenticationTypeLabel(authenticationType);
    const refresh = useCallback(async () => {
        try {
            setStatus(await api.status());
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Could not read the test accounts.');
        }
    }, [api]);
    useEffect(() => {
        void refresh();
    }, [refresh]);
    const run = async (action, password) => {
        setBusy(true);
        setError('');
        setMessage('');
        try {
            if (action === 'load') {
                const r = await api.load(password);
                setMessage(r.added ? `Loaded ${r.added} test account${r.added === 1 ? '' : 's'} into the ${where}.` : `The test accounts are already in the ${where}.`);
            }
            else {
                const r = await api.unload(password);
                setMessage(r.removed ? `Removed ${r.removed} test account${r.removed === 1 ? '' : 's'} from the ${where}.${r.kept ? ` ${r.kept} could not be removed (part of the wallet's own phrase).` : ''}` : `No test accounts to remove.`);
            }
            await refresh();
            onChanged?.();
        }
        finally {
            setBusy(false);
        }
    };
    const start = (action) => {
        if (api.needsPassword)
            setAsking(action);
        else
            void run(action).catch((e) => setError(e instanceof Error ? e.message : 'That did not work.'));
    };
    const loaded = status?.loaded ?? 0;
    const total = status?.total ?? 0;
    return (_jsxs("div", { id: "TEST_ACCOUNTS_SECTION", style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [_jsxs("p", { style: { margin: 0, fontSize: 12, color: '#94a3b8' }, children: ["Hardhat's standard test accounts (their keys are public, so they can sign only on the local test chain). ", status ? `${loaded} of ${total} are in the ${where}.` : ''] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(WalletActionButton, { disabled: busy || (status !== null && loaded >= total), onClick: () => start('load'), children: "Load" }), _jsx(WalletActionButton, { disabled: busy || loaded === 0, onClick: () => start('unload'), children: "Unload" })] }), message && _jsx("p", { style: { margin: 0, fontSize: 12, color: '#4ade80' }, children: message }), error && _jsx("p", { style: { margin: 0, fontSize: 12, color: '#f87171' }, children: error }), asking && (_jsx(PasswordPromptDialog, { title: asking === 'load' ? 'Load test accounts' : 'Unload test accounts', message: asking === 'load' ? 'Enter your wallet password to add the Hardhat test accounts.' : 'Enter your wallet password to remove the Hardhat test accounts.', confirmLabel: asking === 'load' ? 'Load' : 'Unload', onConfirm: async (password) => {
                    await run(asking, password);
                    setAsking(null);
                }, onClose: () => setAsking(null) }))] }));
}
