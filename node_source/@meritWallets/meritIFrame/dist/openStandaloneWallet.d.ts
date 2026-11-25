export declare const STANDALONE_WALLET_URL = "http://localhost:3100/";
export declare const STANDALONE_WALLET_WINDOW = "spcoin-standalone-wallet";
export interface StandaloneWalletOptions {
    /** Where the wallet app is served. Default: the spcoin-wallet dev app. */
    url?: string;
    width?: number;
    height?: number;
}
/** Open the wallet in its own popup window (or focus the one already open). Returns the window, or null when the browser blocked it. */
export declare function openStandaloneWallet({ url, width, height }?: StandaloneWalletOptions): Window | null;
export interface WalletFrameOptions {
    url?: string;
    /** Where to put the frame. */
    parent: HTMLElement;
    width?: string;
    height?: string;
}
export interface WalletFrameHandle {
    frame: HTMLIFrameElement;
    /** Remove the frame. */
    dispose(): void;
}
/** The wallet inline, in an iframe of its own origin (no sandbox escape: it keeps its own storage). */
export declare function createWalletFrame({ url, parent, width, height }: WalletFrameOptions): WalletFrameHandle;
