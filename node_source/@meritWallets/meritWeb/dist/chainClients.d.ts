import { type PublicClient } from 'viem';
/** A read-only client for a JSON-RPC endpoint, built once per endpoint. The endpoint can carry an access token, so it is only ever a map key in memory here (never logged or traced). */
export declare function publicClientFor(rpcUrl: string): PublicClient;
export interface ChainReceipt {
    blockNumber: number;
    gasUsed: bigint;
    gasPrice: bigint;
    /** 1 mined and succeeded, 0 mined and reverted. */
    status: 0 | 1;
    to: string | null;
    from: string;
    contractAddress: string | null;
}
/** Wait for a transaction to be mined; null when it is not mined in time or the node cannot be reached (the transaction was sent, so a slow node only means the result card has no block details). */
export declare function waitForReceipt(rpcUrl: string, hash: string, timeoutMs?: number): Promise<ChainReceipt | null>;
