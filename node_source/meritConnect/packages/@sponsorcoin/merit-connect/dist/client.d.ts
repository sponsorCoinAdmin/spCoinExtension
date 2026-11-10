import { type Reply, type Side } from './protocol.js';
import { type TraceFn } from './trace.js';
/** How a host asks the other wallet: the relay's `request`, reached however the host reaches it. Always resolves with a reply. */
export type RequestFn = (method: string, params: unknown, rid: string) => Promise<Reply>;
export interface LinkState {
    /** The other wallet answers and the person has not disconnected it. */
    connected: boolean;
    loggedOn: boolean;
    detached: boolean;
}
export interface SideConfig {
    request: RequestFn;
    /** The link as it reads now. It reads "not connected" until its first answer comes back. */
    link(): LinkState;
    /** Called when the link comes up or goes down. Returns the unsubscribe function. */
    subscribeLink(listener: () => void): () => void;
    /** The copy of the other wallet's shared accounts that this wallet keeps. */
    getShared(): Promise<string[]> | string[];
    setShared(accounts: string[]): Promise<void> | void;
    /**
     * 2026-11-06 (owner rule): the accounts of the other wallet that this wallet KEEPS in its list but has disconnected. When the caller changes an account's state the account stays listed and only its state changes; only the OTHER wallet
     * (by disconnecting it there) removes an account from this list. A host that does not keep such a list leaves these out: a disconnect then removes the account, as before.
     */
    getDisconnected?(): Promise<string[]> | string[];
    setDisconnected?(accounts: string[]): Promise<void> | void;
    newRid(): string;
    setTimer(fn: () => void, ms: number): unknown;
    clearTimer(handle: unknown): void;
    now(): number;
    trace?: TraceFn;
    /** 2026-11-06 (owner): a message for the person when the OTHER wallet took accounts out of this list ("Disconnected by Remote", "Account Does not Exist on ..., Removed from Local"). The host shows it as a notice. */
    notify?(message: string, addresses: string[]): void;
}
export interface Connections {
    side: Side;
    connected: boolean;
    loggedOn: boolean;
    detached: boolean;
    shared: string[];
}
export interface HandshakeResult {
    /** The copy was different and was replaced. */
    changed: boolean;
    /** The accounts connected here and there after the handshake. */
    shared: string[];
    /** Accounts kept in the list but disconnected here (empty when the host keeps no such list). */
    disconnected?: string[];
    /** Why no answer was asked for (the stored copy was kept). */
    skipped?: string;
}
/** How long a list that loads while the link still reads "not connected" waits for the link before it shows what it has. */
export declare const LINK_WAIT_MS = 1500;
/** How long the handshake waits for the other wallet's answer. */
export declare const HANDSHAKE_MS = 2500;
/** A handshake asked this recently is not asked again (the list loads often). */
export declare const HANDSHAKE_MIN_GAP_MS = 1500;
/** One account of the other wallet as this wallet lists it: connected or disconnected (kept, not removed). */
export interface ListedAccount {
    address: string;
    connected: boolean;
}
/** The standard calls, for the sides this host can reach. A side that was not configured throws 4900. */
export declare function createMeritConnect(sides: Partial<Record<Side, SideConfig>>): {
    fetchMeritConnections: (side: Side, options?: {
        refresh?: boolean;
    }) => Promise<Connections>;
    requestAccounts: (side: Side) => Promise<string[]>;
    /** Connect this wallet to the other: its own Connect page (Cancel / Connect), no accounts. */
    requestConnection: (side: Side) => Promise<void>;
    handshake: (side: Side, options?: {
        force?: boolean;
    }) => Promise<HandshakeResult>;
    revoke: (side: Side) => Promise<void>;
    /** Connect or disconnect ONE account from this wallet (a disconnected account stays in the list). */
    setAccountConnected: (side: Side, address: string, connected: boolean) => Promise<void>;
    /** Remove ONE account of the other wallet from this wallet's list (the other wallet is told to disconnect it first and keeps the account). */
    forgetAccount: (side: Side, address: string) => Promise<void>;
    /** The accounts as this wallet lists them, each connected or disconnected. */
    listAccounts: (side: Side) => Promise<ListedAccount[]>;
    /** The link to that side came up or went down: the host re-runs its list load (which runs the handshake). */
    onConnectionChange: (side: Side, listener: () => void) => () => void;
};
export type MeritConnect = ReturnType<typeof createMeritConnect>;
