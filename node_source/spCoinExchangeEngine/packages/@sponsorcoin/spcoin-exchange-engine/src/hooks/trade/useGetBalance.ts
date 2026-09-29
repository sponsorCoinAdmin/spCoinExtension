// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/hooks/trade/useGetBalance.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's lib/hooks/useGetBalance.ts
// (on request, "migrate useGetBalance/parseValidFormattedAmount").
// Previously blocked by this package's module config (wagmi is ESM-only,
// node16 resolution couldn't require() it — TS1479); unblocked by the
// tsconfig.json/package.json ESM/bundler-resolution switch this same pass
// (see that config's own header comment). Two real web-app-only pieces
// were still dropped on the move, same as every other hook moved into
// this package:
//   1. appendDebugTrace/createDebugLogger calls — debug logging dropped,
//      not ported (established convention).
//   2. useAppChainId() as an internal chain-id source — that hook depends
//      on a web-app-only JSON resource (chainIdMap.json), not portable.
//      The caller now passes `chainId` explicitly instead (the web-app
//      wrapper still calls its own useAppChainId() and passes the result
//      in) — same effective chain-id resolution, just relocated to the
//      caller rather than reimplemented here.
'use client';

import { useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { formatUnits, type Address } from 'viem';
import { useExchangeContext } from '../useExchangeContext';

const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address;

const normalizeTokenAddress = (addr: Address): Address =>
  (addr as string).toLowerCase() as Address;

const BALANCE_KEY = (chainId: number, user: Address, tokenAddress: Address) => {
  const userPart = (user as string).toLowerCase();
  const tokenPart = (normalizeTokenAddress(tokenAddress) as string).toLowerCase();
  return `balance:${chainId}:${userPart}:${tokenPart}`;
};

const erc20Abi = [
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

interface BalanceFnData {
  balance: bigint;
  decimals: number;
}
interface BalanceData {
  balance: bigint;
  decimals: number;
  formatted?: string;
}
type BalanceError = Error;
type BalanceQueryKey = readonly [string];

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

export function useGetBalance({
  tokenAddress,
  chainId,
  userAddress,
  decimalsHint,
  staleTimeMs = 20_000,
  enabled,
}: UseGetBalanceParams): {
  balance: bigint | undefined;
  decimals: number | undefined;
  formatted: string | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: BalanceError | null;
  refetch: UseQueryResult<BalanceData, BalanceError>['refetch'];
  key: string | undefined;
} {
  const { exchangeContext } = useExchangeContext();
  const activeAccount = (exchangeContext as any)?.apiCoreSyncedMembers.accounts?.activeAccount
    ?.address as Address | undefined;

  // Fall back to the exchange context's appChainId (e.g. 31337 for Hardhat)
  // so usePublicClient connects to the correct transport. Without this,
  // wagmi falls back to the first chain in config (mainnet), which has
  // no knowledge of local Hardhat contracts/tokens — balance queries
  // silently return 0. Uses the raw appChainId, NOT toMappedChainId
  // (31337->8453) — that mapping is for token-metadata disk lookups, not
  // RPC balance queries, which must hit the local Hardhat node.
  const appChainId = (exchangeContext as any)?.apiCoreSyncedMembers?.network
    ?.appChainId as number | undefined;
  const effectiveChainId = chainId ?? (typeof appChainId === 'number' ? appChainId : undefined);

  const publicClient = usePublicClient(effectiveChainId ? { chainId: effectiveChainId } : undefined);

  const user = (userAddress ?? activeAccount ?? null) as Address | null;

  const effChainId = effectiveChainId ?? publicClient?.chain?.id;

  const effectiveToken: Address | null = useMemo(() => {
    const addr = (tokenAddress ?? NATIVE_TOKEN_ADDRESS) as Address;
    return normalizeTokenAddress(addr);
  }, [tokenAddress]);

  const isNative = useMemo(() => {
    if (!effectiveToken) return false;
    return (effectiveToken as string).toLowerCase() ===
      (NATIVE_TOKEN_ADDRESS as string).toLowerCase();
  }, [effectiveToken]);

  const isEnabled = useMemo(() => {
    const base = !!publicClient && !!effChainId && !!effectiveToken && !!user;
    return typeof enabled === 'boolean' ? base && enabled : base;
  }, [publicClient, effChainId, user, effectiveToken, enabled]);

  const keyString = isEnabled
    ? BALANCE_KEY(
        effChainId!,
        (user ?? '0x0000000000000000000000000000000000000000') as Address,
        effectiveToken as Address,
      )
    : 'balance:disabled';

  const queryKey = useMemo<BalanceQueryKey>(() => [keyString] as const, [keyString]);

  const query = useQuery<BalanceFnData, BalanceError, BalanceData, BalanceQueryKey>({
    queryKey,
    enabled: isEnabled,
    staleTime: staleTimeMs,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    queryFn: async () => {
      if (!publicClient || !effChainId || !user || !effectiveToken) {
        throw new Error('Preconditions not met in useGetBalance.queryFn');
      }

      if (isNative) {
        const bal = await publicClient.getBalance({ address: user as Address });
        return { balance: bal as bigint, decimals: 18 };
      }

      const code = await publicClient.getCode({ address: effectiveToken as Address });

      if (!code || code === '0x') {
        return {
          balance: 0n,
          decimals: typeof decimalsHint === 'number' ? decimalsHint : 18,
        };
      }

      const [d, bal] = await Promise.all([
        typeof decimalsHint === 'number'
          ? Promise.resolve(decimalsHint)
          : publicClient.readContract({
              address: effectiveToken as Address,
              abi: erc20Abi,
              functionName: 'decimals',
            }),
        publicClient.readContract({
          address: effectiveToken as Address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [user as Address],
        }),
      ]);

      return { balance: bal as bigint, decimals: Number(d) };
    },
    select: (data) => {
      const { balance, decimals } = data;
      const formatted =
        typeof decimals === 'number' ? formatUnits(balance, decimals) : undefined;

      return { balance, decimals, formatted };
    },
  });

  return {
    balance: query.data?.balance,
    decimals: query.data?.decimals,
    formatted: query.data?.formatted,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error ?? null,
    refetch: query.refetch,
    key: isEnabled ? keyString : undefined,
  };
}
