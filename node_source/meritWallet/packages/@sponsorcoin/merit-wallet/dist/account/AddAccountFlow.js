// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AddAccountFlow.tsx
//
// 2026-10-10 (docs/design/accountAuthDesign.txt section 17 item 2) -- the "Add a Wallet/Account" flow, written once in the package: the menu (spcoin-panels' AddWalletMenu, the same entries, order and wording the web app shows), and the screens behind
// the entries a host can offer. A host passes an AddAccountHost: what each entry does for ITS approver (the extension: create = derive the next vault account, import = a private key into the vault) and, for every entry it cannot offer,
// the reason (shown disabled, docs/design/accountAuthDesign.txt section 17.2.7). Whatever is added is made the active account by the host's callback, never by this component (docs/design/accountAuthDesign.txt section 17.2.6: the app does not choose the active account).
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { privateKeyToAddress } from 'viem/accounts';
import { usePanelTree } from '@sponsorcoin/spcoin-exchange-engine';
import { AddWalletMenu, ConnectMetaMaskLeaf, HardwareDeviceMenu, ImportAccountForm, ImportWalletForm, WalletListPanel, useAddWalletFlow } from '@sponsorcoin/spcoin-panels';
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import { firstAddressOfMnemonic, isValidMnemonic, normalizeMnemonic } from '../vault/walletAccounts';
import { addEntryReasons, readAddTargets } from '../wallet/addTarget';
import { WalletSelectDropDown, WALLET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';
/** What a disabled connect row says when the host gave no reason of its own. */
export const DEFAULT_CONNECT_UNAVAILABLE = {
    connectMetaMask: 'Available in the web app',
    connectMeritExtension: 'Available in the web app',
    connectHardware: 'Available in the web app',
};
const primaryStyle = { borderRadius: 8, border: 'none', padding: '9px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#5981F3', color: '#ffffff' };
/** The connect screen says it is still waiting after this long (the wallet is probably locked); the host owns the hard limit. */
export const CONNECT_SOFT_WAIT_MS = 60000;
const EMPTY_PROFILE = { name: '', symbol: '', description: '', logo: null };
const fieldStyle = { background: '#0E111B', color: '#fff', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px', fontSize: 12, width: '100%', boxSizing: 'border-box' };
const KEY_FORMAT = /^0x[0-9a-fA-F]{64}$/;
/** The wallets the wallet list offers (WALLET_LIST_SELECT_PANEL), by asset folder, and the authenticator each one is. */
const WALLET_SLUG_ID = { merit: 'serverKeystore', meritExtension: 'injected:org.sponsorcoin.merit', metamask: 'injected:io.metamask', ledger: 'hardware:ledger', trezor: 'hardware:trezor' };
/** The list row of the wallet THIS host is: always connected, nothing to connect or disconnect from it. */
const nativeSlugOf = (nativeWalletId) => (nativeWalletId === 'serverKeystore' ? 'merit' : nativeWalletId === 'localVault' ? 'meritExtension' : undefined);
export default function AddAccountFlow({ host, onDone, wallet, activeAddress, nativeWalletId, walletConnection, onDisconnectWallet }) {
    const [key, setKey] = useState('');
    const [phrase, setPhrase] = useState('');
    const [phraseValid, setPhraseValid] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(EMPTY_PROFILE);
    const [logoUrl, setLogoUrl] = useState('');
    useEffect(() => {
        if (!profile.logo) {
            setLogoUrl('');
            return undefined;
        }
        const url = URL.createObjectURL(profile.logo);
        setLogoUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [profile.logo]);
    const resetForm = () => { setKey(''); setPhrase(''); setPhraseValid(false); setBusy(false); setError(''); setProfile(EMPTY_PROFILE); };
    const flow = useAddWalletFlow({ resetState: resetForm, resetOnMount: false });
    const menuVisible = flow.addWalletVisible && !flow.isLeafVisible;
    const { openPanel, closePanel } = usePanelTree();
    // the connect screens (MetaMask, the Merit extension): opened from the wallet list, they start the connect once, say when it is slow, and on success pop ONLY themselves, back to the wallet list
    const connectEntry = flow.connectMetaMaskVisible ? 'connectMetaMask' : flow.connectMeritExtensionVisible ? 'connectMeritExtension' : undefined;
    const connectLeaf = connectEntry === 'connectMetaMask' ? SP.CONNECT_ACCOUNT : SP.CONNECT_MERIT_EXTENSION;
    const [connecting, setConnecting] = useState(false);
    const [waitingLong, setWaitingLong] = useState(false);
    const connectRunning = useRef(false);
    /** Ends the wait that is running (Cancel); null when none runs. */
    const connectStop = useRef(null);
    const attemptConnect = (entry, leaf) => {
        if (connectRunning.current || !host.connectApprover)
            return;
        connectRunning.current = true;
        setConnecting(true);
        setWaitingLong(false);
        setError('');
        void (async () => {
            const soft = setTimeout(() => setWaitingLong(true), CONNECT_SOFT_WAIT_MS);
            let connected = false;
            try {
                const stopped = new Promise((resolve) => { connectStop.current = () => resolve('stopped'); });
                const outcome = await Promise.race([host.connectApprover(entry).then(() => 'connected'), stopped]);
                connected = outcome === 'connected';
            }
            catch (e) {
                setError(e instanceof Error ? e.message : 'The wallet could not be connected.');
            }
            clearTimeout(soft);
            connectStop.current = null;
            connectRunning.current = false;
            setWaitingLong(false);
            setConnecting(false);
            if (connected) {
                // the effect below shows the wallet list again once the screen is gone
                closePanel(leaf, 'AddAccountFlow:connected');
            }
        })();
    };
    const startedEntry = useRef(undefined);
    /** The connect screen was opened from the wallet list: wherever it closes (Cancel, Back, connected), the list is what shows next. The stack's own restore does not always bring it back. */
    const returnToList = useRef(false);
    useEffect(() => {
        if (!connectEntry) {
            startedEntry.current = undefined;
            if (returnToList.current) {
                returnToList.current = false;
                openPanel(SP.WALLET_LIST_SELECT_PANEL, 'AddAccountFlow:connectClosed:backToWalletList');
            }
            return;
        }
        if (startedEntry.current === connectEntry)
            return;
        startedEntry.current = connectEntry;
        attemptConnect(connectEntry, connectLeaf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectEntry]);
    // docs/design/accountAuthDesign.txt section 18 section 5: the wallet this screen adds to: the active wallet by default; the person may point it at another wallet that keeps keys (this visit only)
    // a host that builds its `targets` array on every render must not restart the read each time: the list is keyed by its content
    const hostTargets = host.targets?.join(',');
    const [targets, setTargets] = useState([]);
    const [defaultTarget, setDefaultTarget] = useState(undefined);
    const [pickedTarget, setPickedTarget] = useState(undefined);
    const [targetPickerOpen, setTargetPickerOpen] = useState(false);
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
            // the host's own wallet is where an account is added by default (the active account may belong to another wallet)
            const own = nativeWalletId && allowed.some((t) => t.id === nativeWalletId) ? nativeWalletId : undefined;
            setDefaultTarget(own ?? (read.defaultId && allowed.some((t) => t.id === read.defaultId) ? read.defaultId : allowed[0]?.id));
        });
        return () => { cancelled = true; };
    }, [wallet, activeAddress, hostTargets, nativeWalletId]);
    const target = targets.find((t) => t.id === (pickedTarget ?? defaultTarget));
    // Import a wallet: the phrase typed, whether it is a real BIP-39 phrase, and the first account it would give (checked here, nothing is imported yet)
    useEffect(() => {
        let alive = true;
        const words = normalizeMnemonic(phrase).split(' ').filter(Boolean);
        if (words.length < 12) {
            setPhraseValid(false);
            return undefined;
        }
        void isValidMnemonic(phrase).then((ok) => {
            if (alive)
                setPhraseValid(ok);
        });
        return () => {
            alive = false;
        };
    }, [phrase]);
    const phraseWords = normalizeMnemonic(phrase).split(' ').filter(Boolean).length;
    const phraseInvalid = phraseWords >= 12 && !phraseValid;
    const phrasePreview = phraseValid ? firstAddressOfMnemonic(phrase) : '';
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
    const run = async (action) => {
        setBusy(true);
        setError('');
        try {
            await action();
            flow.clearAddWalletFlow('AddAccountFlow:complete');
            onDone();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'The account could not be added.');
        }
        finally {
            setBusy(false);
        }
    };
    const featureReasons = { ...addEntryReasons(target) };
    if (target && hostTargets?.split(',').includes(target.id))
        for (const entry of host.performs ?? [])
            delete featureReasons[entry];
    const unavailable = { ...featureReasons, ...(host.unavailable ?? {}) };
    if (!host.importWallet)
        unavailable.importWallet ?? (unavailable.importWallet = 'Importing a wallet is not available here.');
    if (!host.connectApprover) {
        for (const entry of Object.keys(DEFAULT_CONNECT_UNAVAILABLE)) {
            if (entry === 'connectHardware' && host.hardwareDevices?.length && host.connectHardwareDevice)
                continue;
            unavailable[entry] ?? (unavailable[entry] = DEFAULT_CONNECT_UNAVAILABLE[entry]);
        }
    }
    // a connect entry: ask the approver, then the flow is done (the account is the active one now)
    const connect = (entry) => () => {
        if (unavailable[entry] || !host.connectApprover)
            return;
        void run(() => host.connectApprover(entry));
    };
    const open = (entry, panel) => () => {
        if (unavailable[entry])
            return;
        setError('');
        flow.goToLeaf(panel);
    };
    // The wallet list (WALLET_LIST_SELECT_PANEL, opened from the wallet pill): one row per wallet with Connect / Disconnect, written once here for every host. The web app's Merit wallet row is not offered by a host that is not the web app.
    const nativeSlug = nativeSlugOf(nativeWalletId);
    const walletSlugs = Object.keys(WALLET_SLUG_ID).filter((slug) => !(slug === 'merit' && nativeWalletId && nativeWalletId !== 'serverKeystore'));
    const connection = {};
    for (const slug of walletSlugs)
        connection[slug] = slug === nativeSlug ? true : !!walletConnection?.[slug];
    const toggleWallet = (slug) => {
        if (slug === nativeSlug)
            return;
        if (connection[slug]) {
            onDisconnectWallet?.(slug);
            return;
        }
        // in the click itself (a browser lets an extension open its side panel only in answer to one), then the connect screen pushed above the wallet list
        if (slug === 'metamask' && !unavailable.connectMetaMask && host.connectApprover) {
            returnToList.current = true;
            openPanel(SP.CONNECT_ACCOUNT, 'AddAccountFlow:walletList:connectMetaMask');
        }
        else if (slug === 'meritExtension' && !unavailable.connectMeritExtension && host.connectApprover) {
            host.bringWalletForward?.('connectMeritExtension');
            returnToList.current = true;
            openPanel(SP.CONNECT_MERIT_EXTENSION, 'AddAccountFlow:walletList:connectMeritExtension');
        }
        else if (slug === 'ledger' || slug === 'trezor') {
            if (host.connectHardwareDevice)
                void run(() => host.connectHardwareDevice(`hardware:${slug}`));
            else
                connect('connectHardware')();
        }
    };
    const openHardware = () => {
        if (host.hardwareDevices?.length && host.connectHardwareDevice)
            open('connectHardware', SP.CONNECT_HARDWARE_WALLET)();
        else
            connect('connectHardware')();
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 10, padding: 12, color: '#fff' }, children: [menuVisible && target && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }, children: [_jsx("span", { children: "Adding to" }), targets.length > 1 ? (_jsxs("div", { style: { marginLeft: 'auto', position: 'relative' }, children: [_jsx(WalletSelectDropDown, { walletId: target.id, displayName: target.name, showDisplay: WALLET_SELECT_DISPLAY.ICON | WALLET_SELECT_DISPLAY.ADDRESS | (targetPickerOpen ? WALLET_SELECT_DISPLAY.CHEVRON_UP : WALLET_SELECT_DISPLAY.CHEVRON_DN), restrictRowClickToChevron: true, onSelectClick: () => setTargetPickerOpen((open) => !open), label: "Change wallet", collapseKey: target.id }), targetPickerOpen && (_jsx("div", { role: "listbox", "aria-label": "Wallets that can add accounts", style: { position: 'absolute', zIndex: 20, right: 0, top: '100%', minWidth: 220, padding: 4, border: '1px solid #334155', borderRadius: 8, background: '#0E111B' }, children: targets.map((option) => (_jsx("button", { type: "button", role: "option", "aria-selected": option.id === target.id, onClick: () => { setPickedTarget(option.id); setTargetPickerOpen(false); }, style: { display: 'block', width: '100%', padding: '7px 9px', border: 0, borderRadius: 5, background: option.id === target.id ? '#243056' : 'transparent', color: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: 12 }, children: option.name }, option.id))) }))] })) : _jsx("strong", { style: { color: '#fff' }, children: target.name })] })), menuVisible && (_jsx(AddWalletMenu, { onImportWallet: open('importWallet', SP.IMPORT_A_WALLET), onImportAccount: open('importAccount', SP.IMPORT_AN_ACCOUNT), onCreateAccount: open('createAccount', SP.CREATE_ACCOUNT), onConnectMetaMask: connect('connectMetaMask'), onConnectMeritExtension: host.connectApprover ? connect('connectMeritExtension') : undefined, onConnectHardware: openHardware, 
                // like the web app: connecting MetaMask, the Merit extension and a hardware wallet is done from the wallet list (the pill's chevron), not from this menu
                hide: { connectMetaMask: true, connectMeritExtension: true, connectHardware: true }, unavailable: unavailable, error: error })), flow.walletListVisible && (_jsx(WalletListPanel, { onSelect: () => undefined, wallets: walletSlugs, connection: connection, onToggleConnection: toggleWallet })), connectEntry && (_jsx(ConnectMetaMaskLeaf, { walletName: connectEntry === 'connectMetaMask' ? 'MetaMask' : 'Merit Extension', isConnecting: connecting, message: error, onRetry: () => attemptConnect(connectEntry, connectLeaf), waitingLong: waitingLong, onBringForward: host.bringWalletForward ? () => host.bringWalletForward(connectEntry) : undefined, onCancel: () => {
                    host.cancelConnect?.(connectEntry);
                    connectStop.current?.();
                    closePanel(connectLeaf, 'AddAccountFlow:connectCancelled');
                } })), flow.importAccountVisible && (_jsx(ImportAccountForm, { value: key, onChange: setKey, formatInvalid: formatInvalid, previewAddress: previewAddress, error: error, isImporting: busy, onImport: () => void run(() => host.importAccount(trimmed, target?.id)) })), flow.importWalletVisible && (_jsx(ImportWalletForm, { value: phrase, onChange: setPhrase, invalid: phraseInvalid, previewAddress: phrasePreview, error: error, isImporting: busy, onImport: () => void run(() => host.importWallet(normalizeMnemonic(phrase), target?.id)) })), flow.connectHardhatVisible && host.hardwareDevices && host.connectHardwareDevice && (_jsx(HardwareDeviceMenu, { devices: host.hardwareDevices, busy: busy, error: error, onChoose: (id) => void run(() => host.connectHardwareDevice(id)) })), flow.createAccountVisible && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 4px' }, children: [_jsx("p", { style: { margin: 0, fontSize: 12, color: '#cbd5e1' }, children: "Create a new account: a new address and private key, kept under this wallet." }), host.createProfile && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 8 }, children: [logoUrl ? _jsx("img", { src: logoUrl, alt: "Account avatar preview", style: { width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', alignSelf: 'center' } }) : null, _jsxs("label", { style: { ...primaryStyle, textAlign: 'center', alignSelf: 'center' }, children: ["Select Preview Image", _jsx("input", { type: "file", accept: "image/*", "aria-label": "Account avatar", style: { display: 'none' }, onChange: (event) => setProfile((p) => ({ ...p, logo: event.target.files?.[0] ?? null })) })] }), _jsx("input", { "aria-label": "Account name", placeholder: "Name", value: profile.name, onChange: (event) => setProfile((p) => ({ ...p, name: event.target.value })), style: fieldStyle }), _jsx("input", { "aria-label": "Account symbol", placeholder: "Symbol", value: profile.symbol, onChange: (event) => setProfile((p) => ({ ...p, symbol: event.target.value })), style: fieldStyle }), _jsx("textarea", { "aria-label": "Account description", placeholder: "Description", rows: 3, value: profile.description, onChange: (event) => setProfile((p) => ({ ...p, description: event.target.value })), style: { ...fieldStyle, resize: 'vertical' } })] })), error && _jsx("p", { style: { margin: 0, fontSize: 12, color: '#fca5a5' }, children: error }), _jsx("button", { type: "button", disabled: busy, onClick: () => void run(() => host.createAccount(target?.id, host.createProfile ? profile : undefined)), style: { ...primaryStyle, opacity: busy ? 0.5 : 1 }, children: busy ? 'Creating…' : 'Create Account' })] }))] }));
}
