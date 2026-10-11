import type { AuthenticatorId } from '../auth/authenticator';
import type { Wallet } from './wallet';
export type WalletLockPhase = 'checking' | 'none' | 'setup' | 'locked' | 'unlocked';
export interface WalletLockState {
    phase: WalletLockPhase;
    submitting: boolean;
    error?: string;
    /** Where the keys live, for the screen's words ('this device', 'this browser', 'the dev server'). */
    where?: string;
    /** The key-keeping backend that decides the lock (the dev keystore, the extension vault, the browser vault, a phone). */
    backendId?: AuthenticatorId;
}
export interface WalletLockStore {
    getState(): WalletLockState;
    subscribe(listener: () => void): () => void;
    /** Re-reads the primary vault's state (called on every wallet change; also callable by a host). */
    refresh(): Promise<void>;
    /** Unlock with the wallet password. Never throws: a failure becomes `error` in the state. */
    submit(password: string): Promise<boolean>;
    /** Lock the primary vault. */
    lock(): Promise<void>;
    /** Stop listening to the wallet. */
    dispose(): void;
}
/** The wording for each way an unlock can fail (the same words in every host). */
export declare function unlockErrorText(error: unknown): string;
export declare function createWalletLockStore(wallet: Wallet): WalletLockStore;
