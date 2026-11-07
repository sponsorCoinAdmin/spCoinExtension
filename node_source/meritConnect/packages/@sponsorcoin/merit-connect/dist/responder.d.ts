import { type Reply, type SelectionPush } from './protocol.js';
import { type TraceFn } from './trace.js';
/** What the host's account selector is shown, and how it reports back. */
export interface SelectionRequest {
    rid: string;
    /** The accounts to start from: those the requester holds that are still on offer. */
    start: string[];
    /** Every account this wallet can share. */
    offered: string[];
    /** The person changed the selection: the accounts selected now. */
    onChange(selected: string[]): void;
}
export interface ResponderHandlers {
    chainId(): number;
    /** The accounts this wallet shares with the requester now. */
    shared(): string[];
    setShared(accounts: string[]): void;
    /** The accounts this wallet can share. */
    offered(): string[] | Promise<string[]>;
    /** Optional: the shared list was set from outside while a selection may be open (the caller synced it); the open selector shows these as connected. */
    refreshSelection?(selected: string[]): void;
    /** Open the wallet's account selector; resolves when it is closed. */
    openSelection(selection: SelectionRequest): Promise<void>;
    /** Approve (the person decides) and perform a signature or a transaction; throws a MeritConnectError to refuse. Absent: those methods answer 4200. */
    sign?(request: {
        rid: string;
        method: string;
        params: unknown;
    }): Promise<unknown>;
}
export interface ResponderDeps {
    reply(reply: Reply): void;
    push(push: SelectionPush): void;
    handlers: ResponderHandlers;
    trace?: TraceFn;
}
export declare function createResponder(deps: ResponderDeps): {
    handle: (data: unknown) => Promise<void>;
};
export type Responder = ReturnType<typeof createResponder>;
