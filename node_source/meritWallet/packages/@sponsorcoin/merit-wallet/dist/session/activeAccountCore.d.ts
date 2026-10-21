/** What the wallet knows about an account the user clicked. */
export interface SelectedAccountInput {
    address: string;
    name?: string;
    label?: string;
    symbol?: string;
    website?: string;
    description?: string;
    email?: string;
    logoURL?: string;
}
/** The fields of the account that is active now that a switch may reuse. */
export interface CurrentActiveAccount {
    address?: string;
    name?: string;
    symbol?: string;
    type?: string;
    website?: string;
    description?: string;
    status?: unknown;
    email?: string;
    logoURL?: string;
    balance?: bigint;
}
/** What a host supplies that this module does not own: the address normaliser and the "info" status value. */
export interface ActiveAccountDeps {
    normalizeAddress(address: string): string;
    infoStatus: unknown;
}
/**
 * The account to make active. The current active account's fields are reused ONLY when it is the same address being re-selected: falling back across a real
 * address switch would smear the previous account's name, logo and email onto the new address before its own metadata has loaded.
 */
export declare function buildNextActiveAccount<TStatus = unknown>(account: SelectedAccountInput, currentActiveAccount: CurrentActiveAccount | null | undefined, deps: ActiveAccountDeps): {
    balance: bigint;
    logoURL?: string | undefined;
    email?: string | undefined;
    name: string;
    symbol: string;
    type: string;
    website: string;
    description: string;
    status: TStatus;
    address: string;
};
interface NetworkSection {
    appChainId?: unknown;
    rpcUrl?: unknown;
}
interface ContextWithNetwork {
    apiCoreSyncedMembers: {
        network: NetworkSection;
    };
}
/** The state update for a network switch: the same object back when the chain is already selected (no re-render), else the network section derived from the new chain id. */
export declare function applyNetworkSelection<T extends ContextWithNetwork>(prev: T, chainId: number, deriveNetworkFromApp: (chainId: number, network: T['apiCoreSyncedMembers']['network']) => T['apiCoreSyncedMembers']['network']): T;
export interface SyncPushPlan {
    chainId: number;
    address: string;
    /** The lower-case address the server keys the record by. */
    key: string;
    rpcUrl: string;
}
/**
 * Whether a change is worth pushing to the sync server, and with what. `context` is the value BEFORE the change. `fallbackChainId` is used when the current chain is not set:
 * a network switch passes the NEW chain id (so it can still push); an account switch passes nothing.
 */
export declare function planSyncPush(context: {
    apiCoreSyncedMembers?: {
        accounts?: {
            activeAccount?: {
                address?: unknown;
            };
        };
        network?: NetworkSection;
    };
} | null | undefined, options?: {
    address?: string;
    fallbackChainId?: number;
}): SyncPushPlan | null;
export {};
