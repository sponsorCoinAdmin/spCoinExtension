// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/injectableComponentTypes.ts
//
// 2026-10-18 (docs/appPackages.txt, item 2) -- shared TypeScript interfaces for the injectable components that app packages
// supply to meritWallet via the host contract. meritWallet consumes these through the host; app packages implement them.
// Each app package provides exactly the components its platform uses:
//   - meritWebApp  -> KeyStore  (profile/account storage, keystore management, avatar handling)
//   - meritExtension -> Vault  (secure key/account management, Chrome runtime/messaging)
//   - meritAndroid -> Android Keystore + biometric hooks
//   - meritIphone  -> Keychain + Secure Enclave hooks
//
// Pure TypeScript: no React, no DOM, no browser globals. Implementations live in the app packages.

/** A credential used to open a store. */
export type InjectableCredentialKind = 'password' | 'pin' | 'biometric';

export interface InjectableCredential {
  kind: InjectableCredentialKind;
  value: string;
}

/** Capability flags a host exposes so shared flows behave correctly per platform. */
export interface InjectableCapabilities {
  canCreate: boolean;
  canImportPhrase: boolean;
  canImportKey: boolean;
  canBackup: boolean;
  canChangeCredential: boolean;
  canDelete: boolean;
  canRevealKey: boolean;
  canRevealPhrase: boolean;
  canUseBiometric: boolean;
}

/** Summary of an account held by an injectable component. */
export interface InjectableAccount {
  address: string;
  name?: string;
  source?: 'generated' | 'imported' | 'hardware';
}

/** The base contract every injectable component implements. */
export interface IInjectableComponent {
  /** Human-readable label the host can surface in UI (e.g. "KeyStore", "Vault"). */
  readonly label: string;
  /** Capability flags this component supports. */
  readonly capabilities: InjectableCapabilities;
  /** Is the store currently unlocked/usable? */
  isUnlocked(): Promise<boolean>;
  /** Unlock with a credential. Returns whether unlock succeeded. */
  unlock(credential: InjectableCredential): Promise<boolean>;
  /** Lock the store. */
  lock(): Promise<void>;
  /** Subscribe to lock/unlock changes; returns an unsubscribe function. */
  onChange(listener: () => void): () => void;
}

/** KeyStore: profile/account storage + keystore management (web). */
export interface IKeyStore extends IInjectableComponent {
  /** List all known accounts. */
  list(): Promise<InjectableAccount[]>;
  /** Address of the active account, if any. */
  activeAddress(): Promise<string | undefined>;
  /** Set the active account. */
  setActive(address: string): Promise<void>;
  /** Create the next account (from recovery phrase) or import one by private key. */
  create(name?: string): Promise<InjectableAccount>;
  /** Import an account by private key. */
  importPrivateKey(privateKey: string, name?: string): Promise<InjectableAccount>;
  /** Remove an account by address. */
  remove(address: string): Promise<void>;
  /** Store/retrieve profile data keyed by address. */
  getProfile(address: string): Promise<{ name?: string; avatarUrl?: string } | undefined>;
  /** Save profile data for an address. */
  setProfile(address: string, profile: { name?: string; avatarUrl?: string }): Promise<void>;
}

/** Vault: secure key/account management (extension/phone). */
export interface IVault extends IInjectableComponent {
  list(): Promise<InjectableAccount[]>;
  activeAddress(): Promise<string | undefined>;
  setActive(address: string): Promise<void>;
  create(name?: string): Promise<InjectableAccount>;
  importPrivateKey(privateKey: string, name?: string): Promise<InjectableAccount>;
  remove(address: string): Promise<void>;
  /** Sign a message with the active (or named) account. */
  signMessage(params: { address: string; message: string }): Promise<string>;
  /** Send a transaction; returns the transaction hash. */
  sendTransaction(request: { from: string; to?: string; value?: bigint; data?: string; chainId: number }): Promise<{ hash: string }>;
}

/** Platform storage abstraction: small preferences, clipboard, open URL, save file. */
export interface IPlatformStore {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  copyToClipboard(text: string): Promise<void>;
  openUrl(url: string): Promise<void>;
  saveFile(fileName: string, bytes: Uint8Array): Promise<void>;
}
