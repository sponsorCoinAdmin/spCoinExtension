// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/session/walletSession.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, S3c / table row 15) -- the unlock / lock gate over the wallet API, shared by both apps. MetaMask
// shape (KeyringController): the wallet is in one of four phases -- checking (state not known yet), setup (no wallet yet: choose a password),
// locked (a wallet exists: enter the password), unlocked. This module owns the rules that used to be written twice (the web app's inline handlers
// in MeritWallet.tsx and the extension's per-account prompt): password length and match, the "Incorrect password." message, busy flag, and what
// the password screen shows. What differs per host is the ADAPTER: web = its keystore routes through walletState; extension = the vault in the
// background worker. No React in this file; useWalletSession (walletSessionReact.ts) is the hook.

export type WalletSessionPhase = 'checking' | 'setup' | 'locked' | 'unlocked';
/** The value the Merit Wallet component's passwordMode prop takes. */
export type WalletPasswordMode = 'checking' | 'setup' | 'unlock';

export const MIN_WALLET_PASSWORD_LENGTH = 8;

export interface WalletSessionStatus {
  initialized: boolean;
  unlocked: boolean;
}

export interface WalletSessionAdapter {
  /** The current state, or null when it cannot be read yet. */
  status(): Promise<WalletSessionStatus | null>;
  /** Create the wallet under `password` and leave it unlocked. A host that has a Secret Recovery Phrase returns it here, to be shown once. */
  create(password: string): Promise<{ recoveryPhrase?: string } | void>;
  /** Unlock with `password`; resolves false for a wrong password (throws only for real failures). */
  unlock(password: string): Promise<boolean>;
  lock?(): Promise<void>;
}

export interface WalletSessionState {
  phase: WalletSessionPhase;
  error: string;
  submitting: boolean;
  /** Set right after a wallet is created, until the user confirms they saved it. */
  recoveryPhrase?: string;
}

export function passwordModeFor(phase: WalletSessionPhase): WalletPasswordMode {
  return phase === 'checking' ? 'checking' : phase === 'setup' ? 'setup' : 'unlock';
}

export function phaseFromStatus(status: WalletSessionStatus | null): WalletSessionPhase {
  if (!status) return 'checking';
  if (!status.initialized) return 'setup';
  return status.unlocked ? 'unlocked' : 'locked';
}

export type PasswordSubmitResult = { ok: true; recoveryPhrase?: string } | { ok: false; error: string };

/**
 * The password screen's submit, without any host state: validates, then calls the adapter. Used directly by a host that keeps its own busy and
 * error state (the web app), and by the controller below.
 */
export async function submitWalletPassword(
  phase: WalletSessionPhase,
  adapter: Pick<WalletSessionAdapter, 'create' | 'unlock'>,
  password: string,
  confirmPassword: string,
): Promise<PasswordSubmitResult> {
  try {
    if (phase === 'setup') {
      if (password.length < MIN_WALLET_PASSWORD_LENGTH) return { ok: false, error: `Password must be at least ${MIN_WALLET_PASSWORD_LENGTH} characters.` };
      if (password !== confirmPassword) return { ok: false, error: 'Passwords do not match.' };
      const created = await adapter.create(password);
      return { ok: true, ...(created && created.recoveryPhrase ? { recoveryPhrase: created.recoveryPhrase } : {}) };
    }
    if (phase === 'locked') {
      if (!password) return { ok: false, error: 'Enter your password.' };
      return (await adapter.unlock(password)) ? { ok: true } : { ok: false, error: 'Incorrect password.' };
    }
    return { ok: false, error: 'The wallet is not ready for a password yet.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'The wallet could not complete that.' };
  }
}

export interface WalletSessionController {
  getState: () => WalletSessionState;
  /** Re-read the status from the adapter (call on mount, and when the host is told the wallet locked or unlocked). */
  refresh: () => Promise<void>;
  submit: (password: string, confirmPassword: string) => Promise<void>;
  lock: () => Promise<void>;
  dismissRecoveryPhrase: () => void;
}

export function createWalletSession(adapter: WalletSessionAdapter, onChange: () => void = () => undefined): WalletSessionController {
  let state: WalletSessionState = { phase: 'checking', error: '', submitting: false };
  const set = (patch: Partial<WalletSessionState>) => {
    state = { ...state, ...patch };
    onChange();
  };
  return {
    getState: () => state,
    async refresh() {
      try {
        set({ phase: phaseFromStatus(await adapter.status()) });
      } catch {
        set({ phase: 'checking' });
      }
    },
    async submit(password, confirmPassword) {
      if (state.submitting) return;
      set({ submitting: true, error: '' });
      const result = await submitWalletPassword(state.phase, adapter, password, confirmPassword);
      if (!result.ok) {
        set({ submitting: false, error: result.error });
        return;
      }
      // A new wallet keeps its recovery phrase until the user confirms; either way it is now unlocked.
      set({ submitting: false, phase: 'unlocked', error: '', ...(result.recoveryPhrase ? { recoveryPhrase: result.recoveryPhrase } : {}) });
    },
    async lock() {
      if (!adapter.lock) return;
      await adapter.lock();
      set({ phase: 'locked', error: '', recoveryPhrase: undefined });
    },
    dismissRecoveryPhrase() {
      set({ recoveryPhrase: undefined });
    },
  };
}
