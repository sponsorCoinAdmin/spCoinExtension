// File: src/vault/phoneVault.ts
//
// 2026-10-11 (docs/authenticationDesign.txt section 14.10 and item V12 / W1e) -- the PHONE backend: a phone app passes its own key management system (iOS Keychain / Secure Enclave, Android Keystore / StrongBox, a
// biometric prompt) to the wallet through ONE small interface, PhoneKeyManager, which native code implements and bridges. This file is the contract plus two adapters that turn it into the wallet's own backend
// interfaces, so a phone is "just another backend" next to the dev keystore, the extension vault and MetaMask:
//   createPhoneVault(manager)          the VaultCapability (set up, unlock by biometric, lock, accounts, delete; the flags say what a phone cannot do)
//   createPhoneAuthenticator(manager)  the Authenticator (id 'deviceVault', carries that vault; signs and sends behind the key manager's own approval)
// What makes a phone different, and how the flags say it: its keys are NON-EXPORTABLE (they never leave the secure element), so revealKey, revealPhrase (after setup) and backup are false and the wallet draws no such
// screens; there is no wallet password to change (the unlock is the device's biometric or passcode), so changeCredential is false and biometric is true. The adapter has no storage of its own: the manager keeps
// every secret. Language-neutral on purpose: the manager's methods are plain request / reply shapes (see docs/authenticationDesign.txt 14.10.1), so a native bridge is a thin JSON layer.
import type { Authenticator, AuthenticatorAccount, AuthenticatorChange, AuthenticatorTransaction } from '../auth/authenticator';
import { AuthenticatorError } from '../auth/authenticator';
import { VaultError, type VaultAccount, type VaultCapability, type VaultCredential } from './vaultCapability';

export interface PhoneAccount {
  address: string;
  name?: string;
}

/** What the native key manager reports when the person cancels or fails the biometric prompt. */
export type PhoneAuthErrorCode = 'cancelled' | 'failed' | 'locked_out' | 'unavailable';

export class PhoneAuthError extends Error {
  readonly code: PhoneAuthErrorCode;
  /** For 'locked_out': how long until the device accepts another try. */
  readonly retryAfterMs?: number;
  constructor(code: PhoneAuthErrorCode, message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'PhoneAuthError';
    this.code = code;
    this.retryAfterMs = retryAfterMs;
  }
}

/** The ONE interface native code implements. Every secret stays inside it. */
export interface PhoneKeyManager {
  /** 'ios', 'android', ...: for the words on the screens. */
  readonly platform: string;
  /** True when the biometric / device passcode can be used right now. */
  isAvailable(): Promise<boolean>;
  /** True once a wallet exists on this device. */
  isSetUp(): Promise<boolean>;
  /** Generate the wallet inside the secure element. The recovery phrase, when the platform allows one, is returned ONCE here and never again. */
  setUp(): Promise<{ recoveryPhrase?: string; accounts: PhoneAccount[] }>;
  /** Show the biometric (or passcode) prompt with this reason. Resolves when the person passed it; throws PhoneAuthError otherwise. Opens the manager for signing. */
  authenticate(reason: string): Promise<void>;
  isUnlocked(): boolean;
  lock(): void;
  accounts(): PhoneAccount[];
  addAccount(name?: string): Promise<PhoneAccount>;
  /** Sign inside the secure element. Throws PhoneAuthError('cancelled') if the person declines. */
  signMessage(address: string, message: string): Promise<string>;
  /** Sign a transaction inside the secure element; returns the RAW signed transaction (the app broadcasts it). */
  signTransaction(tx: AuthenticatorTransaction): Promise<string>;
  /** Remove the wallet from the device (the manager asks for the biometric itself). Irreversible. */
  deleteWallet(): Promise<void>;
  /** Lock / unlock / accounts changed announcements (an app going to the background locks it). */
  onChange(listener: () => void): () => void;
}

const toVaultAccount = (a: PhoneAccount): VaultAccount => ({ address: a.address, name: a.name ?? '', source: 'generated', devOrigin: false });

function authToVaultError(error: unknown): never {
  if (error instanceof VaultError) throw error;
  if (error instanceof PhoneAuthError) {
    if (error.code === 'locked_out') throw new VaultError('locked_out', error.message || 'Too many failed attempts. Try again later.', error.retryAfterMs);
    if (error.code === 'failed') throw new VaultError('wrong_credential', error.message || 'That did not match.');
    if (error.code === 'unavailable') throw new VaultError('unsupported', error.message || 'Biometric unlock is not available on this device.');
    throw new VaultError('locked', error.message || 'Unlock was cancelled.');
  }
  throw error instanceof Error ? error : new Error(String(error));
}

/** The phone's key manager as a VaultCapability. The credential is always a biometric / device unlock: the manager shows the prompt, so the credential's value is ignored. */
export function createPhoneVault(manager: PhoneKeyManager): VaultCapability {
  const biometric = (credential: VaultCredential) => {
    if (credential.kind !== 'biometric') throw new VaultError('unsupported', 'A phone wallet opens with Face ID, a fingerprint or the device passcode.');
  };
  return {
    label: 'this phone',
    capabilities: { create: true, importPhrase: false, importKey: false, backup: false, changeCredential: false, delete: true, revealKey: false, revealPhrase: false, biometric: true },
    hasWallet: () => manager.isSetUp(),
    isUnlocked: () => manager.isUnlocked(),
    async create(credential) {
      biometric(credential);
      if (await manager.isSetUp()) throw new VaultError('already_set_up', 'A wallet already exists on this phone.');
      try {
        await manager.authenticate('Create your wallet');
        const made = await manager.setUp();
        return { recoveryPhrase: made.recoveryPhrase ?? '', accounts: made.accounts.map(toVaultAccount) };
      } catch (error) {
        return authToVaultError(error);
      }
    },
    async importPhrase() { throw new VaultError('unsupported', 'A phone wallet cannot be set up from a recovery phrase here.'); },
    async importKey() { throw new VaultError('unsupported', 'A phone wallet keeps its keys inside the secure element: importing a key is not possible.'); },
    async addAccount(name) {
      if (!manager.isUnlocked()) throw new VaultError('locked', 'The wallet is locked.');
      try {
        return toVaultAccount(await manager.addAccount(name));
      } catch (error) {
        return authToVaultError(error);
      }
    },
    async setActive() { /* the active account is the wallet's own, not the phone's */ },
    activeAddress: () => undefined,
    async unlock(credential) {
      biometric(credential);
      if (!(await manager.isSetUp())) throw new VaultError('not_set_up', 'No wallet has been set up on this phone yet.');
      try {
        await manager.authenticate('Unlock your wallet');
      } catch (error) {
        authToVaultError(error);
      }
    },
    lock: () => manager.lock(),
    accounts: () => (manager.isUnlocked() ? manager.accounts().map(toVaultAccount) : []),
    async changeCredential() { throw new VaultError('unsupported', 'There is no wallet password on a phone: the unlock is the device biometric or passcode.'); },
    async deleteWallet(credential) {
      biometric(credential);
      try {
        await manager.authenticate('Delete your wallet from this phone');
        await manager.deleteWallet();
      } catch (error) {
        authToVaultError(error);
      }
    },
    async exportBackup() { throw new VaultError('unsupported', 'A phone wallet cannot be exported to a file: its keys never leave the secure element.'); },
    async importBackup() { throw new VaultError('unsupported', 'A phone wallet cannot be restored from a file here.'); },
    async revealPrivateKey() { throw new VaultError('unsupported', 'A phone wallet cannot show a private key: it never leaves the secure element.'); },
    async revealRecoveryPhrase() { throw new VaultError('unsupported', 'The recovery phrase was shown once, when the wallet was created.'); },
    onChange: (listener) => manager.onChange(listener),
  };
}

export interface PhoneAuthenticatorOptions {
  /** Sends a raw signed transaction to the chain and returns its hash (the app's own RPC call; the key manager never talks to the network). */
  broadcast(rawTransaction: string, chainId: number): Promise<string>;
}

/** The phone's key manager as an Authenticator ('deviceVault'). Every signature is behind the key manager's own approval; a locked wallet is an error, not a silent unlock. */
export function createPhoneAuthenticator(manager: PhoneKeyManager, options: PhoneAuthenticatorOptions): Authenticator {
  const vault = createPhoneVault(manager);
  const ensureKnown = (address: string) => {
    const key = String(address ?? '').toLowerCase();
    if (!manager.accounts().some((a) => a.address.toLowerCase() === key)) throw new AuthenticatorError('unauthorized', `${address} is not an account of this phone's wallet.`, 'deviceVault');
  };
  const guard = async <T>(run: () => Promise<T>): Promise<T> => {
    if (!manager.isUnlocked()) throw new AuthenticatorError('locked', 'The wallet is locked. Unlock it with Face ID, a fingerprint or the device passcode.', 'deviceVault');
    try {
      return await run();
    } catch (error) {
      if (error instanceof AuthenticatorError) throw error;
      if (error instanceof PhoneAuthError) throw new AuthenticatorError(error.code === 'cancelled' ? 'user_rejected' : 'locked', error.message, 'deviceVault');
      throw error;
    }
  };
  return {
    id: 'deviceVault',
    label: 'This phone',
    capabilities: { signMessage: true, signTypedData: false, sendTransaction: true, listAccounts: true, createAccount: true, importKey: false, lock: true },
    vault,
    async status() {
      return { available: await manager.isAvailable(), unlocked: manager.isUnlocked() };
    },
    async accounts(): Promise<AuthenticatorAccount[]> {
      return manager.isUnlocked() ? manager.accounts().map((a) => ({ address: a.address, name: a.name, source: 'deviceVault' })) : [];
    },
    async signMessage(address, message) {
      return guard(async () => {
        ensureKnown(address);
        return manager.signMessage(address, message);
      });
    },
    async sendTransaction(tx: AuthenticatorTransaction) {
      return guard(async () => {
        ensureKnown(tx.from);
        const raw = await manager.signTransaction(tx);
        return { hash: await options.broadcast(raw, tx.chainId) };
      });
    },
    onChange(listener: (change: AuthenticatorChange) => void) {
      return manager.onChange(() => listener(manager.isUnlocked() ? 'unlock' : 'lock'));
    },
  };
}
