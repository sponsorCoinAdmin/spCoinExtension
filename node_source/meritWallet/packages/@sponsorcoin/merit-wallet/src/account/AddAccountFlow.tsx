// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/account/AddAccountFlow.tsx
//
// 2026-10-10 (docs/connectionDesign.txt item 2) -- the "Add a Wallet/Account" flow, written once in the package: the menu (spcoin-panels' AddWalletMenu, the same entries, order and wording the web app shows), and the screens behind
// the entries a host can offer. A host passes an AddAccountHost: what each entry does for ITS approver (the extension: create = derive the next vault account, import = a private key into the vault) and, for every entry it cannot offer,
// the reason (shown disabled, connectionDesign 2.7). Whatever is added is made the active account by the host's callback, never by this component (connectionDesign 2.6: the app does not choose the active account).
'use client';

import React, { useEffect, useState } from 'react';
import { privateKeyToAddress } from 'viem/accounts';
import { AddWalletMenu, ImportAccountForm, ImportWalletForm } from '@sponsorcoin/spcoin-panels';
import { firstAddressOfMnemonic, isValidMnemonic, normalizeMnemonic } from '../vault/walletAccounts';
import type { AuthenticatorId } from '../auth/authenticator';
import type { Wallet } from '../wallet/wallet';
import { addEntryReasons, readAddTargets, type AddTarget } from '../wallet/addTarget';

export type AddAccountEntry = 'importWallet' | 'importAccount' | 'createAccount' | 'connectMetaMask' | 'connectMeritExtension' | 'connectHardware';

/** The entries that connect an account an approver already holds (rather than adding keys here). */
export type ConnectApproverEntry = 'connectMetaMask' | 'connectMeritExtension' | 'connectHardware';

export interface AddAccountHost {
  /** Create a new account under this host's approver (the extension: derive the next account from its recovery phrase). Throw a readable message on failure. */
  createAccount(targetId?: AuthenticatorId): Promise<void>;
  /** Import one account from a private key into this host's approver. Throw a readable message on failure (wrong format is checked here first). */
  importAccount(privateKey: string, targetId?: AuthenticatorId): Promise<void>;
  /** Import a whole wallet (another Secret Recovery Phrase) into this host's approver; its first account is added. Throw a readable message on failure. A host that omits it shows the entry disabled. */
  importWallet?(mnemonic: string, targetId?: AuthenticatorId): Promise<void>;
  /**
   * 2026-10-12 (docs/connectionDesign.txt items 4 / 7 / 8, authenticationDesign row 9): connect an account that another approver holds (MetaMask, the Merit extension, a hardware wallet): ask the approver, make the account active.
   * Throw a readable message on failure. A host that omits it shows those rows disabled with the reason below (the same entries and words in every host).
   */
  connectApprover?(entry: ConnectApproverEntry): Promise<void>;
  /** The wallets this host can really add keys to (it routes createAccount / importAccount by the target id). Omitted: every reachable wallet that keeps keys. */
  targets?: readonly AuthenticatorId[];
  /** Entries this host cannot offer, each with the reason shown on the disabled row. */
  unavailable?: Partial<Record<AddAccountEntry, string>>;
}

/** What a disabled connect row says when the host gave no reason of its own. */
export const DEFAULT_CONNECT_UNAVAILABLE: Record<ConnectApproverEntry, string> = {
  connectMetaMask: 'Available in the web app',
  connectMeritExtension: 'Available in the web app',
  connectHardware: 'Using USB or a QR Code — Coming Soon',
};

type Screen = 'menu' | 'importAccount' | 'createAccount' | 'importWallet';

const buttonStyle: React.CSSProperties = { flex: 1, borderRadius: 8, border: 'none', padding: '9px 0', fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#243056', color: '#ffffff' };
const primaryStyle: React.CSSProperties = { ...buttonStyle, background: '#5981F3' };

const KEY_FORMAT = /^0x[0-9a-fA-F]{64}$/;

export default function AddAccountFlow({ host, onDone, wallet, activeAddress }: { host: AddAccountHost; onDone(): void; wallet?: Wallet; activeAddress?: string }) {
  const [screen, setScreen] = useState<Screen>('menu');
  // docs/createWalletAccountDesign.txt section 5: the wallet this screen adds to: the active wallet by default; the person may point it at another wallet that keeps keys (this visit only)
  // a host that builds its `targets` array on every render must not restart the read each time: the list is keyed by its content
  const hostTargets = host.targets?.join(',');
  const [targets, setTargets] = useState<AddTarget[]>([]);
  const [defaultTarget, setDefaultTarget] = useState<AuthenticatorId | undefined>(undefined);
  const [pickedTarget, setPickedTarget] = useState<AuthenticatorId | undefined>(undefined);
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
      setDefaultTarget(read.defaultId && allowed.some((t) => t.id === read.defaultId) ? read.defaultId : allowed[0]?.id);
    });
    return () => { cancelled = true; };
  }, [wallet, activeAddress, hostTargets]);
  const target = targets.find((t) => t.id === (pickedTarget ?? defaultTarget));
  const [key, setKey] = useState('');
  // Import a wallet: the phrase typed, whether it is a real BIP-39 phrase, and the first account it would give (checked here, nothing is imported yet)
  const [phrase, setPhrase] = useState('');
  const [phraseValid, setPhraseValid] = useState(false);
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  const back = () => {
    setError('');
    setKey('');
    setPhrase('');
    if (screen === 'menu') onDone();
    else setScreen('menu');
  };
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await action();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The account could not be added.');
    } finally {
      setBusy(false);
    }
  };
  const unavailable: Partial<Record<AddAccountEntry, string>> = { ...addEntryReasons(target), ...(host.unavailable ?? {}) };
  if (!host.importWallet) unavailable.importWallet ??= 'Importing a wallet is not available here.';
  if (!host.connectApprover) {
    for (const entry of Object.keys(DEFAULT_CONNECT_UNAVAILABLE) as ConnectApproverEntry[]) unavailable[entry] ??= DEFAULT_CONNECT_UNAVAILABLE[entry];
  }
  // a connect entry: ask the approver, then the flow is done (the account is the active one now)
  const connect = (entry: ConnectApproverEntry) => () => {
    if (unavailable[entry] || !host.connectApprover) return;
    void run(() => host.connectApprover!(entry));
  };
  const open = (entry: AddAccountEntry, next: Screen) => () => {
    if (unavailable[entry]) return;
    setError('');
    setScreen(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12, color: '#fff' }}>
      <button type="button" onClick={back} style={{ ...buttonStyle, flex: 'none', alignSelf: 'flex-start', padding: '6px 12px' }}>
        {screen === 'menu' ? 'Back' : '← Back'}
      </button>
      {screen === 'menu' && target && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
          <span>Adding to <strong style={{ color: '#fff' }}>{target.name}</strong></span>
          {targets.length > 1 ? (
            <select
              aria-label="Change the wallet to add to"
              value={target.id}
              onChange={(event) => setPickedTarget(event.target.value as AuthenticatorId)}
              style={{ marginLeft: 'auto', background: '#0E111B', color: '#fff', border: '1px solid #334155', borderRadius: 6, padding: '2px 6px', fontSize: 11 }}
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : null}
        </div>
      )}
      {screen === 'menu' && (
        <AddWalletMenu
          onImportWallet={open('importWallet', 'importWallet')}
          onImportAccount={open('importAccount', 'importAccount')}
          onCreateAccount={open('createAccount', 'createAccount')}
          onConnectMetaMask={connect('connectMetaMask')}
          onConnectMeritExtension={host.connectApprover ? connect('connectMeritExtension') : undefined}
          onConnectHardware={connect('connectHardware')}
          unavailable={unavailable}
          error={error}
        />
      )}
      {screen === 'importAccount' && (
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
      {screen === 'importWallet' && (
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
      {screen === 'createAccount' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 4px' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1' }}>Create a new account: a new address and private key, kept under this wallet.</p>
          {error && <p style={{ margin: 0, fontSize: 12, color: '#fca5a5' }}>{error}</p>}
          <button type="button" disabled={busy} onClick={() => void run(() => host.createAccount(target?.id))} style={{ ...primaryStyle, opacity: busy ? 0.5 : 1 }}>
            {busy ? 'Creating…' : 'Create Account'}
          </button>
        </div>
      )}
    </div>
  );
}
