import type { Authenticator } from './authenticator';
/** A wallet's id. A plain string here: a host may register a wallet the package has never heard of. */
type AuthenticatorId = string;
/** checking = a probe is out and has not answered yet (shown as not connected; never saved). */
export type ConnectionState = 'connected' | 'disconnected' | 'checking';
export interface ConnectionProbe {
    /** Ask the wallet now. true = connected. A throw or a timeout reads as not connected. */
    check(): boolean | Promise<boolean>;
    /** Call `refresh` whenever the wallet changes (accounts, lock, plug, peer). Returns the unsubscribe. */
    subscribe?(refresh: () => void): () => void;
}
export interface WalletConnections {
    /** The current states by wallet id. A new object after every change (so a hook can compare by identity). */
    get(): Readonly<Record<AuthenticatorId, ConnectionState>>;
    /** true / false, or undefined when no probe is registered for the wallet (the caller's default applies). */
    isConnected(id: AuthenticatorId): boolean | undefined;
    /** Ask one wallet (or all of them) again. Resolves when the answers are in. */
    refresh(id?: AuthenticatorId): Promise<void>;
    /** Add or replace a wallet's probe (a host that learns of a wallet later). */
    register(id: AuthenticatorId, probe: ConnectionProbe): void;
    subscribe(listener: () => void): () => void;
    /** Start listening (probes' subscriptions, the page's focus / visibility). Idempotent; returns nothing to undo: the store lives as long as the page. */
    start(): void;
}
export interface WalletConnectionsOptions {
    probes?: Record<AuthenticatorId, ConnectionProbe>;
    /** A probe that has not answered after this long reads not connected (default 4000 ms). */
    timeoutMs?: number;
    /** Where "the person came back to the page" is heard; a host without a window passes none. */
    onFocus?(refresh: () => void): () => void;
}
export declare function createWalletConnections(options?: WalletConnectionsOptions): WalletConnections;
/** The probe of a wallet that is an Authenticator: connected while it is available AND shares an account (the injected wallets: a real provider that answers eth_accounts, no popup). Its own change events trigger the next check. */
export declare function authenticatorProbe(authenticator: () => Authenticator | undefined): ConnectionProbe;
export {};
