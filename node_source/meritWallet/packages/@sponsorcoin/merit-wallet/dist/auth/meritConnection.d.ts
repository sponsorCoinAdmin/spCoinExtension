import type { Authenticator } from './authenticator';
/** The part of a merit-connect client (createMeritConnect) this file uses. */
export interface MeritConnectionClient {
    handshake(side: never, options?: {
        force?: boolean;
    }): Promise<{
        shared: string[];
    }>;
    listAccounts(side: never): Promise<Array<{
        address: string;
        connected: boolean;
    }>>;
    setAccountConnected(side: never, address: string, connected: boolean): Promise<void>;
    requestAccounts(side: never): Promise<string[]>;
    /** The other wallet's Connect page (Cancel / Connect), no accounts. Absent: connect() opens the account selector, as before. */
    requestConnection?(side: never): Promise<void>;
    revoke(side: never): Promise<void>;
    onConnectionChange(side: never, listener: () => void): () => void;
}
export interface MeritConnectionOptions {
    /** The merit-connect client and the side it reaches ('EXT' or 'WEB_APP'). */
    client: MeritConnectionClient;
    side: string;
    /** Called when the kept lists changed behind this wallet's back (another tab, the worker): the account list reloads. Returns the unsubscribe function. */
    onListChange?(listener: () => void): () => void;
    /** Called when the other wallet took accounts out of this list: a message for the person. Returns the unsubscribe function. */
    onNotice?(listener: (message: string, addresses?: string[]) => void): () => void;
}
export declare function withMeritConnection<T extends Authenticator>(base: T, options: MeritConnectionOptions): T;
