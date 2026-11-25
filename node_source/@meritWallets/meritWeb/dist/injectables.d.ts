/** A host function. Arguments and results are plain data when the wallet is framed. */
export type HostFunction = (...args: any[]) => unknown;
export interface MeritWebInjectables {
    /** The Merit type to show (EXT, WEB_APP, WEB, ANDROID, IPHONE). Omitted or unknown: WEB. */
    walletType?: string;
    /** Plain-data settings (for example chains or display defaults), for the page to use. */
    settings?: Record<string, unknown>;
    /** Host functions by name. copyText(text), openUrl(url, { sameTab }) and close() are the ones the wallet's platform uses. */
    functions?: Record<string, HostFunction>;
}
/** What the wallet component takes, derived from the injectables. */
export interface MountPieces {
    walletType?: string;
    platform?: {
        copyText?: (text: string) => Promise<void>;
        openUrl?: (url: string, options?: {
            sameTab?: boolean;
        }) => void;
    };
    onClose?: () => void;
}
export declare function mountPiecesFromInjectables(injectables: MeritWebInjectables | undefined): MountPieces;
/**
 * The injectables a device package hands to the wallet: its own defaults (what the device does for copy, open and close) with the app's own functions and settings laid over them, and the device's Merit type set (the app cannot change the type of the device it runs on).
 * Pure: no imports.
 */
export declare function mergeInjectables(base: MeritWebInjectables, extra: Omit<MeritWebInjectables, 'walletType'> | undefined, walletType: string): MeritWebInjectables;
