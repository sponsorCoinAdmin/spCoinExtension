import { type FrameAction, type FrameActionPayloads, type FrameInit, type FrameMessage } from './protocol';
import type { InjectedFunction } from './injectables';
export interface WalletFrameConnection {
    /** Resolves when the wallet has received the injected data and says it is ready. */
    ready: Promise<void>;
    /** Stop listening. */
    dispose(): void;
}
/** What the parent does for each action the wallet may ask. Leave one out and that action is refused. */
export type FrameHandlers = {
    [A in FrameAction]?: (payload: FrameActionPayloads[A]) => void | Promise<void>;
};
export interface ConnectWalletFrameOptions {
    frame: HTMLIFrameElement;
    /** The wallet's origin (scheme, host and port), for example http://localhost:3100. Messages from any other origin are ignored. */
    walletOrigin: string;
    /** What to inject. Called on every hello, so a changed value reaches a reloaded wallet. */
    init: () => FrameInit;
    /** The actions the parent performs for the wallet. */
    handlers?: FrameHandlers;
    /** The host functions the wallet may call by name through the `call` action. A name that is not here is refused. */
    functions?: Record<string, InjectedFunction>;
    /** Every accepted message, for the host page's own log. */
    onMessage?: (message: FrameMessage) => void;
    /** Every request answered, for the host page's own log. */
    onRequest?: (action: string, ok: boolean, error?: string) => void;
}
/** Handlers for the two actions every web parent can do the same way: copy and open. close and resize depend on the page and are left to the host. */
export declare function defaultFrameHandlers(): Pick<FrameHandlers, 'copyText' | 'openUrl'>;
export declare function connectWalletFrame({ frame, walletOrigin, init, handlers, functions, onMessage, onRequest }: ConnectWalletFrameOptions): WalletFrameConnection;
