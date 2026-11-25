import { type WalletFrameConnection } from './parent';
import { type HostInjectables } from './injectables';
import { type FrameMessage } from './protocol';
export interface MountMeritIFrameOptions {
    /** Where the frame goes. */
    element: HTMLElement;
    /** The wallet page's address: absolute (https://sponsorcoin.org/) or relative to this page. */
    walletUrl: string;
    /** What the host injects: the same object meritWeb's mount takes. */
    injectables?: HostInjectables;
    /** Frame size (CSS). Default: fills its element. */
    width?: string;
    height?: string;
    /** Every accepted message and every answered request, for the host page's own log. */
    onMessage?: (message: FrameMessage) => void;
    onRequest?: (action: string, ok: boolean, error?: string) => void;
}
export interface MeritIFrameMount extends WalletFrameConnection {
    frame: HTMLIFrameElement;
}
export declare function mountMeritIFrame({ element, walletUrl, injectables, width, height, onMessage, onRequest }: MountMeritIFrameOptions): MeritIFrameMount;
