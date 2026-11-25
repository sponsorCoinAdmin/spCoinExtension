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
