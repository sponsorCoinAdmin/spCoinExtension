export type WalletSessionPhase = 'checking' | 'setup' | 'locked' | 'unlocked';
/** The value the Merit Wallet component's passwordMode prop takes. */
export type WalletPasswordMode = 'checking' | 'setup' | 'unlock';
export declare const MIN_WALLET_PASSWORD_LENGTH = 8;
export interface WalletSessionStatus {
    initialized: boolean;
    unlocked: boolean;
}
export interface WalletSessionAdapter {
    /** The current state, or null when it cannot be read yet. */
    status(): Promise<WalletSessionStatus | null>;
    /** Create the wallet under `password` and leave it unlocked. A host that has a Secret Recovery Phrase returns it here, to be shown once. */
    create(password: string): Promise<{
        recoveryPhrase?: string;
    } | void>;
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
export declare function passwordModeFor(phase: WalletSessionPhase): WalletPasswordMode;
export declare function phaseFromStatus(status: WalletSessionStatus | null): WalletSessionPhase;
export type PasswordSubmitResult = {
    ok: true;
    recoveryPhrase?: string;
} | {
    ok: false;
    error: string;
};
/**
 * The password screen's submit, without any host state: validates, then calls the adapter. Used directly by a host that keeps its own busy and
 * error state (the web app), and by the controller below.
 */
export declare function submitWalletPassword(phase: WalletSessionPhase, adapter: Pick<WalletSessionAdapter, 'create' | 'unlock'>, password: string, confirmPassword: string): Promise<PasswordSubmitResult>;
export interface WalletSessionController {
    getState: () => WalletSessionState;
    /** Re-read the status from the adapter (call on mount, and when the host is told the wallet locked or unlocked). */
    refresh: () => Promise<void>;
    submit: (password: string, confirmPassword: string) => Promise<void>;
    lock: () => Promise<void>;
    dismissRecoveryPhrase: () => void;
}
export declare function createWalletSession(adapter: WalletSessionAdapter, onChange?: () => void): WalletSessionController;
