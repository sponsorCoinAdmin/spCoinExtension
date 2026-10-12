// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AddAccountFlow.tsx
//
// 2026-10-10 (docs/connectionDesign.txt item 2) -- the "Add a Wallet/Account" flow, written once in the package: the menu (spcoin-panels' AddWalletMenu, the same entries, order and wording the web app shows), and the screens behind
// the entries a host can offer. A host passes an AddAccountHost: what each entry does for ITS approver (the extension: create = derive the next vault account, import = a private key into the vault) and, for every entry it cannot offer,
// the reason (shown disabled, connectionDesign 2.7). Whatever is added is made the active account by the host's callback, never by this component (connectionDesign 2.6: the app does not choose the active account).
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { privateKeyToAddress } from 'viem/accounts';
import { AddWalletMenu, ImportAccountForm } from '@sponsorcoin/spcoin-panels';
import { addEntryReasons, readAddTargets } from '../wallet/addTarget';
/** What a disabled connect row says when the host gave no reason of its own. */
export const DEFAULT_CONNECT_UNAVAILABLE = {
    connectMetaMask: 'Available in the web app',
    connectMeritExtension: 'Available in the web app',
    connectHardware: 'Using USB or a QR Code — Coming Soon',
};
const buttonStyle = { flex: 1, borderRadius: 8, border: 'none', padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#243056', color: '#ffffff' };
const primaryStyle = { ...buttonStyle, background: '#5981F3' };
const KEY_FORMAT = /^0x[0-9a-fA-F]{64}$/;
export default function AddAccountFlow({ host, onDone, wallet, activeAddress }) {
    const [screen, setScreen] = useState('menu');
    // docs/createWalletAccountDesign.txt section 5: the wallet this screen adds to: the active wallet by default; the person may point it at another wallet that keeps keys (this visit only)
    // a host that builds its `targets` array on every render must not restart the read each time: the list is keyed by its content
    const hostTargets = host.targets?.join(',');
    const [targets, setTargets] = useState([]);
    const [defaultTarget, setDefaultTarget] = useState(undefined);
    const [pickedTarget, setPickedTarget] = useState(undefined);
    useEffect(() => {
        if (!wallet)
            return undefined;
        let cancelled = false;
        void readAddTargets(wallet, activeAddress, hostTargets === undefined ? undefined : hostTargets.split(',')).catch((error) => {
            // never silent: without targets the screen still works, it just does not say which wallet it adds to
            console.error('The wallets this screen can add to could not be read:', error);
            return { targets: [], defaultId: undefined };
        }).then((read) => {
            if (cancelled)
                return;
            const allowed = hostTargets !== undefined ? read.targets.filter((t) => hostTargets.split(',').includes(t.id)) : read.targets;
            setTargets(allowed);
            setDefaultTarget(read.defaultId && allowed.some((t) => t.id === read.defaultId) ? read.defaultId : allowed[0]?.id);
        });
        return () => { cancelled = true; };
    }, [wallet, activeAddress, hostTargets]);
    const target = targets.find((t) => t.id === (pickedTarget ?? defaultTarget));
    const [key, setKey] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const trimmed = key.trim();
    const formatInvalid = trimmed.length > 0 && !KEY_FORMAT.test(trimmed);
    let previewAddress = '';
    if (KEY_FORMAT.test(trimmed)) {
        try {
            previewAddress = privateKeyToAddress(trimmed);
        }
        catch {
            previewAddress = '';
        }
    }
    const back = () => {
        setError('');
        setKey('');
        if (screen === 'menu')
            onDone();
        else
            setScreen('menu');
    };
    const run = async (action) => {
        setBusy(true);
        setError('');
        try {
            await action();
            onDone();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'The account could not be added.');
        }
        finally {
            setBusy(false);
        }
    };
    const unavailable = { ...addEntryReasons(target), ...(host.unavailable ?? {}) };
    if (!host.connectApprover) {
        for (const entry of Object.keys(DEFAULT_CONNECT_UNAVAILABLE))
            unavailable[entry] ?? (unavailable[entry] = DEFAULT_CONNECT_UNAVAILABLE[entry]);
    }
    // a connect entry: ask the approver, then the flow is done (the account is the active one now)
    const connect = (entry) => () => {
        if (unavailable[entry] || !host.connectApprover)
            return;
        void run(() => host.connectApprover(entry));
    };
    const open = (entry, next) => () => {
        if (unavailable[entry])
            return;
        setError('');
        setScreen(next);
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10, padding: 12, color: '#fff' }, children: [_jsx("button", { type: "button", onClick: back, style: { ...buttonStyle, flex: 'none', alignSelf: 'flex-start', padding: '6px 12px' }, children: screen === 'menu' ? 'Back' : '← Back' }), screen === 'menu' && target && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }, children: [_jsxs("span", { children: ["Adding to ", _jsx("strong", { style: { color: '#fff' }, children: target.name })] }), targets.length > 1 ? (_jsx("select", { "aria-label": "Change the wallet to add to", value: target.id, onChange: (event) => setPickedTarget(event.target.value), style: { marginLeft: 'auto', background: '#0E111B', color: '#fff', border: '1px solid #334155', borderRadius: 6, padding: '2px 6px', fontSize: 11 }, children: targets.map((t) => (_jsx("option", { value: t.id, children: t.name }, t.id))) })) : null] })), screen === 'menu' && (_jsx(AddWalletMenu, { onImportWallet: () => undefined, onImportAccount: open('importAccount', 'importAccount'), onCreateAccount: open('createAccount', 'createAccount'), onConnectMetaMask: connect('connectMetaMask'), onConnectMeritExtension: host.connectApprover ? connect('connectMeritExtension') : undefined, onConnectHardware: connect('connectHardware'), unavailable: unavailable, error: error })), screen === 'importAccount' && (_jsx(ImportAccountForm, { value: key, onChange: setKey, formatInvalid: formatInvalid, previewAddress: previewAddress, error: error, isImporting: busy, onImport: () => void run(() => host.importAccount(trimmed, target?.id)) })), screen === 'createAccount' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 4px' }, children: [_jsx("p", { style: { margin: 0, fontSize: 12, color: '#cbd5e1' }, children: "Create a new account: a new address and private key, kept under this wallet." }), error && _jsx("p", { style: { margin: 0, fontSize: 12, color: '#fca5a5' }, children: error }), _jsx("button", { type: "button", disabled: busy, onClick: () => void run(() => host.createAccount(target?.id)), style: { ...primaryStyle, opacity: busy ? 0.5 : 1 }, children: busy ? 'Creating…' : 'Create Account' })] }))] }));
}
