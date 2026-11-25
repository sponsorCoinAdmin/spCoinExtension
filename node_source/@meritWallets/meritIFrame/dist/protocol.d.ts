export declare const FRAME_PROTOCOL = "merit-frame";
export declare const FRAME_VERSION = 1;
/** The wallet types, as plain strings (the wallet package's MeritWalletType enum has the same values). The frame package does not import the wallet. */
export type FrameWalletType = 'EXT' | 'WEB_APP' | 'WEB' | 'ANDROID' | 'IPHONE';
/** Plain data: the only thing that crosses a frame. */
export type Json = null | boolean | number | string | Json[] | {
    [key: string]: Json;
};
/** What the parent injects: data only. Functions the host provides are NOT sent: only their names (functionNames); the wallet gets a stub for each that asks the parent through the `call` action. */
export interface FrameInit {
    walletType: FrameWalletType;
    /** Plain-data settings the host injects (chains, display defaults, ...). */
    settings?: Record<string, Json>;
    /** The names of the host functions the wallet may call through `call` (never copyText, openUrl, close or resize: those have their own actions). */
    functionNames?: string[];
}
/** What the wallet may ask of its parent. */
export interface FrameActionPayloads {
    /** Put text on the clipboard (the parent's clipboard permission, not the frame's). */
    copyText: {
        text: string;
    };
    /** Open an address: http(s) or mailto only. */
    openUrl: {
        url: string;
        sameTab?: boolean;
    };
    /** The wallet wants to be closed (its close button). */
    close: Record<string, never>;
    /** The wallet wants the frame to be this big (px). */
    resize: {
        width?: number;
        height?: number;
    };
    /** The wallet calls a function the host registered, by name, with plain-data arguments. The answer (plain data) comes back in the response. */
    call: {
        name: string;
        args: Json[];
    };
}
export type FrameAction = keyof FrameActionPayloads;
export declare const FRAME_ACTIONS: readonly FrameAction[];
interface Envelope {
    protocol: typeof FRAME_PROTOCOL;
    version: number;
}
export type ChildMessage = (Envelope & {
    kind: 'hello';
}) | (Envelope & {
    kind: 'ready';
}) | (Envelope & {
    kind: 'request';
    id: number;
    action: string;
    payload: unknown;
});
export type ParentMessage = (Envelope & {
    kind: 'init';
    init: FrameInit;
}) | (Envelope & {
    kind: 'response';
    id: number;
    ok: boolean;
    error?: string;
    result?: Json;
});
export type FrameMessage = ChildMessage | ParentMessage;
export declare function frameMessage<T extends {
    kind: string;
}>(body: T): Envelope & T;
/** True when `data` is one of this protocol's messages (the shape only; the caller has already checked who sent it). */
export declare function isFrameMessage(data: unknown): data is FrameMessage;
/** The page address of the wallet in embedded mode: the same app, asked to wait for its parent. */
export declare function embedUrl(url: string): string;
/** A host function's name: letters, digits and underscores, starting with a letter. The four actions that have their own request are not callable by name. */
export declare const CALL_NAME: RegExp;
export declare const RESERVED_CALL_NAMES: readonly string[];
export declare const MAX_CALL_ARGS = 16;
export declare const MAX_CALL_JSON = 100000;
/** Is this request one the parent may act on? Returns the reason it is not, or undefined when it is fine. Pure: the same checks run in the parent and in the tests. */
export declare function validateRequest(action: string, payload: unknown): string | undefined;
export {};
