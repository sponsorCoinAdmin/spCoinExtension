export type DebugValue = unknown;
export type DebugSectionProvider = () => DebugValue | Promise<DebugValue>;
/** The fixed order of the dump; a section a host did not register is printed as "(not provided)" so the two dumps always have the same lines. */
export declare const DEBUG_SECTIONS: readonly ["app", "device", "chain", "clock", "account", "rewards", "worker"];
/** A copy of `value` with every secret-looking field removed, and bigint / error values turned into text. Cycles are cut. */
export declare function redact(value: DebugValue, depth?: number, seen?: WeakSet<object>): DebugValue;
export interface DebugStore {
    log(who: string, what: string): void;
    error(kind: string, text: string): void;
    setSection(name: string, provider: DebugSectionProvider | undefined): void;
    clear(): void;
    buildDump(now?: number): Promise<string>;
    /** Changes every time something is logged (for a live view). */
    version(): number;
    subscribe(listener: () => void): () => void;
    /** Whether the ladybug is switched on; the persisted choice is read and written by the component through the platform's storage. */
    isEnabled(): boolean;
    setEnabled(next: boolean): void;
}
export declare function createDebugStore(clock?: () => number): DebugStore;
/** What every host tells the dump about itself, in the same keys in every app, so the lines compare directly. */
export interface HostDebugInfo {
    /** 'web' or 'extension' (or the name of another host). */
    app: string;
    /** The build or version the host is running (a commit, a package version). */
    build?: string;
    /** The server the app reads from (the hosted app's address, or 'none'). */
    server?: string;
    chainId?: number | string;
    rpcUrl?: string;
    /** The active spCoin contract. */
    contract?: string;
}
/** An address with only its host kept: a node address often carries the account's access key in its path or query, and a dump is meant to be pasted into chats. */
export declare function hideAddressSecrets(address: string | undefined): string;
/** Registers the 'app' and 'chain' sections from one getter the host keeps current (read when the dump is built). */
export declare function registerHostDebug(store: DebugStore, info: () => HostDebugInfo): void;
/** The wallet's one store (a page has one wallet). Tests make their own with createDebugStore. */
export declare const meritDebug: DebugStore;
