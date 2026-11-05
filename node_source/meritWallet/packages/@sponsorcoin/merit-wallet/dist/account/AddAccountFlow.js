// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AddAccountFlow.tsx
//
// 2026-10-10 (docs/design/accountAuthDesign.txt section 17 item 2) -- the "Add a Wallet/Account" flow, written once in the package: the menu (spcoin-panels' AddWalletMenu, the same entries, order and wording the web app shows), and the screens behind
// the entries a host can offer. A host passes an AddAccountHost: what each entry does for ITS approver (the extension: create = derive the next vault account, import = a private key into the vault) and, for every entry it cannot offer,
// the reason (shown disabled, docs/design/accountAuthDesign.txt section 17.2.7). Whatever is added is made the active account by the host's callback, never by this component (docs/design/accountAuthDesign.txt section 17.2.6: the app does not choose the active account).
'use client';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { addAccountStyle } from '@sponsorcoin/spcoin-common/styles';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { privateKeyToAddress } from 'viem/accounts';
import { usePanelTree } from '@sponsorcoin/spcoin-exchange-engine';
import { AddWalletMenu, ConnectMetaMaskLeaf, HardwareDeviceMenu, ImportAccountForm, ImportWalletForm, WalletListPanel, useAddWalletFlow } from '@sponsorcoin/spcoin-panels';
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import { firstAddressOfMnemonic, isValidMnemonic, normalizeMnemonic } from '../vault/walletAccounts';
import { WALLET_SLUG_ID } from '../wallet/walletSlugs';
import { approvalWaiting } from '../auth/approvalWaiting';
import { addEntryReasons, readAddTargets } from '../wallet/addTarget';
import { WalletSelectDropDown, WALLET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';
/** What a disabled connect row says when the host gave no reason of its own. */
export const DEFAULT_CONNECT_UNAVAILABLE = {
    connectMetaMask: 'Available in the web app',
    connectMeritExtension: 'Available in the web app',
    connectMeritWeb: 'Available in the extension',
    connectHardware: 'Available in the web app',
};
/** The connect screen says it is still waiting after this long (the wallet is probably locked); the host owns the hard limit. */
export const CONNECT_SOFT_WAIT_MS = 60000;
const EMPTY_PROFILE = { name: '', symbol: '', description: '', logo: null };
const KEY_FORMAT = /^0x[0-9a-fA-F]{64}$/;
/** The wallets the wallet list offers (WALLET_LIST_SELECT_PANEL), by asset folder, and the authenticator each one is. */
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
    const { closePanel } = usePanelTree();
    // the connect screens (MetaMask, the Merit extension): opened from the wallet list, they start the connect once, say when it is slow, and on success pop ONLY themselves, back to the wallet list
    const connectEntry = flow.connectMetaMaskVisible ? 'connectMetaMask' : flow.connectMeritExtensionVisible ? 'connectMeritExtension' : undefined;
    const connectLeaf = connectEntry === 'connectMetaMask' ? SP.CONNECT_ACCOUNT : SP.CONNECT_MERIT_EXTENSION;
    const [connecting, setConnecting] = useState(false);
    const [waitingLong, setWaitingLong] = useState(false);
    const connectRunning = useRef(false);
    // 2026-11-01 (owner: "it should not say Connecting to Merit (Extension) as we are finished with that"): the wallet-level connect is done when the other wallet has the request on its own screen (approvalWaiting.markPresented). This screen
    // then leaves, back to the wallet list; the open request goes on in the background (the person picks the accounts in the other wallet) and its end is reported by the approval notice.
    const waitingRequests = useSyncExternalStore(approvalWaiting.subscribe, approvalWaiting.getState, approvalWaiting.getState);
    const dismissedEarly = useRef(false);
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
            const leftEarly = dismissedEarly.current;
            dismissedEarly.current = false;
            if (connected && !leftEarly) {
                // the effect below shows the wallet list again once the screen is gone
                closePanel(leaf, 'AddAccountFlow:connected');
            }
        })();
    };
    const presentedId = connectEntry === 'connectMeritExtension' ? 'injected:org.sponsorcoin.merit' : undefined;
    const requestPresented = !!presentedId && connecting && waitingRequests.some((e) => e.action === 'connect' && e.silent && e.authenticatorId === presentedId);
    useEffect(() => {
        if (!requestPresented || dismissedEarly.current)
            return;
        dismissedEarly.current = true;
        closePanel(connectLeaf, 'AddAccountFlow:presented');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestPresented]);
    const startedEntry = useRef(undefined);
    useEffect(() => {
        if (!connectEntry) {
            // the screen is gone while its connect still waits (the back arrow): end it here and in the other wallet, unless the other wallet already has it on its own screen (dismissedEarly: it goes on in the background)
            if (connectRunning.current && !dismissedEarly.current && startedEntry.current) {
                host.cancelConnect?.(startedEntry.current);
                connectStop.current?.();
            }
            startedEntry.current = undefined;
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
    // 2026-10-31 (owner question): every wallet is listed in every host, Merit (Web App) in the extension too (it used to be hidden there, which made the two lists differ)
    const walletSlugs = Object.keys(WALLET_SLUG_ID);
    const connection = {};
    for (const slug of walletSlugs)
        connection[slug] = slug === nativeSlug ? true : !!walletConnection?.[slug];
    // 2026-11-01 (owner: "it takes a long time, it should throb while disconnecting"): a disconnect under way is marked on its row until it ends (or 10 s, whichever is first)
    const [disconnecting, setDisconnecting] = useState({});
    const toggleWallet = (slug) => {
        if (slug === nativeSlug)
            return;
        if (connection[slug]) {
            setDisconnecting((d) => ({ ...d, [slug]: true }));
            const done = () => setDisconnecting((d) => ({ ...d, [slug]: false }));
            const timer = setTimeout(done, 10000);
            void Promise.resolve(onDisconnectWallet?.(slug)).catch(() => undefined).finally(() => { clearTimeout(timer); done(); });
            return;
        }
        // 2026-11-04 (owner request): the panel is not changed at all while MetaMask decides: its row throbs "Waiting…" and turns Connected, like the Merit extension's. The connect call is made in the click itself (a browser lets a page open a wallet's window only in answer to one).
        if (slug === 'metamask' && !unavailable.connectMetaMask && host.connectApprover) {
            setError('');
            setDisconnecting((d) => ({ ...d, [slug]: 'connecting' }));
            void Promise.resolve(host.connectWallet ? host.connectWallet(slug) : host.connectApprover('connectMetaMask'))
                .catch((e) => setError(e instanceof Error ? e.message : 'The wallet could not be connected.'))
                .finally(() => setDisconnecting((d) => ({ ...d, [slug]: false })));
        }
        else if (slug === 'meritExtension' && !unavailable.connectMeritExtension && host.connectApprover) {
            // 2026-11-03 (owner request): stay on the wallet list while the extension decides; its row throbs "Waiting…" until the request ends. The refusal, if any, is the approval notice's.
            host.bringWalletForward?.('connectMeritExtension');
            setError('');
            setDisconnecting((d) => ({ ...d, [slug]: 'connecting' }));
            void Promise.resolve(host.connectApprover('connectMeritExtension'))
                .catch((e) => setError(e instanceof Error ? e.message : 'The wallet could not be connected.'))
                .finally(() => setDisconnecting((d) => ({ ...d, [slug]: false })));
        }
        else if (slug === 'merit' && !unavailable.connectMeritWeb && host.connectApprover) {
            // 2026-11-04 (owner request: any Merit wallet attaches to any other, through the server, Local or Prod): the host makes the link and brings the other wallet's app forward; the row is Connected when that wallet answers logged on
            setError('');
            setDisconnecting((d) => ({ ...d, [slug]: 'connecting' }));
            void Promise.resolve(host.connectApprover('connectMeritWeb'))
                .catch((e) => setError(e instanceof Error ? e.message : 'The wallet could not be connected.'))
                .finally(() => setDisconnecting((d) => ({ ...d, [slug]: false })));
        }
        else if (slug === 'merit') {
            setError('Merit (Web App) cannot be connected from here.');
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
    return (_jsxs("div", { style: addAccountStyle.screen, children: [menuVisible && target && targets.length > 1 && (_jsxs("div", { style: addAccountStyle.targetLine, children: [_jsx("span", { children: "Adding to" }), targets.length > 1 ? (_jsxs("div", { style: addAccountStyle.targetPickerAnchor, children: [_jsx(WalletSelectDropDown, { walletId: target.id, displayName: target.name, showDisplay: WALLET_SELECT_DISPLAY.ICON | WALLET_SELECT_DISPLAY.ADDRESS | WALLET_SELECT_DISPLAY.COPY | (targetPickerOpen ? WALLET_SELECT_DISPLAY.CHEVRON_UP : WALLET_SELECT_DISPLAY.CHEVRON_DN), restrictRowClickToChevron: true, onSelectClick: () => setTargetPickerOpen((open) => !open), label: "Change wallet", collapseKey: target.id }), targetPickerOpen && (_jsx("div", { role: "listbox", "aria-label": "Wallets that can add accounts", style: addAccountStyle.targetPickerList, children: targets.map((option) => (_jsx("button", { type: "button", role: "option", "aria-selected": option.id === target.id, onClick: () => { setPickedTarget(option.id); setTargetPickerOpen(false); }, style: addAccountStyle.targetOption(option.id === target.id), children: option.name }, option.id))) }))] })) : _jsx("strong", { style: addAccountStyle.targetName, children: target.name })] })), menuVisible && (_jsx("div", { style: addAccountStyle.listBleed, children: _jsx(AddWalletMenu, { onImportWallet: open('importWallet', SP.IMPORT_A_WALLET), onImportAccount: open('importAccount', SP.IMPORT_AN_ACCOUNT), onCreateAccount: open('createAccount', SP.CREATE_ACCOUNT), onConnectMetaMask: connect('connectMetaMask'), onConnectMeritExtension: host.connectApprover ? connect('connectMeritExtension') : undefined, onConnectHardware: openHardware, 
                    // like the web app: connecting MetaMask, the Merit extension and a hardware wallet is done from the wallet list (the pill's chevron), not from this menu
                    hide: { connectMetaMask: true, connectMeritExtension: true, connectHardware: true }, unavailable: unavailable, error: error }) })), flow.walletListVisible && (_jsxs("div", { style: addAccountStyle.listBleed, children: [_jsx(WalletListPanel, { onSelect: () => undefined, wallets: walletSlugs, connection: connection, fixed: nativeSlug, busy: disconnecting, onToggleConnection: toggleWallet }), error && _jsx("p", { style: addAccountStyle.error, children: error })] })), connectEntry && (_jsx(ConnectMetaMaskLeaf, { walletName: connectEntry === 'connectMetaMask' ? 'MetaMask' : 'Merit (Extension)', isConnecting: connecting, message: error, onRetry: () => attemptConnect(connectEntry, connectLeaf), waitingLong: waitingLong, onBringForward: host.bringWalletForward ? () => host.bringWalletForward(connectEntry) : undefined, onCancel: () => {
                    host.cancelConnect?.(connectEntry);
                    connectStop.current?.();
                    closePanel(connectLeaf, 'AddAccountFlow:connectCancelled');
                } })), flow.importAccountVisible && (_jsx(ImportAccountForm, { value: key, onChange: setKey, formatInvalid: formatInvalid, previewAddress: previewAddress, error: error, isImporting: busy, onImport: () => void run(() => host.importAccount(trimmed, target?.id)) })), flow.importWalletVisible && (_jsx(ImportWalletForm, { value: phrase, onChange: setPhrase, invalid: phraseInvalid, previewAddress: phrasePreview, error: error, isImporting: busy, onImport: () => void run(() => host.importWallet(normalizeMnemonic(phrase), target?.id)) })), flow.connectHardhatVisible && host.hardwareDevices && host.connectHardwareDevice && (_jsx(HardwareDeviceMenu, { devices: host.hardwareDevices, busy: busy, error: error, onChoose: (id) => void run(() => host.connectHardwareDevice(id)) })), flow.createAccountVisible && (_jsxs("div", { style: addAccountStyle.createBox, children: [_jsx("p", { style: addAccountStyle.hint, children: "Create a new account: a new address and private key, kept under this wallet." }), host.createProfile && (_jsxs("div", { style: addAccountStyle.profileBox, children: [logoUrl ? _jsx("img", { src: logoUrl, alt: "Account avatar preview", style: addAccountStyle.avatarPreview }) : null, _jsxs("label", { style: addAccountStyle.pickImageLabel, children: ["Select Preview Image", _jsx("input", { type: "file", accept: "image/*", "aria-label": "Account avatar", style: addAccountStyle.hiddenInput, onChange: (event) => setProfile((p) => ({ ...p, logo: event.target.files?.[0] ?? null })) })] }), _jsx("input", { "aria-label": "Account name", placeholder: "Name", value: profile.name, onChange: (event) => setProfile((p) => ({ ...p, name: event.target.value })), style: addAccountStyle.field }), _jsx("input", { "aria-label": "Account symbol", placeholder: "Symbol", value: profile.symbol, onChange: (event) => setProfile((p) => ({ ...p, symbol: event.target.value })), style: addAccountStyle.field }), _jsx("textarea", { "aria-label": "Account description", placeholder: "Description", rows: 3, value: profile.description, onChange: (event) => setProfile((p) => ({ ...p, description: event.target.value })), style: addAccountStyle.fieldTall })] })), error && _jsx("p", { style: addAccountStyle.error, children: error }), _jsx("button", { type: "button", disabled: busy, onClick: () => void run(() => host.createAccount(target?.id, host.createProfile ? profile : undefined)), style: addAccountStyle.primaryDim(busy), children: busy ? 'Creating…' : 'Create Account' })] }))] }));
}
