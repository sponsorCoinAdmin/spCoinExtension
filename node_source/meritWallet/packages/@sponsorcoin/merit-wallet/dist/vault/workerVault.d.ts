import { VaultError, type VaultCapability } from './vaultCapability';
import type { WalletPlatform } from '../auth/authenticator';
import type { EncryptedVault } from './vaultCrypto';
/** A reply of the worker (the fields this adapter reads). */
export interface WorkerReply {
    ok: boolean;
    initialized?: boolean;
    unlocked?: boolean;
    mnemonic?: string;
    accounts?: Array<{
        address: string;
        name?: string;
        source?: string;
        devOrigin?: boolean;
    }>;
    account?: {
        address: string;
        name?: string;
        source?: string;
        devOrigin?: boolean;
    };
    active?: string;
    privateKey?: string;
    backup?: EncryptedVault;
    error?: string;
    message?: string;
}
export interface WorkerVaultTransport {
    send(message: Record<string, unknown>): Promise<WorkerReply>;
    /** Subscribe to the worker's broadcasts (`merit/vault/changed`); returns the unsubscribe function. */
    subscribe(handler: (message: {
        type?: string;
        unlocked?: boolean;
    }) => void): () => void;
}
export interface WorkerVault extends VaultCapability {
    /** Resolves after the first read of the worker's state. */
    readonly ready: Promise<void>;
    /** Re-read the worker's state (status and account list). */
    refresh(): Promise<void>;
}
/** The worker's error codes mapped onto the one VaultError set. */
export declare function workerError(reply: WorkerReply): VaultError;
export declare function createWorkerVault(transport: WorkerVaultTransport, options?: {
    label?: string;
    platform?: WalletPlatform;
}): WorkerVault;
