import { ApprovalController } from './approvals';
import { LocalSigner } from './localSigner';
import type { VaultSession } from './vaultSession';
import { WalletAccounts, type WalletVaultContents } from './walletAccounts';
/** EIP-1193 error codes. */
export declare const PROVIDER_ERROR: {
    readonly userRejected: 4001;
    readonly unauthorized: 4100;
    readonly unsupportedMethod: 4200;
    readonly disconnected: 4900;
    readonly chainDisconnected: 4901;
    readonly unrecognizedChain: 4902;
    readonly invalidParams: -32602;
    readonly internal: -32603;
    readonly methodNotFound: -32601;
};
export declare class ProviderRpcError extends Error {
    readonly code: number;
    constructor(code: number, message: string);
}
/** Which accounts each web origin may see. */
export interface PermissionStore {
    get(origin: string): Promise<string[]>;
    set(origin: string, addresses: string[]): Promise<void>;
    remove(origin: string): Promise<void>;
    origins(): Promise<string[]>;
}
export declare function createMemoryPermissionStore(): PermissionStore;
export interface ProviderControllerOptions {
    session: VaultSession<WalletVaultContents>;
    accounts: WalletAccounts;
    approvals: ApprovalController;
    signer: LocalSigner;
    permissions: PermissionStore;
    /** The network the wallet is on. */
    getChainId: () => Promise<number> | number;
    setChainId: (chainId: number) => Promise<void> | void;
    /** Is this chain in the network registry (can the wallet switch to it)? */
    isKnownChain: (chainId: number) => boolean;
    /** Forward one JSON-RPC call to the chain's node. */
    rpc: (chainId: number, method: string, params: unknown[]) => Promise<unknown>;
}
export type ProviderEvent = {
    origin?: string;
    event: 'accountsChanged';
    data: string[];
} | {
    origin?: string;
    event: 'chainChanged';
    data: string;
} | {
    origin?: string;
    event: 'disconnect';
    data: {
        code: number;
        message: string;
    };
};
export declare class ProviderController {
    private readonly o;
    private listeners;
    constructor(o: ProviderControllerOptions);
    onEvent(listener: (e: ProviderEvent) => void): () => void;
    private emit;
    /** The accounts this origin may see right now: none while the wallet is locked or the origin was never approved. */
    private visibleAccounts;
    private requireAccount;
    /** Handle one request from a web page. Resolves with the JSON-RPC result or throws ProviderRpcError. */
    handle(origin: string, request: {
        method: string;
        params?: unknown;
    }): Promise<unknown>;
    private toProviderError;
    private dispatch;
    private requestAccounts;
    /** The user (or a page) moved the wallet to another network: tell every connected page. */
    setChain(chainId: number): Promise<void>;
    /** The wallet's active account changed or the wallet locked: tell each connected page what it can see now. */
    notifyAccountsChanged(): Promise<void>;
}
