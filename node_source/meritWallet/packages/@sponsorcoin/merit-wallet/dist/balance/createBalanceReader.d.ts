import { erc20Abi, type Address } from 'viem';
/** The three calls of a viem public client this reader makes (a wagmi public client and a client from createPublicClient both fit). */
export interface BalanceClient {
    getBalance(args: {
        address: Address;
    }): Promise<bigint>;
    getCode(args: {
        address: Address;
    }): Promise<string | undefined>;
    readContract(args: {
        address: Address;
        abi: typeof erc20Abi;
        functionName: 'balanceOf';
        args: [Address];
    }): Promise<bigint>;
}
export interface BalanceQuery {
    /** Omitted for the chain's native token. */
    tokenAddress?: string;
    accountAddress: string;
}
/** `getClient` is called for every read (the active chain can change): undefined means this host has no client for the chain, and the balance is unavailable. */
export declare function createBalanceReader(getClient: () => BalanceClient | undefined): ({ tokenAddress: rawTokenAddress, accountAddress: rawAccountAddress }: BalanceQuery) => Promise<bigint | undefined>;
