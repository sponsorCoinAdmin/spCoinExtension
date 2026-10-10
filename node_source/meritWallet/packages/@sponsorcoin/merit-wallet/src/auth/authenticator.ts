// File: src/auth/authenticator.ts
//
// 2026-10-09 (docs/authenticationDesign.txt row 3, docs/nodeSourceMigrationPlan.txt row 6) -- the AUTHENTICATOR interface: what the wallet asks of anything that can sign for an account. One interface, many
// implementations (a server keystore, the extension vault, an injected wallet such as MetaMask or the Merit extension, a hardware device); the wallet only ever calls this interface. The implementations are small
// adapters supplied by the host that has them and registered once at boot; the registry and the resolver (resolve.ts) live here in the package. This file is types and the one error class: no behaviour.
// Modelled on MetaMask's KeyringController / ApprovalController and on this package's existing hostContract (MeritWalletApi).

/** 'serverKeystore' (the web app's server keystore), 'localVault' (the extension vault), 'injected:<rdns>' (an EIP-6963 wallet), 'hardware:<kind>'. */
export type AuthenticatorId = 'serverKeystore' | 'localVault' | `injected:${string}` | `hardware:${string}`;

export interface AuthenticatorCapabilities {
  signMessage: boolean;
  signTypedData: boolean;
  sendTransaction: boolean;
  listAccounts: boolean;
  createAccount: boolean;
  importKey: boolean;
  lock: boolean;
}

export interface AuthenticatorAccount {
  address: string;
  name?: string;
  /** Where the account came from (the Add menu entry that created or connected it), if known. */
  source?: string;
}

export interface AuthenticatorStatus {
  /** Installed / reachable. */
  available: boolean;
  /** Ready to sign without asking for a password first. */
  unlocked: boolean;
}

export interface AuthenticatorTransaction {
  from: string;
  to?: string;
  value?: bigint;
  data?: string;
  chainId: number;
}

export type AuthenticatorChange = 'lock' | 'unlock' | 'accountsChanged' | 'chainChanged' | 'availability';

/** The one error set every authenticator reports in (foreign errors are translated into these by the adapter). */
export type AuthenticatorErrorCode = 'user_rejected' | 'locked' | 'unauthorized' | 'unsupported' | 'unreachable' | 'wrong_chain';

export class AuthenticatorError extends Error {
  readonly code: AuthenticatorErrorCode;
  readonly authenticatorId: string | undefined;
  constructor(code: AuthenticatorErrorCode, message: string, authenticatorId?: string) {
    super(message);
    this.name = 'AuthenticatorError';
    this.code = code;
    this.authenticatorId = authenticatorId;
  }
}

export interface Authenticator {
  readonly id: AuthenticatorId;
  /** For the account list and the Add menu. */
  readonly label: string;
  readonly icon?: string;
  readonly capabilities: AuthenticatorCapabilities;
  status(): Promise<AuthenticatorStatus>;
  /** The accounts this authenticator can sign for. */
  accounts(): Promise<AuthenticatorAccount[]>;
  /** Ask the user to connect (remote ones: the wallet's own connect popup). */
  connect?(): Promise<AuthenticatorAccount[]>;
  /** Optional: give up whatever permission connect() was granted (MetaMask: revoke the page's access). Never touches keys or the wallet's account list. */
  disconnect?(): Promise<void>;
  /** Always behind this authenticator's own approval. */
  signMessage(address: string, message: string): Promise<string>;
  signTypedData?(address: string, typedData: unknown): Promise<string>;
  sendTransaction(tx: AuthenticatorTransaction): Promise<{ hash: string }>;
  /** Lock / unlock / accountsChanged / chainChanged / availability. Returns the unsubscribe function. */
  onChange(listener: (change: AuthenticatorChange) => void): () => void;
}

/** What the wallet knows about an account that matters for choosing its authenticator. */
export interface AccountAuthenticatorRef {
  address: string;
  /** The user's saved choice of active authenticator. */
  activeAuthenticator?: AuthenticatorId;
  /** The source the account came from (the Add menu entry that created or connected it). */
  sourceAuthenticator?: AuthenticatorId;
}

/** Short names for the badge next to an account (Merit Wallet, Extension, MetaMask, Hardware). */
export function authenticatorBadge(id: string): string {
  if (id === 'serverKeystore') return 'Merit Wallet';
  if (id === 'localVault') return 'Extension';
  if (id.startsWith('hardware:')) return 'Hardware';
  if (id === 'injected:io.metamask') return 'MetaMask';
  if (id === 'injected:org.sponsorcoin.merit') return 'Extension';
  if (id.startsWith('injected:')) return id.slice('injected:'.length);
  return id;
}
