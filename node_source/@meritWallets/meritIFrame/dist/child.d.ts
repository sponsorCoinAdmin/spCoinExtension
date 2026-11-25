import { type FrameAction, type FrameActionPayloads, type FrameInit, type Json } from './protocol';
import { type HostInjectables } from './injectables';
export interface AwaitParentInitOptions {
    /** The parent pages allowed to embed this wallet, by origin (for example http://localhost:3101). */
    allowedParentOrigins: readonly string[];
    /** How long to wait for an answer (ms). Default 3000. */
    timeoutMs?: number;
}
/** The wallet's line to its parent after the handshake. */
export interface FrameBridge {
    /** Ask the parent to do something. Resolves when it has; rejects with the parent's reason (or when it does not answer in `timeoutMs`, default 5000). */
    request<A extends FrameAction>(action: A, payload: FrameActionPayloads[A], timeoutMs?: number): Promise<void>;
    /** Call a function the host registered by name, with plain-data arguments; resolves the host's answer. */
    call(name: string, args: Json[], timeoutMs?: number): Promise<Json | undefined>;
    dispose(): void;
}
export interface FrameParent {
    init: FrameInit;
    bridge: FrameBridge;
}
/**
 * Not framed, or the parent is not allowed, or it does not answer in time: resolves undefined and the wallet runs on its own, exactly as it always did.
 * Framed by an allowed parent: resolves the injected data and a bridge, after telling the parent it is ready.
 */
export declare function awaitParentInit({ allowedParentOrigins, timeoutMs }: AwaitParentInitOptions): Promise<FrameParent | undefined>;
/**
 * The two device actions a framed wallet sends to its parent instead of doing itself, shaped like the wallet's platform interface (copyText, openUrl). The wallet app spreads these over its own platform:
 * { ...domPlatform, ...framePlatformOverrides(bridge) }. The frame package does not import the wallet, so the shapes are matched here structurally.
 */
export declare function framePlatformOverrides(bridge: FrameBridge): {
    copyText(text: string): Promise<void>;
    openUrl(url: string, options?: {
        sameTab?: boolean;
    }): void;
};
/**
 * The injectables a framed wallet receives: the type and settings the parent injected, a stub for each host function the parent registered (each asks the parent and resolves its answer), and copyText, openUrl and close as the bridge's requests.
 * The wallet gets the same HostInjectables shape it would get from a host that mounts it in its own page.
 */
export declare function injectablesFromParent(parent: FrameParent): HostInjectables;
