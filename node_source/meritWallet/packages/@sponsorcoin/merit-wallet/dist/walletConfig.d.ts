import type { MeritWalletPasswordMode, ApplicationSyncMode, MeritWalletLocation, MeritExtensionChannel } from '@sponsorcoin/spcoin-panels';
export interface MeritWalletConfigState {
    passwordMode: MeritWalletPasswordMode;
    mandatorySecurity: boolean;
    mandatoryApproval: boolean;
    syncMode: ApplicationSyncMode;
    location: MeritWalletLocation;
    showBackgroundPage: boolean;
    modalMode: boolean;
    extensionChannel: MeritExtensionChannel;
    /** How long a persisted password stays valid without being used, in hours (minimum 1 minute, maximum 24 hours). */
    persistedPasswordTimeoutHours: number;
}
/** The defaults the web app starts a fresh wallet with (components/wallet/lib/meritWalletStorage.ts DEFAULT_MERIT_WALLET_LS.config). */
export declare const DEFAULT_WALLET_CONFIG: MeritWalletConfigState;
/** The persisted-password time limit in hours, kept between 1 minute and 24 hours; a value that is not a finite number is 1 hour. The ONE clamp: the Config picker, the stored config, the persisted password and the idle timer all call it (docs/meritMigration.txt row 21). */
export declare function clampPersistedPasswordTimeoutHours(hours: number): number;
/** The idle limit in milliseconds for a time limit in hours: whole minutes, never under one minute or over 24 hours (docs/meritMigration.txt row 24: the web's idle timer, now the one rule). */
export declare function persistedTimeoutMs(hours: number): number;
/** True when the wallet has been idle for at least its time limit and should lock. */
export declare function isIdleLockDue(msSinceLastUse: number, hours: number): boolean;
/** Turns whatever a host read from storage into a valid config (unknown or missing fields fall back to the defaults). */
export declare function sanitizeWalletConfig(value: unknown): MeritWalletConfigState;
/** What the web app keeps under its one storage key: whether the wallet is open, and its config. */
export interface MeritWalletStored {
    active: boolean;
    config: MeritWalletConfigState;
}
/** The stored text (the web app's localStorage value, null when nothing is saved) as a valid record: nothing saved, not JSON or not an object gives the defaults; a field that is missing or invalid takes its default. */
export declare function parseMeritWalletStored(text: string | null | undefined): MeritWalletStored;
export declare function passwordDescriptionFor(mode: MeritWalletPasswordMode): string;
export declare function syncDescriptionFor(mode: ApplicationSyncMode): string;
export declare function extensionDownloadPathFor(channel: MeritExtensionChannel): string;
export interface WalletConfigAdapter {
    /** The persisted config right now. */
    read: () => MeritWalletConfigState;
    /** Persist a change. May be async; the controller does not wait for it (the in-memory state updates first). */
    write: (patch: Partial<MeritWalletConfigState>) => void | Promise<void>;
    /** Host side effects of a change, run after the write (the web app's password-cache handling and window event). */
    onChange?: (patch: Partial<MeritWalletConfigState>, next: MeritWalletConfigState) => void;
}
export interface WalletConfigController {
    getState: () => MeritWalletConfigState;
    /** Apply a change: update state, persist it, run the host's side effects, then notify. */
    set: (patch: Partial<MeritWalletConfigState>) => void;
    /** Re-read the persisted config (e.g. after another tab changed it) and notify. */
    reload: () => void;
}
/** Framework-free config controller. onChange fires after every state change (the host re-renders from getState()). */
export declare function createWalletConfig(adapter: WalletConfigAdapter, onChange?: () => void): WalletConfigController;
/** React form for component hosts. The adapter is read through a ref, so it may be a new object on every render. */
export declare function useWalletConfig(adapter: WalletConfigAdapter): {
    state: MeritWalletConfigState;
    set: (patch: Partial<MeritWalletConfigState>) => void;
};
