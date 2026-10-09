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
/** Turns whatever a host read from storage into a valid config (unknown or missing fields fall back to the defaults). */
export declare function sanitizeWalletConfig(value: unknown): MeritWalletConfigState;
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
