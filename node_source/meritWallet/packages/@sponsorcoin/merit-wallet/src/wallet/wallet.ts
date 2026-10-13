// File: src/wallet/wallet.ts
//
// 2026-10-11 (docs/design/accountAuthDesign.txt section 15.7, item W1a) -- THE WALLET: the one object a host hands the wallet component for its key backends. Every backend is an Authenticator (src/auth/authenticator.ts):
// the dev keystore, the extension vault, the browser vault, a phone's key management system, an injected wallet such as MetaMask, a hardware device. A backend that keeps keys itself carries the optional
// `vault` capability (src/vault/vaultCapability.ts) and so supports create / import / backup / change credential / delete / reveal; a signing-only backend (MetaMask, hardware, a delegated app) has none of those.
// Modelled on MetaMask's KeyringController: ONE controller, many keyring types, the address as the only join key.
//
//   registry        which backends this host has (register / unregister / list)
//   store           each ACCOUNT's saved active backend (owners own accounts, not networks); the resolver reads it first
//   authenticatorFor(account)   the backend that signs for an account; fails with a specific error, never falls back to another backend
//   accounts()      the accounts of every backend, each once, with the backend that signs for it (an address held by two backends is one row that names both)
//   can(feature, address?)   whether the backend for that account (or any backend) supports a screen or action; the wallet draws screens from this, so a signing-only backend shows none of the key-management screens
//   primaryVault()  the first key-keeping backend that already has a wallet (the one the lock screen and the Config tab drive)
//
// MORE THAN ONE BACKEND AT ONCE IS NORMAL (owner decision 2026-10-11): vault accounts and MetaMask accounts live in one list and each signs through its own backend. No browser globals here: the host passes
// its storage in as the `store`.
import {
  authenticatorBadge,
  walletName,
  type AccountAuthenticatorRef,
  type Authenticator,
  type AuthenticatorAccount,
  type AuthenticatorId,
} from '../auth/authenticator';
import { createAuthenticatorRegistry, resolveAuthenticator, type AuthenticatorRegistry } from '../auth/resolve';
import type { VaultCapability } from '../vault/vaultCapability';

/** Where each account's chosen backend is remembered (the web app: localStorage; the extension: chrome.storage; tests: a Map). Synchronous reads, as the saved choice is small. */
export interface ActiveAuthenticatorStore {
  get(address: string): AuthenticatorId | undefined;
  set(address: string, id: AuthenticatorId | undefined): void;
}

export function createMemoryActiveAuthenticatorStore(initial: Record<string, AuthenticatorId> = {}): ActiveAuthenticatorStore {
  const map = new Map<string, AuthenticatorId>(Object.entries(initial).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    get: (address) => map.get(String(address ?? '').toLowerCase()),
    set: (address, id) => {
      const key = String(address ?? '').toLowerCase();
      if (id) map.set(key, id);
      else map.delete(key);
    },
  };
}

/** The screens and actions a backend may or may not support. */
export type WalletFeature =
  | 'createWallet'
  | 'importPhrase'
  | 'importKey'
  | 'addAccount'
  | 'backup'
  | 'changeCredential'
  | 'deleteWallet'
  | 'revealKey'
  | 'revealPhrase'
  | 'biometric'
  | 'signTypedData'
  | 'lock';

export const WALLET_FEATURES: readonly WalletFeature[] = [
  'createWallet', 'importPhrase', 'importKey', 'addAccount', 'backup', 'changeCredential', 'deleteWallet', 'revealKey', 'revealPhrase', 'biometric', 'signTypedData', 'lock',
];

export type WalletFeatures = Record<WalletFeature, boolean>;

/** What one backend supports, from its own capability flags (the vault flags when it keeps keys, the signing flags always). */
export function featuresOf(authenticator: Authenticator): WalletFeatures {
  const c = authenticator.capabilities;
  const v = authenticator.vault?.capabilities;
  return {
    createWallet: !!v?.create,
    importPhrase: !!v?.importPhrase,
    importKey: !!(v?.importKey ?? c.importKey),
    addAccount: !!(authenticator.vault ? v?.create : c.createAccount),
    backup: !!v?.backup,
    changeCredential: !!v?.changeCredential,
    deleteWallet: !!v?.delete,
    revealKey: !!v?.revealKey,
    revealPhrase: !!v?.revealPhrase,
    biometric: !!v?.biometric,
    signTypedData: !!c.signTypedData,
    lock: !!c.lock,
  };
}

export interface WalletBackendInfo {
  id: AuthenticatorId;
  label: string;
  /** The short name for the badge next to an account. */
  badge: string;
  /** The wallet's one name, the same everywhere (walletName: "Merit Wallet (Extension)", "MetaMask"). */
  name: string;
  /** True when this backend keeps the keys itself (it has the vault capability). */
  keepsKeys: boolean;
  /** The words the panels use for where its keys live ('this device', 'this browser', 'the dev server'); empty for a signing-only backend. */
  where: string;
  features: WalletFeatures;
}

export interface WalletAccountEntry extends AuthenticatorAccount {
  /** The backend that signs for this account: the saved choice, else the backend the account was listed by, else the app default. */
  authenticatorId: AuthenticatorId;
  badge: string;
  /** Every backend that lists this address (more than one when an account is held twice). */
  backends: AuthenticatorId[];
}

export interface Wallet {
  readonly registry: AuthenticatorRegistry;
  register(authenticator: Authenticator): () => void;
  unregister(id: string): void;
  backends(): WalletBackendInfo[];
  backend(id: string): WalletBackendInfo | undefined;
  /** The id of the backend that signs for `address` (its saved choice, else the app default), or undefined. Does not check that the backend is reachable; the chain plays no part. */
  backendIdFor(address: string): AuthenticatorId | undefined;
  /** The backend that signs for an account (throws a specific AuthenticatorError; never asks another backend). */
  authenticatorFor(account: { address: string; sourceAuthenticator?: AuthenticatorId }): Promise<Authenticator>;
  /** Save (or clear, with undefined) the account's active backend. */
  setActiveAuthenticator(address: string, id: AuthenticatorId | undefined): void;
  getActiveAuthenticator(address: string): AuthenticatorId | undefined;
  /** Every backend's accounts, each address once. A backend that fails to list is skipped, never fatal. */
  accounts(): Promise<WalletAccountEntry[]>;
  /** Whether the backend for `address` supports the feature; without an address, whether ANY backend does. */
  can(feature: WalletFeature, address?: string): boolean;
  /** The vault of the backend for `address`, or undefined (a signing-only backend, or nothing registered). */
  vaultFor(address: string): VaultCapability | undefined;
  /** The first key-keeping backend that already has a wallet: what the lock screen and the Config tab drive. */
  primaryVault(): Promise<{ authenticator: Authenticator; vault: VaultCapability } | undefined>;
  /** Registry changes, saved-choice changes and every backend's own lock / unlock / accountsChanged announcements. Returns the unsubscribe function. */
  onChange(listener: () => void): () => void;
}

export interface CreateWalletOptions {
  /** Rule 3 of the resolver: the app's default backend for an account that has neither a saved choice nor a source. */
  appDefault: (account: AccountAuthenticatorRef) => AuthenticatorId | undefined;
  store?: ActiveAuthenticatorStore;
  registry?: AuthenticatorRegistry;
}

function infoOf(authenticator: Authenticator): WalletBackendInfo {
  return {
    id: authenticator.id,
    label: authenticator.label,
    badge: authenticatorBadge(authenticator.id),
    name: walletName(authenticator.id, authenticator.vault?.platform),
    keepsKeys: !!authenticator.vault,
    where: authenticator.vault?.label ?? '',
    features: featuresOf(authenticator),
  };
}

export function createWallet(options: CreateWalletOptions): Wallet {
  const registry = options.registry ?? createAuthenticatorRegistry();
  const store = options.store ?? createMemoryActiveAuthenticatorStore();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  // Each registered backend's own announcements are forwarded while it is registered.
  const forwards = new Map<string, () => void>();
  const attach = (authenticator: Authenticator) => {
    forwards.get(authenticator.id)?.();
    forwards.set(authenticator.id, authenticator.onChange(() => notify()));
  };
  registry.list().forEach(attach);
  registry.onChange(() => {
    const live = new Set<string>(registry.list().map((a) => a.id));
    for (const [id, off] of [...forwards]) {
      if (!live.has(id)) {
        off();
        forwards.delete(id);
      }
    }
    registry.list().forEach((a) => { if (!forwards.has(a.id)) attach(a); });
    notify();
  });

  const refOf = (account: { address: string; sourceAuthenticator?: AuthenticatorId }): AccountAuthenticatorRef => ({
    address: account.address,
    activeAuthenticator: store.get(account.address),
    sourceAuthenticator: account.sourceAuthenticator,
  });

  const backendIdFor = (address: string): AuthenticatorId | undefined => store.get(address) ?? options.appDefault({ address });

  return {
    registry,
    register: (authenticator) => registry.register(authenticator),
    unregister: (id) => registry.unregister(id),
    backendIdFor,
    backends: () => registry.list().map(infoOf),
    backend: (id) => {
      const a = registry.get(id);
      return a ? infoOf(a) : undefined;
    },
    async authenticatorFor(account) {
      return resolveAuthenticator({ registry, account: refOf(account), appDefault: options.appDefault });
    },
    setActiveAuthenticator(address, id) {
      store.set(address, id);
      notify();
    },
    getActiveAuthenticator: (address) => store.get(address),
    async accounts() {
      const byAddress = new Map<string, WalletAccountEntry>();
      for (const authenticator of registry.list()) {
        let listed: AuthenticatorAccount[] = [];
        try {
          listed = await authenticator.accounts();
        } catch {
          continue;
        }
        for (const account of listed) {
          const key = String(account.address ?? '').toLowerCase();
          if (!key) continue;
          const existing = byAddress.get(key);
          if (existing) {
            existing.backends.push(authenticator.id);
            existing.name ??= account.name;
            continue;
          }
          byAddress.set(key, { ...account, authenticatorId: authenticator.id, badge: authenticatorBadge(authenticator.id), backends: [authenticator.id] });
        }
      }
      // The saved choice wins over "the first backend that listed it", when that backend is one of the ones holding the address.
      for (const [key, entry] of byAddress) {
        const saved = store.get(key);
        if (saved && entry.backends.includes(saved)) {
          entry.authenticatorId = saved;
          entry.badge = authenticatorBadge(saved);
        }
      }
      return [...byAddress.values()];
    },
    can(feature, address) {
      if (address) {
        const id = backendIdFor(address);
        const a = id ? registry.get(id) : undefined;
        return a ? featuresOf(a)[feature] : false;
      }
      return registry.list().some((a) => featuresOf(a)[feature]);
    },
    vaultFor(address) {
      const id = backendIdFor(address);
      return id ? registry.get(id)?.vault : undefined;
    },
    async primaryVault() {
      for (const authenticator of registry.list()) {
        const vault = authenticator.vault;
        if (!vault) continue;
        try {
          if (await vault.hasWallet()) return { authenticator, vault };
        } catch {
          /* a vault that cannot answer is not the primary one */
        }
      }
      return undefined;
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

