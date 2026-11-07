import type { Authenticator } from './authenticator';
export interface KeptAccountsState {
    /** Every account this wallet has ever reported: listed whatever its state. */
    known: string[];
    /** The known accounts switched off locally (disconnected). */
    off: string[];
}
export interface KeptAccountsStore {
    read(): Promise<KeptAccountsState>;
    write(state: KeptAccountsState): Promise<void>;
}
export declare function withKeptAccounts<T extends Authenticator>(base: T, store: KeptAccountsStore): T;
