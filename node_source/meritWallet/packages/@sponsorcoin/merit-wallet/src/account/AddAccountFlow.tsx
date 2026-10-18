// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AddAccountFlow.tsx
//
// 2026-10-10 (docs/design/accountAuthDesign.txt section 17 item 2) -- the "Add a Wallet/Account" flow, written once in the package: the menu (spcoin-panels' AddWalletMenu, the same entries, order and wording the web app shows), and the screens behind
// the entries a host can offer. A host passes an AddAccountHost: what each entry does for ITS approver (the extension: create = derive the next vault account, import = a private key into the vault) and, for every entry it cannot offer,
// the reason (shown disabled, docs/design/accountAuthDesign.txt section 17.2.7). Whatever is added is made the active account by the host's callback, never by this component (docs/design/accountAuthDesign.txt section 17.2.6: the app does not choose the active account).
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { privateKeyToAddress } from 'viem/accounts';
import { usePanelTree } from '@sponsorcoin/spcoin-exchange-engine';
import { AddWalletMenu, ConnectMetaMaskLeaf, HardwareDeviceMenu, ImportAccountForm, ImportWalletForm, WalletListPanel, useAddWalletFlow } from '@sponsorcoin/spcoin-panels';
import { SP_COIN_DISPLAY as SP } from '@sponsorcoin/spcoin-common/panels';
import { firstAddressOfMnemonic, isValidMnemonic, normalizeMnemonic } from '../vault/walletAccounts';
import type { AuthenticatorId } from '../auth/authenticator';
import type { Wallet } from '../wallet/wallet';
import { addEntryReasons, readAddTargets, type AddTarget } from '../wallet/addTarget';
import { WalletSelectDropDown, WALLET_SELECT_DISPLAY } from '@sponsorcoin/spcoin-panels';

export type AddAccountEntry = 'importWallet' | 'importAccount' | 'createAccount' | 'connectMetaMask' | 'connectMeritExtension' | 'connectHardware';

/** The entries that connect an account an approver already holds (rather than adding keys here). */
export type ConnectApproverEntry = 'connectMetaMask' | 'connectMeritExtension' | 'connectHardware';

/** The public profile typed on the Create Account screen (a host that sets createProfile). Blank fields are left to the host's own defaults. */
export interface NewAccountProfile {
  name: string;
  symbol: string;
  description: string;
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
   * 2026-10-13 (docs/design/accountAuthDesign.txt section 17 item 12): the hardware wallets this host offers (Ledger, Trezor, ...). When given, "Connect a hardware wallet" opens a screen with one row per device and the chosen device is connected with connectHardwareDevice (the same flow for every device);
   * a host that omits them keeps the single connectApprover('connectHardware') row.
   */
  hardwareDevices?: { id: string; title: string; subtitle?: string; unavailable?: string }[];
  connectHardwareDevice?(id: string): Promise<void>;
  /** Stop a connect that is still waiting (the Cancel button of the connect screen): tell the other wallet to drop its request. The flow itself stops waiting either way. */
  cancelConnect?(entry: ConnectApproverEntry): void;
  /** Bring the other wallet's own window forward (the connect screen's button after a long wait). Called from a click. */
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
  connectHardware: 'Available in the web app',
};

const primaryStyle: React.CSSProperties = { borderRadius: 8, border: 'none', padding: '9px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#5981F3', color: '#ffffff' };

/** The connect screen says it is still waiting after this long (the wallet is probably locked); the host owns the hard limit. */
export const CONNECT_SOFT_WAIT_MS = 60_000;

const EMPTY_PROFILE: NewAccountProfile = { name: '', symbol: '', description: '', logo: null };
const fieldStyle: React.CSSProperties = { background: '#0E111B', color: '#fff', border: '1px solid #334155', borderRadius: 6, padding: '6px 8px', fontSize: 12, width: '100%', boxSizing: 'border-box' };

const KEY_FORMAT = /^0x[0-9a-fA-F]{64}$/;

/** The wallets the wallet list offers (WALLET_LIST_SELECT_PANEL), by asset folder, and the authenticator each one is. */
const WALLET_SLUG_ID: Record<string, string> = { merit: 'serverKeystore', meritExtension: 'injected:org.sponsorcoin.merit', metamask: 'injected:io.metamask', ledger: 'hardware:ledger', trezor: 'hardware:trezor' };
/** The list row of the wallet THIS host is: always connected, nothing to connect or disconnect from it. */
const nativeSlugOf = (nativeWalletId: string | undefined): string | undefined => (nativeWalletId === 'serverKeystore' ? 'merit' : nativeWalletId === 'localVault' ? 'meritExtension' : undefined);

export default function AddAccountFlow({ host, onDone, wallet, activeAddress, nativeWalletId, walletConnection, onDisconnectWallet }: { host: AddAccountHost; onDone(): void; wallet?: Wallet; activeAddress?: string; nativeWalletId?: string; walletConnection?: Record<string, boolean>; onDisconnectWallet?(slug: string): void }) {
  const [key, setKey] = useState('');
  const [phrase, setPhrase] = useState('');
  const [phraseValid, setPhraseValid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<NewAccountProfile>(EMPTY_PROFILE);
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
  const connectEntry: ConnectApproverEntry | undefined = flow.connectMetaMaskVisible ? 'connectMetaMask' : flow.connectMeritExtensionVisible ? 'connectMeritExtension' : undefined;
  const connectLeaf = connectEntry === 'connectMetaMask' ? SP.CONNECT_ACCOUNT : SP.CONNECT_MERIT_EXTENSION;
  const [connecting, setConnecting] = useState(false);
  const [waitingLong, setWaitingLong] = useState(false);
  const connectRunning = useRef(false);
  /** Ends the wait that is running (Cancel); null when none runs. */
  const connectStop = useRef<(() => void) | null>(null);
  const attemptConnect = (entry: ConnectApproverEntry, leaf: SP) => {
    if (connectRunning.current || !host.connectApprover) return;
    connectRunning.current = true;
    setConnecting(true);
    setWaitingLong(false);
    setError('');
    void (async () => {
      const soft = setTimeout(() => setWaitingLong(true), CONNECT_SOFT_WAIT_MS);
      let connected = false;
      try {
        const stopped = new Promise<'stopped'>((resolve) => { connectStop.current = () => resolve('stopped'); });
        const outcome = await Promise.race([host.connectApprover!(entry).then(() => 'connected' as const), stopped]);
        connected = outcome === 'connected';
      } catch (e) {
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
  const startedEntry = useRef<ConnectApproverEntry | undefined>(undefined);
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
    if (startedEntry.current === connectEntry) return;
    startedEntry.current = connectEntry;
    attemptConnect(connectEntry, connectLeaf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectEntry]);
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
      if (entry === 'connectHardware' && host.hardwareDevices?.length && host.connectHardwareDevice) continue;
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
  const walletSlugs = Object.keys(WALLET_SLUG_ID).filter((slug) => !(slug === 'merit' && nativeWalletId && nativeWalletId !== 'serverKeystore'));
  const connection: Record<string, boolean> = {};
  for (const slug of walletSlugs) connection[slug] = slug === nativeSlug ? true : !!walletConnection?.[slug];
  const toggleWallet = (slug: string) => {
    if (slug === nativeSlug) return;
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
      if (host.connectHardwareDevice) void run(() => host.connectHardwareDevice!(`hardware:${slug}`));
      else connect('connectHardware')();
    }
  };

  const openHardware = () => {
    if (host.hardwareDevices?.length && host.connectHardwareDevice) open('connectHardware', SP.CONNECT_HARDWARE_WALLET)();
    else connect('connectHardware')();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, color: '#fff' }}>
      {menuVisible && target && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
          <span>Adding to</span>
          {targets.length > 1 ? (
            <div style={{ marginLeft: 'auto', position: 'relative' }}>
              <WalletSelectDropDown
                walletId={target.id}
                displayName={target.name}
                showDisplay={WALLET_SELECT_DISPLAY.ICON | WALLET_SELECT_DISPLAY.ADDRESS | (targetPickerOpen ? WALLET_SELECT_DISPLAY.CHEVRON_UP : WALLET_SELECT_DISPLAY.CHEVRON_DN)}
                restrictRowClickToChevron
                onSelectClick={() => setTargetPickerOpen((open) => !open)}
                label="Change wallet"
                collapseKey={target.id}
              />
              {targetPickerOpen && (
                <div role="listbox" aria-label="Wallets that can add accounts" style={{ position: 'absolute', zIndex: 20, right: 0, top: '100%', minWidth: 220, padding: 4, border: '1px solid #334155', borderRadius: 8, background: '#0E111B' }}>
                  {targets.map((option) => (
                    <button key={option.id} type="button" role="option" aria-selected={option.id === target.id} onClick={() => { setPickedTarget(option.id); setTargetPickerOpen(false); }} style={{ display: 'block', width: '100%', padding: '7px 9px', border: 0, borderRadius: 5, background: option.id === target.id ? '#243056' : 'transparent', color: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: 12 }}>
                      {option.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : <strong style={{ color: '#fff' }}>{target.name}</strong>}
        </div>
      )}
      {menuVisible && (
        <AddWalletMenu
          onImportWallet={open('importWallet', SP.IMPORT_A_WALLET)}
          onImportAccount={open('importAccount', SP.IMPORT_AN_ACCOUNT)}
          onCreateAccount={open('createAccount', SP.CREATE_ACCOUNT)}
          onConnectMetaMask={connect('connectMetaMask')}
          onConnectMeritExtension={host.connectApprover ? connect('connectMeritExtension') : undefined}
          onConnectHardware={openHardware}
          // like the web app: connecting MetaMask, the Merit extension and a hardware wallet is done from the wallet list (the pill's chevron), not from this menu
          hide={{ connectMetaMask: true, connectMeritExtension: true, connectHardware: true }}
          unavailable={unavailable}
          error={error}
        />
      )}
      {flow.walletListVisible && (
        <WalletListPanel onSelect={() => undefined} wallets={walletSlugs} connection={connection} onToggleConnection={toggleWallet} />
      )}
      {connectEntry && (
        <ConnectMetaMaskLeaf
          walletName={connectEntry === 'connectMetaMask' ? 'MetaMask' : 'Merit Extension'}
          isConnecting={connecting}
          message={error}
          onRetry={() => attemptConnect(connectEntry, connectLeaf)}
          waitingLong={waitingLong}
          onBringForward={host.bringWalletForward ? () => host.bringWalletForward!(connectEntry) : undefined}
          onCancel={() => {
            host.cancelConnect?.(connectEntry);
            connectStop.current?.();
            closePanel(connectLeaf, 'AddAccountFlow:connectCancelled');
          }}
        />
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
      {flow.connectHardhatVisible && host.hardwareDevices && host.connectHardwareDevice && (
        <HardwareDeviceMenu devices={host.hardwareDevices} busy={busy} error={error} onChoose={(id) => void run(() => host.connectHardwareDevice!(id))} />
      )}
      {flow.createAccountVisible && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 4px' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1' }}>Create a new account: a new address and private key, kept under this wallet.</p>
          {host.createProfile && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logoUrl ? <img src={logoUrl} alt="Account avatar preview" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', alignSelf: 'center' }} /> : null}
              <label style={{ ...primaryStyle, textAlign: 'center', alignSelf: 'center' }}>
                Select Preview Image
                <input type="file" accept="image/*" aria-label="Account avatar" style={{ display: 'none' }} onChange={(event) => setProfile((p) => ({ ...p, logo: event.target.files?.[0] ?? null }))} />
              </label>
              <input aria-label="Account name" placeholder="Name" value={profile.name} onChange={(event) => setProfile((p) => ({ ...p, name: event.target.value }))} style={fieldStyle} />
              <input aria-label="Account symbol" placeholder="Symbol" value={profile.symbol} onChange={(event) => setProfile((p) => ({ ...p, symbol: event.target.value }))} style={fieldStyle} />
              <textarea aria-label="Account description" placeholder="Description" rows={3} value={profile.description} onChange={(event) => setProfile((p) => ({ ...p, description: event.target.value }))} style={{ ...fieldStyle, resize: 'vertical' }} />
            </div>
          )}
          {error && <p style={{ margin: 0, fontSize: 12, color: '#fca5a5' }}>{error}</p>}
          <button type="button" disabled={busy} onClick={() => void run(() => host.createAccount(target?.id, host.createProfile ? profile : undefined))} style={{ ...primaryStyle, opacity: busy ? 0.5 : 1 }}>
            {busy ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      )}
    </div>
  );
}
