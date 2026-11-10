import type { Authenticator } from './authenticator';
export interface KeptAccountsState {
    /** Every account this wallet has ever reported: listed whatever its state. */
    known: string[];
    /** The known accounts switched off locally (disconnected). */
    off: string[];
    /** 2026-11-08 (owner, docs/design/removeAccountPlan.txt X1, X4): accounts the person REMOVED from this wallet. Not listed, not usable; they return only when the person connects them again or the wallet newly starts sharing them. Absent in an older stored record = none. */
    removed?: string[];
}
export interface KeptAccountsStore {
    read(): Promise<KeptAccountsState>;
    write(state: KeptAccountsState): Promise<void>;
}
export declare function withKeptAccounts<T extends Authenticator>(base: T, store: KeptAccountsStore): T;
