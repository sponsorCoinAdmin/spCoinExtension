// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AddAccountFlow.tsx
//
// 2026-10-10 (docs/design/accountAuthDesign.txt section 17 item 2) -- the "Add a Wallet/Account" flow, written once in the package: the menu (spcoin-panels' AddWalletMenu, the same entries, order and wording the web app shows), and the screens behind
// the entries a host can offer. A host passes an AddAccountHost: what each entry does for ITS approver (the extension: create = derive the next vault account, import = a private key into the vault) and, for every entry it cannot offer,
// the reason (shown disabled, docs/design/accountAuthDesign.txt section 17.2.7). Whatever is added is made the active account by the host's callback, never by this component (docs/design/accountAuthDesign.txt section 17.2.6: the app does not choose the active account).
'use client';

import { accountDetailClass, addAccountStyle, walletPartClass } from '@sponsorcoin/spcoin-common/styles';
import AccountAvatarPanel from './form/AccountAvatarPanel';
import AccountFormPanel from './form/AccountFormPanel';
import { useEffect, useRef, useState } from 'react';
import { privateKeyToAddress } from 'viem/accounts';
import { AddWalletMenu, ImportAccountForm, ImportWalletForm, WalletListPanel, useAddWalletFlow, useWalletListed, walletListedStore } from '@sponsorcoin/spcoin-panels';
import { STATUS } from '@sponsorcoin/spcoin-common/context';
import { useExchangeContext, usePanelTree, usePanelVisible } from '@sponsorcoin/spcoin-exchange-engine';
import { pendingApprovalMessageStore } from '../approval/pendingApprovalMessageStore';
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import { firstAddressOfMnemonic, isValidMnemonic, normalizeMnemonic } from '../vault/walletAccounts';
import type { AuthenticatorId } from '../auth/authenticator';
import type { Wallet } from '../wallet/wallet';
import { WALLET_SLUG_ID } from '../wallet/walletSlugs';
import { addEntryReasons, readAddTargets, type AddTarget } from '../wallet/addTarget';
import { WalletSelectDropDown, WALLET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';

export type AddAccountEntry = 'importWallet' | 'importAccount' | 'createAccount' | 'connectMetaMask' | 'connectMeritExtension' | 'connectMeritWeb' | 'connectHardware';

/** The entries that connect an account an approver already holds (rather than adding keys here). */
export type ConnectApproverEntry = 'connectMetaMask' | 'connectMeritExtension' | 'connectMeritWeb' | 'connectHardware';

/** The public profile typed on the Create Account screen (a host that sets createProfile). Blank fields are left to the host's own defaults. */
export interface NewAccountProfile {
  name: string;
  symbol: string;
  description: string;
  /** The Add New Account screen is the Account Details table, which also has these two rows; a host that does not keep them ignores them. */
  email?: string;
  website?: string;
  /** The picked avatar image, if any. */
  logo: File | null;
}

export interface AddAccountHost {
  /** Create a new account under this host's approver (the extension: derive the next account from its recovery phrase). Throw a readable message on failure. `profile` is given only when the host asked for the profile form (createProfile). */
  createAccount(targetId?: AuthenticatorId, profile?: NewAccountProfile): Promise<void>;
  /** Show the name / symbol / description / avatar form on the Create Account screen and pass what was typed to createAccount. Omitted: the screen is a single Create Account button. */
  createProfile?: boolean;
  /** Import one account from a private key into this host's approver. Throw a readable message on failure (wrong format is checked here first). */
  importAccount(privateKey: string, targetId?: AuthenticatorId): Promise<void>;
  /** Import a whole wallet (another Secret Recovery Phrase) into this host's approver; its first account is added. Throw a readable message on failure. A host that omits it shows the entry disabled. */
  importWallet?(mnemonic: string, targetId?: AuthenticatorId): Promise<void>;
  /**
   * 2026-10-12 (docs/design/accountAuthDesign.txt section 17 items 4 / 7 / 8, accountAuthDesign row 9): connect an account that another approver holds (MetaMask, the Merit extension, a hardware wallet): ask the approver, make the account active.
   * Throw a readable message on failure. A host that omits it shows those rows disabled with the reason below (the same entries and words in every host).
   */
  connectApprover?(entry: ConnectApproverEntry): Promise<void>;
  /**
   * 2026-11-04 (owner report: connecting MetaMask from the wallet list changed the panel): the WALLET-level connect behind a row of the wallet list (Connect), which connects the wallet and changes nothing else: no account becomes active, no screen changes. A host without it falls back to connectApprover (the
   * account-level connect, which may activate an account).
   */
  connectWallet?(slug: string): Promise<void>;
  /** 2026-10-13 (docs/design/accountAuthDesign.txt section 17 item 12): connect one hardware device by id (Ledger, Trezor, ...), from its row of the wallet list. */
  connectHardwareDevice?(id: string): Promise<void>;
  /** Bring the other wallet's own window forward when its Connect is pressed on the wallet list. Called from a click. */
  bringWalletForward?(entry: ConnectApproverEntry): void;
  /** The wallets this host can really add keys to (it routes createAccount / importAccount by the target id). Omitted: every reachable wallet that keeps keys. */
  targets?: readonly AuthenticatorId[];
  /**
   * Entries this host performs itself for the wallets in `targets`, whatever that wallet's vault flags say (the web app's dev keystore has no vault importKey / importPhrase: its Add flow writes the key to the server keystore directly).
   * For such an entry the "<wallet> cannot ..." reason taken from the wallet's features is not shown; the host's own `unavailable` reasons still are.
   */
  performs?: readonly AddAccountEntry[];
  /** Entries this host cannot offer, each with the reason shown on the disabled row. */
  unavailable?: Partial<Record<AddAccountEntry, string>>;
}

/** What a disabled connect row says when the host gave no reason of its own. */
export const DEFAULT_CONNECT_UNAVAILABLE: Record<ConnectApproverEntry, string> = {
  connectMetaMask: 'Available in the web app',
  connectMeritExtension: 'Available in the web app',
  connectMeritWeb: 'Available in the extension',
  connectHardware: 'Available in the web app',
};

const EMPTY_PROFILE: NewAccountProfile = { name: '', symbol: '', description: '', logo: null };

const KEY_FORMAT = /^0x[0-9a-fA-F]{64}$/;

/** The wallets the wallet list offers (WALLET_LIST_SELECT_PANEL), by asset folder, and the authenticator each one is. */
/** The list row of the wallet THIS host is: always connected, nothing to connect or disconnect from it. */
/** The wallet's name for the warning (the wallet list's own names). */
const WALLET_NAMES: Record<string, string> = { merit: 'Merit (Web App)', meritExtension: 'Merit (Extension)', metamask: 'MetaMask', ledger: 'Ledger', trezor: 'Trezor' };
const walletAssetName = (slug: string): string => WALLET_NAMES[slug] ?? slug;
const nativeSlugOf = (nativeWalletId: string | undefined): string | undefined => (nativeWalletId === 'serverKeystore' ? 'merit' : nativeWalletId === 'localVault' ? 'meritExtension' : undefined);

export default function AddAccountFlow({ host, onDone, wallet, activeAddress, nativeWalletId, walletConnection, onDisconnectWallet }: { host: AddAccountHost; onDone(): void; wallet?: Wallet; activeAddress?: string; nativeWalletId?: string; walletConnection?: Record<string, boolean>; onDisconnectWallet?(slug: string): void | Promise<unknown> }) {
  const [key, setKey] = useState('');
  const [phrase, setPhrase] = useState('');
  const [phraseValid, setPhraseValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<NewAccountProfile>(EMPTY_PROFILE);
  const [logoUrl, setLogoUrl] = useState('');
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
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
  // docs/design/accountAuthDesign.txt section 18 section 5: the wallet this screen adds to: the active wallet by default; the person may point it at another wallet that keeps keys (this visit only)
  // a host that builds its `targets` array on every render must not restart the read each time: the list is keyed by its content
  const hostTargets = host.targets?.join(',');
  const [targets, setTargets] = useState<AddTarget[]>([]);
  const [defaultTarget, setDefaultTarget] = useState<AuthenticatorId | undefined>(undefined);
  const [pickedTarget, setPickedTarget] = useState<AuthenticatorId | undefined>(undefined);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  useEffect(() => {
    if (!wallet) return undefined;
    let cancelled = false;
    void readAddTargets(wallet, activeAddress, hostTargets === undefined ? undefined : (hostTargets.split(',') as AuthenticatorId[])).catch((error: unknown) => {
      // never silent: without targets the screen still works, it just does not say which wallet it adds to
      console.error('The wallets this screen can add to could not be read:', error);
      return { targets: [] as AddTarget[], defaultId: undefined };
    }).then((read) => {
      if (cancelled) return;
      const allowed = hostTargets !== undefined ? read.targets.filter((t) => hostTargets.split(',').includes(t.id)) : read.targets;
      setTargets(allowed);
      // the host's own wallet is where an account is added by default (the active account may belong to another wallet)
      const own = nativeWalletId && allowed.some((t) => t.id === nativeWalletId) ? (nativeWalletId as AuthenticatorId) : undefined;
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
      if (alive) setPhraseValid(ok);
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
      previewAddress = privateKeyToAddress(trimmed as `0x${string}`);
    } catch {
      previewAddress = '';
    }
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      flow.clearAddWalletFlow('AddAccountFlow:complete');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The account could not be added.');
    } finally {
      setBusy(false);
    }
  };
  const featureReasons: Partial<Record<AddAccountEntry, string>> = { ...addEntryReasons(target) };
  if (target && hostTargets?.split(',').includes(target.id)) for (const entry of host.performs ?? []) delete featureReasons[entry];
  const unavailable: Partial<Record<AddAccountEntry, string>> = { ...featureReasons, ...(host.unavailable ?? {}) };
  if (!host.importWallet) unavailable.importWallet ??= 'Importing a wallet is not available here.';
  if (!host.connectApprover) {
    for (const entry of Object.keys(DEFAULT_CONNECT_UNAVAILABLE) as ConnectApproverEntry[]) {
      if (entry === 'connectHardware' && host.connectHardwareDevice) continue;
      unavailable[entry] ??= DEFAULT_CONNECT_UNAVAILABLE[entry];
    }
  }
  // a connect entry: ask the approver, then the flow is done (the account is the active one now)
  const connect = (entry: ConnectApproverEntry) => () => {
    if (unavailable[entry] || !host.connectApprover) return;
    void run(() => host.connectApprover!(entry));
  };
  const open = (entry: AddAccountEntry, panel: SP) => () => {
    if (unavailable[entry]) return;
    setError('');
    flow.goToLeaf(panel);
  };

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
  const warnedFor = useRef<string | null>(null);
  // the warning is answered only by its two buttons: closing it (the X, back) does nothing: the box stays checked and the wallet connected
  useEffect(() => {
    if (!messageVisible && warnedFor.current) {
      warnedFor.current = null;
      pendingApprovalMessageStore.set(null);
    }
  }, [messageVisible]);
  const toggleListed = (slug: string) => {
    if (slug === nativeSlug) return;
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

  return (
    <div style={addAccountStyle.screen}>
      {menuVisible && target && targets.length > 1 && (
        <div style={addAccountStyle.targetLine}>
          <span>Adding to</span>
          {targets.length > 1 ? (
            <div style={addAccountStyle.targetPickerAnchor}>
              <WalletSelectDropDown
                walletId={target.id}
                displayName={target.name}
                showDisplay={WALLET_SELECT_DISPLAY.ICON | WALLET_SELECT_DISPLAY.ADDRESS | WALLET_SELECT_DISPLAY.COPY | (targetPickerOpen ? WALLET_SELECT_DISPLAY.CHEVRON_UP : WALLET_SELECT_DISPLAY.CHEVRON_DN)}
                restrictRowClickToChevron
                onSelectClick={() => setTargetPickerOpen((open) => !open)}
                label="Change wallet"
                collapseKey={target.id}
              />
              {targetPickerOpen && (
                <div role="listbox" aria-label="Wallets that can add accounts" style={addAccountStyle.targetPickerList}>
                  {targets.map((option) => (
                    <button key={option.id} type="button" role="option" aria-selected={option.id === target.id} onClick={() => { setPickedTarget(option.id); setTargetPickerOpen(false); }} style={addAccountStyle.targetOption(option.id === target.id)}>
                      {option.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : <strong style={addAccountStyle.targetName}>{target.name}</strong>}
        </div>
      )}
      {menuVisible && (
        <div style={addAccountStyle.listBleed}>
        <AddWalletMenu
          onImportWallet={open('importWallet', SP.IMPORT_A_WALLET)}
          onImportAccount={open('importAccount', SP.IMPORT_AN_ACCOUNT)}
          onCreateAccount={open('createAccount', SP.CREATE_ACCOUNT)}
          onConnectMetaMask={connect('connectMetaMask')}
          onConnectMeritExtension={host.connectApprover ? connect('connectMeritExtension') : undefined}
          onConnectHardware={connect('connectHardware')}
          // like the web app: connecting MetaMask, the Merit extension and a hardware wallet is done from the wallet list (the pill's chevron), not from this menu
          hide={{ connectMetaMask: true, connectMeritExtension: true, connectHardware: true }}
          unavailable={unavailable}
          error={error}
        />
        </div>
      )}
      {flow.walletListVisible && (
        <div style={addAccountStyle.listBleed}>
          <WalletListPanel onSelect={() => undefined} wallets={walletSlugs} listed={listed} fixed={nativeSlug} onToggleListed={toggleListed} />
          {error && <p style={addAccountStyle.error}>{error}</p>}
        </div>
      )}
      {flow.importAccountVisible && (
        <ImportAccountForm
          value={key}
          onChange={setKey}
          formatInvalid={formatInvalid}
          previewAddress={previewAddress}
          error={error}
          isImporting={busy}
          onImport={() => void run(() => host.importAccount(trimmed, target?.id))}
        />
      )}
      {flow.importWalletVisible && (
        <ImportWalletForm
          value={phrase}
          onChange={setPhrase}
          invalid={phraseInvalid}
          previewAddress={phrasePreview}
          error={error}
          isImporting={busy}
          onImport={() => void run(() => host.importWallet!(normalizeMnemonic(phrase), target?.id))}
        />
      )}
      {flow.createAccountVisible && (
        // 2026-11-07 (owner: "we are removing redundancy here"): Create a Merit Account is the ACCOUNT DETAILS screen (the same avatar panel and the same table, AccountDetailScreen) in add mode: its own small form is gone. The title is Add New Account and the button Add Account.
        <div id="ACCOUNT_INFO" className={accountDetailClass.screen}>
          <form
            className={accountDetailClass.form}
            onSubmit={(event) => {
              event.preventDefault();
              if (!busy) void run(() => host.createAccount(target?.id, profile));
            }}
          >
            <div id="ACTIVE_ACCOUNT_BODY" className={walletPartClass.accountBody(true)}>
              <div id="ACCOUNT_LOGO" className={accountDetailClass.block}>
                <AccountAvatarPanel
                  panelMarginClass="mb-0 min-h-0"
                  avatarPanelBorderClass=""
                  avatarHeading=""
                  logoPreviewSrc={logoUrl}
                  connected
                  isEditMode
                  inputLocked={false}
                  previewButtonLabel="Select Preview Image"
                  loadingInputMessage=""
                  isLoading={false}
                  acceptedInput="image/*"
                  logoFileInputRef={logoFileInputRef}
                  onFileChange={(event) => setProfile((p) => ({ ...p, logo: event.target.files?.[0] ?? null }))}
                  showImage
                  showButton
                  minPreviewSize={180}
                  overflowMinPreviewSize={96}
                  maxPreviewSize={420}
                  minControlWidth={220}
                  uploadControlTextClassName={walletPartClass.uploadControlText}
                  previewSizeBuffer={0}
                  previewHeightBuffer={8}
                  sectionBottomBuffer={0}
                  lockSectionHeight={false}
                  fillParentHeight={false}
                  sizingBoundarySelector="#ACTIVE_ACCOUNT_BODY"
                  resizeSignal="create"
                />
              </div>
              <div id="ACCOUNT_META_DATA" className={accountDetailClass.block}>
                <AccountFormPanel
                  panelMarginClass="mb-0 !h-auto"
                  accountPanelBorderClass=""
                  contentWidthClass="max-w-[56rem]"
                  idPrefix="account-component-"
                  formHeading=""
                  connected
                  // the address and the private key do not exist until the account is added
                  publicKey="Made when the account is added"
                  publicKeyLocked
                  formData={{ name: profile.name, symbol: profile.symbol, email: profile.email ?? '', website: profile.website ?? '', description: profile.description, recipientNetwork: [] }}
                  errors={{}}
                  descriptionTextareaRef={descriptionRef}
                  inputLocked={false}
                  isLoading={false}
                  loadingInputMessage=""
                  isSaving={busy}
                  isEditMode
                  submitLabel="Add Account"
                  hasUnsavedChanges
                  canCreateMissingAccount
                  disableSubmit={busy}
                  disableRevert={busy}
                  isRevertNoop={false}
                  onPublicKeyChange={() => undefined}
                  onPublicKeyBlur={() => undefined}
                  onChange={(event) => {
                    const { name, value } = event.target;
                    if (name === 'name' || name === 'symbol' || name === 'email' || name === 'website' || name === 'description') setProfile((p) => ({ ...p, [name]: value }));
                  }}
                  onFieldBlur={() => undefined}
                  // 2026-11-07 (owner): the second button reads Cancel: nothing is added, the form is cleared and the Add menu is back
                  revertLabel="Cancel"
                  onRevert={() => { setProfile(EMPTY_PROFILE); flow.goToAddMenu(); }}
                />
                {error && <p style={addAccountStyle.error}>{error}</p>}
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
