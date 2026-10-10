import { type Hex, type Transport } from 'viem';
import { ApprovalController } from './approvals';
import { type VaultSession } from './vaultSession';
import { WalletAccounts, type WalletVaultContents } from './walletAccounts';
export declare const HARDHAT_CHAIN_ID = 31337;
export declare class DevAccountOnRealChainError extends Error {
    constructor();
}
export interface LocalTransactionRequest {
    from: string;
    to?: string;
    /** Wei. */
    value?: bigint;
    data?: string;
    chainId: number;
    origin?: string;
}
export interface LocalSignerOptions {
    session: VaultSession<WalletVaultContents>;
    accounts: WalletAccounts;
    approvals: ApprovalController;
    /** The RPC endpoint for a chain id (from the network registry); undefined when the chain is not configured. */
    rpcUrlFor: (chainId: number) => string | undefined;
    /** Replace the transport (tests pass an in-memory chain); default is http(rpcUrlFor(chainId)). */
    transportFor?: (chainId: number) => Transport | undefined;
}
export declare class LocalSigner {
    private readonly o;
    constructor(o: LocalSignerOptions);
    private requireAccount;
    /**
     * Queue a personal_sign style message; resolves with the signature after the user approves. `message` is text, or { raw } bytes (what
     * personal_sign carries; EIP-191 signing of raw bytes and of the same text are identical).
     */
    signMessage(params: {
        address: string;
        message: string | {
            raw: Hex;
        };
        origin?: string;
    }): Promise<Hex>;
    /** Queue EIP-712 typed data (eth_signTypedData_v4); resolves with the signature after the user approves. */
    signTypedData(params: {
        address: string;
        typedData: Record<string, unknown>;
        origin?: string;
    }): Promise<Hex>;
    /** Queue a transaction; resolves with its hash after the user approves and it is broadcast. */
    sendTransaction(request: LocalTransactionRequest): Promise<{
        hash: Hex;
    }>;
    private rpcTransport;
}
