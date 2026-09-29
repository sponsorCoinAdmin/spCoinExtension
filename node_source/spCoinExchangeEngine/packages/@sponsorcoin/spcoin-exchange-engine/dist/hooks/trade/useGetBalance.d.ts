import { type UseQueryResult } from '@tanstack/react-query';
import { type Address } from 'viem';
interface BalanceData {
    balance: bigint;
    decimals: number;
    formatted?: string;
}
type BalanceError = Error;
export interface UseGetBalanceParams {
    /** token address; falsy => treat as native token */
    tokenAddress?: Address | null;
    /** chain to read on; defaults to publicClient's own chain if omitted */
    chainId?: number;
    /**
     * account address to read for
     * - if omitted, defaults to exchangeContext.apiCoreSyncedMembers.accounts.activeAccount.address
     */
    userAddress?: Address | null;
    /** provide to skip an extra decimals() RPC */
    decimalsHint?: number;
    /** react-query staleTime (ms) */
    staleTimeMs?: number;
    /** additional enable flag (combined with internal guards) */
    enabled?: boolean;
}
export declare function useGetBalance({ tokenAddress, chainId, userAddress, decimalsHint, staleTimeMs, enabled, }: UseGetBalanceParams): {
    balance: bigint | undefined;
    decimals: number | undefined;
    formatted: string | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: BalanceError | null;
    refetch: UseQueryResult<BalanceData, BalanceError>['refetch'];
    key: string | undefined;
};
export {};
