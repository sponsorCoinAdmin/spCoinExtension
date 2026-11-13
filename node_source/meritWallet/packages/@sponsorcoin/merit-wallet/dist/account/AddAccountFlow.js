// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AddAccountFlow.tsx
//
// 2026-10-10 (docs/design/accountAuthDesign.txt section 17 item 2) -- the "Add a Wallet/Account" flow, written once in the package: the menu (spcoin-panels' AddWalletMenu, the same entries, order and wording the web app shows), and the screens behind
// the entries a host can offer. A host passes an AddAccountHost: what each entry does for ITS approver (the extension: create = derive the next vault account, import = a private key into the vault) and, for every entry it cannot offer,
// the reason (shown disabled, docs/design/accountAuthDesign.txt section 17.2.7). Whatever is added is made the active account by the host's callback, never by this component (docs/design/accountAuthDesign.txt section 17.2.6: the app does not choose the active account).
'use client';
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { accountFormClass, addAccountStyle } from '@sponsorcoin/spcoin-common/styles';
import DetailScreenLayout from './DetailScreenLayout';
import AccountFormPanel from './form/AccountFormPanel';
import { useEffect, useRef, useState } from 'react';
import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts';
import { ImportWalletForm, PrivateKeyField, WalletListPanel, useAddWalletFlow, useWalletListed, walletListedStore } from '@sponsorcoin/spcoin-panels';
import { STATUS } from '@sponsorcoin/spcoin-common/context';
import { panelStore, useExchangeContext, usePanelTree, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { pendingApprovalMessageStore } from '../approval/pendingApprovalMessageStore';
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import { firstAddressOfMnemonic, isValidMnemonic, normalizeMnemonic } from '../vault/walletAccounts';
import { WALLET_SLUG_ID } from '../wallet/walletSlugs';
import { addEntryReasons, readAddTargets } from '../wallet/addTarget';
/** What a disabled connect row says when the host gave no reason of its own. */
export const DEFAULT_CONNECT_UNAVAILABLE = {
    connectMetaMask: 'Available in the web app',
    connectMeritExtension: 'Available in the web app',
    connectMeritWeb: 'Available in the extension',
    connectHardware: 'Available in the web app',
};
const EMPTY_PROFILE = { name: '', symbol: '', description: '', logo: null };
const KEY_FORMAT = /^0x[0-9a-fA-F]{64}$/;
/** The wallets the wallet list offers (WALLET_LIST_SELECT_PANEL), by asset folder, and the authenticator each one is. */
/** The list row of the wallet THIS host is: always connected, nothing to connect or disconnect from it. */
/** The wallet's name for the warning (the wallet list's own names). */
const WALLET_NAMES = { merit: 'Merit (Web App)', meritExtension: 'Merit (Ext)', metamask: 'MetaMask', ledger: 'Ledger', trezor: 'Trezor' };
const walletAssetName = (slug) => WALLET_NAMES[slug] ?? slug;
const nativeSlugOf = (nativeWalletId) => (nativeWalletId === 'serverKeystore' ? 'merit' : nativeWalletId === 'localVault' ? 'meritExtension' : undefined);
export default function AddAccountFlow({ host, onDone, wallet, activeAddress, nativeWalletId, walletConnection, onDisconnectWallet }) {
    const [key, setKey] = useState('');
    const [phrase, setPhrase] = useState('');
    const [phraseValid, setPhraseValid] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [profile, setProfile] = useState(EMPTY_PROFILE);
    const [logoUrl, setLogoUrl] = useState('');
    const logoFileInputRef = useRef(null);
    const descriptionRef = useRef(null);
    useEffect(() => {
        if (!profile.logo) {
            setLogoUrl('');
            return undefined;
        }
        const url = URL.createObjectURL(profile.logo);
        setLogoUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [profile.logo]);
    // 2026-11-12 (owner): Add New Account and Import an account are ONE screen (the Account Details table). `pendingKey` is the key waiting to be added (generated or imported); `keyEntryOpen` shows the box a key is pasted into.
    const [pendingKey, setPendingKey] = useState('');
    const [keyEntryOpen, setKeyEntryOpen] = useState(false);
    const resetForm = () => { setKey(''); setPhrase(''); setPhraseValid(false); setBusy(false); setError(''); setProfile(EMPTY_PROFILE); setPendingKey(''); setKeyEntryOpen(false); };
    const flow = useAddWalletFlow({ resetState: resetForm, resetOnMount: false });
    const menuVisible = flow.addWalletVisible && !flow.isLeafVisible;
    // 2026-11-12 (owner): the Add menu is gone (the Add Account(s) drop-down opens the screens directly). Back from a screen would land on the bare menu page: the flow closes instead (checked a moment later, as opening a screen is two steps)
    useEffect(() => {
        if (!menuVisible)
            return undefined;
        const timer = setTimeout(() => {
            if (panelStore.isVisible(SP.ADD_WALLET_ACCOUNT) && !panelStore.isVisible(SP.IMPORT_A_WALLET) && !panelStore.isVisible(SP.IMPORT_AN_ACCOUNT) && !panelStore.isVisible(SP.CREATE_ACCOUNT) && !panelStore.isVisible(SP.WALLET_LIST_SELECT_PANEL))
                flow.clearAddWalletFlow('AddAccountFlow:noMenu');
        }, 0);
        return () => clearTimeout(timer);
    }, [menuVisible]);
    const accountScreenVisible = flow.createAccountVisible || flow.importAccountVisible;
    // arriving through "Import an account" asks for the key at once
    useEffect(() => {
        if (flow.importAccountVisible)
            setKeyEntryOpen(true);
    }, [flow.importAccountVisible]);
    // 2026-11-12 (owner: "I should not have to add an account twice"): arriving through "Add Account" makes the new key at once (a host that previews its keys), so the screen shows the new account, ready to Update
    useEffect(() => {
        if (flow.createAccountVisible && host.previewsNewKey)
            setPendingKey((current) => current || generatePrivateKey());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flow.createAccountVisible]);
    // docs/design/accountAuthDesign.txt section 18 section 5: the wallet this screen adds to: the active wallet by default; the person may point it at another wallet that keeps keys (this visit only)
    // a host that builds its `targets` array on every render must not restart the read each time: the list is keyed by its content
    const hostTargets = host.targets?.join(',');
    const [targets, setTargets] = useState([]);
    const [defaultTarget, setDefaultTarget] = useState(undefined);
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
    const target = targets.find((t) => t.id === (defaultTarget));
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
    const addressOf = (privateKey) => {
        if (!KEY_FORMAT.test(privateKey))
            return '';
        try {
            return privateKeyToAddress(privateKey);
        }
        catch {
            return '';
        }
    };
    // a valid key typed into the box is taken at once: the box closes and the Address row shows what it derives
    useEffect(() => {
        if (!keyEntryOpen || !addressOf(trimmed))
            return;
        setPendingKey(trimmed);
        setKey('');
        setKeyEntryOpen(false);
        setError('');
    }, [keyEntryOpen, trimmed]);
    const pendingAddress = addressOf(pendingKey);
    const profileTyped = !!(profile.name || profile.symbol || profile.description || profile.email || profile.website || profile.logo);
    // no changes on the page: the two buttons offer the two ways to begin (Add Account, Import Account); with changes they are Update and Revert
    const pristine = !pendingKey && !profileTyped;
    const addToCache = () => void run(() => (pendingKey ? host.importAccount(pendingKey, target?.id, profile) : host.createAccount(target?.id, profile)));
    const onMainButton = () => {
        if (busy)
            return;
        if (!pristine)
            return addToCache();
        if (unavailable.createAccount) {
            setError(unavailable.createAccount);
            return;
        }
        if (host.previewsNewKey) {
            setPendingKey(generatePrivateKey());
            setError('');
            return;
        }
        addToCache();
    };
    const onSecondButton = () => {
        if (!pristine) {
            resetForm();
            return;
        }
        if (unavailable.importAccount) {
            setError(unavailable.importAccount);
            return;
        }
        setKeyEntryOpen(true);
    };
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
            if (entry === 'connectHardware' && host.connectHardwareDevice)
                continue;
            unavailable[entry] ?? (unavailable[entry] = DEFAULT_CONNECT_UNAVAILABLE[entry]);
        }
    }
    // The wallet list (WALLET_LIST_SELECT_PANEL, opened from the wallet pill): one row per wallet with Connect / Disconnect, written once here for every host. The web app's Merit wallet row is not offered by a host that is not the web app.
    const nativeSlug = nativeSlugOf(nativeWalletId);
    // 2026-10-31 (owner question): every wallet is listed in every host, Merit (Web App) in the extension too (it used to be hidden there, which made the two lists differ)
    const walletSlugs = Object.keys(WALLET_SLUG_ID);
    // 2026-11-07 (owner, docs/design/meritConnectRules.txt W1 to W6): the wallet list no longer connects or disconnects anything. Each row has a CHECK BOX: a checked wallet is a group on the Active Account Selection page, where its
    // Connect / Disconnect now live (MeritWallet's group badge). Nothing is checked at first; each app keeps its own choice (walletListedStore). The wallet this app IS is always listed (checked, locked).
    const listed = useWalletListed();
    const { setErrorMessage } = useExchangeContext();
    const { openPanel, closePanel } = usePanelTree();
    const messageVisible = usePanelVisible(SP.MESSAGE_PANEL);
    const warnedFor = useRef(null);
    // the warning is answered only by its two buttons: closing it (the X, back) does nothing: the box stays checked and the wallet connected
    useEffect(() => {
        if (!messageVisible && warnedFor.current) {
            warnedFor.current = null;
            pendingApprovalMessageStore.set(null);
        }
    }, [messageVisible]);
    const toggleListed = (slug) => {
        if (slug === nativeSlug)
            return;
        if (!listed[slug]) {
            walletListedStore.set(slug, true);
            return;
        }
        // clearing a box of a wallet that is CONNECTED: a warning in MESSAGE_PANEL first; Continue hides it and disconnects it, Cancel (or closing the warning) does nothing
        if (walletConnection?.[slug]) {
            const name = walletAssetName(slug);
            warnedFor.current = slug;
            const done = () => {
                warnedFor.current = null;
                pendingApprovalMessageStore.set(null);
                closePanel(SP.MESSAGE_PANEL, 'AddAccountFlow:disconnectWarning:done');
            };
            pendingApprovalMessageStore.set({
                requirePassword: false,
                passwordError: '',
                busy: false,
                approveLabel: 'Continue',
                rejectLabel: 'Cancel',
                onReject: done,
                onApprove: () => {
                    walletListedStore.set(slug, false);
                    done();
                    void Promise.resolve(onDisconnectWallet?.(slug)).catch(() => undefined);
                },
            });
            setErrorMessage({ errCode: 0, msg: `${name} is connected. Removing it from the account list will disconnect it.\n\nContinue?`, source: 'WalletListDisconnect', status: STATUS.WARNING });
            openPanel(SP.MESSAGE_PANEL, 'AddAccountFlow:disconnectWarning');
            return;
        }
        walletListedStore.set(slug, false);
    };
    return (_jsxs("div", { style: addAccountStyle.screen, children: [flow.walletListVisible && (_jsxs("div", { style: addAccountStyle.listBleed, children: [_jsx(WalletListPanel, { onSelect: () => undefined, wallets: walletSlugs.filter((slug) => slug !== nativeSlug), listed: listed, onToggleListed: toggleListed, headerLabel: "Remote Wallet" }), error && _jsx("p", { style: addAccountStyle.error, children: error })] })), flow.importWalletVisible && (_jsx(ImportWalletForm, { value: phrase, onChange: setPhrase, invalid: phraseInvalid, previewAddress: phrasePreview, error: error, isImporting: busy, onImport: () => void run(() => host.importWallet(normalizeMnemonic(phrase), target?.id)) })), accountScreenVisible && (
            // 2026-11-07 (owner: "we are removing redundancy here"): Create a Merit Account is the ACCOUNT DETAILS screen in add mode. 2026-11-09 (owner: one base): it is drawn by the same base layout (DetailScreenLayout) as Account Details, with its picture and its table passed in; its own small form is gone. The title is Add New Account and the button Add Account.
            _jsx(DetailScreenLayout, { screenId: "ACCOUNT_INFO", onSubmit: (event) => {
                    event.preventDefault();
                    onMainButton();
                }, logoFlag: SP.ACCOUNT_LOGO, metaFlag: SP.ACCOUNT_META_DATA, logoId: "ACCOUNT_LOGO", metaId: "ACCOUNT_META_DATA", resizeKey: "create", toggleTrace: "AddAccountFlow:toggleAccountMeta", avatar: {
                    logoPreviewSrc: logoUrl,
                    connected: true,
                    isEditMode: true,
                    inputLocked: false,
                    previewButtonLabel: 'Select Preview Image',
                    loadingInputMessage: '',
                    isLoading: false,
                    logoFileInputRef,
                    onFileChange: (event) => setProfile((p) => ({ ...p, logo: event.target.files?.[0] ?? null })),
                    toggleLabel: 'Account Meta',
                }, table: (_jsxs(_Fragment, { children: [keyEntryOpen && (_jsxs("div", { style: addAccountStyle.keyEntry, children: [_jsx(PrivateKeyField, { value: key, onChange: setKey, autoFocus: true }), formatInvalid && _jsx("p", { style: addAccountStyle.error, children: "Expected 0x followed by 64 hex characters." })] })), _jsx(AccountFormPanel, { bare: true, panelMarginClass: "", accountPanelBorderClass: "", contentWidthClass: "max-w-[56rem]", idPrefix: "account-component-", formHeading: "", connected: true, 
                            // the address and the private key of a host that makes the key itself do not exist until the account is added
                            publicKey: pendingAddress || 'Made when the account is added', publicKeyLocked: true, privateKeyRow: pendingKey ? (style) => (_jsxs("div", { className: accountFormClass.contents, children: [_jsx("div", { className: accountFormClass.labelCell(style.zebra, style.cell), children: "Private Key" }), _jsx("div", { className: accountFormClass.valueCell(style.zebra, style.cell), children: "Hidden, kept encrypted once added" })] })) : undefined, formData: { name: profile.name, symbol: profile.symbol, email: profile.email ?? '', website: profile.website ?? '', description: profile.description, recipientNetwork: [] }, errors: {}, descriptionTextareaRef: descriptionRef, inputLocked: false, isLoading: false, loadingInputMessage: "", isSaving: busy, isEditMode: true, submitLabel: pristine ? 'Add Account' : 'Update', hasUnsavedChanges: true, canCreateMissingAccount: true, disableSubmit: busy, disableRevert: busy, isRevertNoop: false, onPublicKeyChange: () => undefined, onPublicKeyBlur: () => undefined, onChange: (event) => {
                                const { name, value } = event.target;
                                if (name === 'name' || name === 'symbol' || name === 'email' || name === 'website' || name === 'description')
                                    setProfile((p) => ({ ...p, [name]: value }));
                            }, onFieldBlur: () => undefined, 
                            // 2026-11-12 (owner): with no changes the second button is Import Account (it opens the key box); with changes it is Revert (the form is cleared; the back arrow leaves the screen)
                            revertLabel: pristine ? 'Import Account' : 'Revert', onRevert: onSecondButton }), error && _jsx("p", { style: addAccountStyle.error, children: error })] })) }))] }));
}
