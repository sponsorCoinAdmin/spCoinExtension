import type { Json, FrameInit } from './protocol';
export type { Json } from './protocol';
/** A function the host provides. Arguments and the result are plain data (a result of nothing is allowed). */
export type InjectedFunction = (...args: Json[]) => Json | void | Promise<Json | void>;
/** What a host injects into the wallet, the same object for either mount. */
export interface HostInjectables {
    /** The Merit type to show (EXT, WEB_APP, WEB, ANDROID, IPHONE). Omitted: WEB. */
    walletType?: string;
    /** Plain-data settings (for example chains or display defaults). */
    settings?: Record<string, Json>;
    /** Host functions by name. copyText(text), openUrl(url, { sameTab }) and close() are the ones the wallet's platform uses; any other name is called through `call`. */
    functions?: Record<string, InjectedFunction>;
}
/** The functions that have their own request in the protocol. */
export declare const WELL_KNOWN_FUNCTIONS: readonly ['copyText', 'openUrl', 'close'];
/** The names of the host's other functions: the ones the wallet reaches through `call`. */
export declare function customFunctionNames(functions: Record<string, unknown> | undefined): string[];
/**
 * The injectables a FRAMED wallet sees: the type and settings the parent sent, a stub for each custom function name (each calls the parent and resolves its answer), and the well-known stubs the wallet's bridge supplies.
 * `call` is how a stub reaches the parent; `wellKnown` are the copy, open and close stubs.
 */
export declare function buildInjectables(init: Pick<FrameInit, 'walletType' | 'settings' | 'functionNames'>, call: (name: string, args: Json[]) => Promise<Json | undefined>, wellKnown?: Partial<Record<(typeof WELL_KNOWN_FUNCTIONS)[number], InjectedFunction>>): HostInjectables;
/** The injectables with the wallet type set by a host shell: whatever type the caller passed is replaced (a shell is one Merit type). Pure. */
export declare function withWalletType(injectables: Omit<HostInjectables, 'walletType'> | undefined, walletType: string): HostInjectables;
