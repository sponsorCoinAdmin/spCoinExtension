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
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { useExchangeContext } from '../useExchangeContext';
const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const normalizeTokenAddress = (addr) => addr.toLowerCase();
const BALANCE_KEY = (chainId, user, tokenAddress) => {
    const userPart = user.toLowerCase();
    const tokenPart = normalizeTokenAddress(tokenAddress).toLowerCase();
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
];
export function useGetBalance({ tokenAddress, chainId, userAddress, decimalsHint, staleTimeMs = 20000, enabled, }) {
    const { exchangeContext } = useExchangeContext();
    const activeAccount = exchangeContext?.apiCoreSyncedMembers.accounts?.activeAccount
        ?.address;
    // Fall back to the exchange context's appChainId (e.g. 31337 for Hardhat)
    // so usePublicClient connects to the correct transport. Without this,
    // wagmi falls back to the first chain in config (mainnet), which has
    // no knowledge of local Hardhat contracts/tokens — balance queries
    // silently return 0. Uses the raw appChainId, NOT toMappedChainId
    // (31337->8453) — that mapping is for token-metadata disk lookups, not
    // RPC balance queries, which must hit the local Hardhat node.
    const appChainId = exchangeContext?.apiCoreSyncedMembers?.network
        ?.appChainId;
    const effectiveChainId = chainId ?? (typeof appChainId === 'number' ? appChainId : undefined);
    const publicClient = usePublicClient(effectiveChainId ? { chainId: effectiveChainId } : undefined);
    const user = (userAddress ?? activeAccount ?? null);
    const effChainId = effectiveChainId ?? publicClient?.chain?.id;
    const effectiveToken = useMemo(() => {
        const addr = (tokenAddress ?? NATIVE_TOKEN_ADDRESS);
        return normalizeTokenAddress(addr);
    }, [tokenAddress]);
    const isNative = useMemo(() => {
        if (!effectiveToken)
            return false;
        return effectiveToken.toLowerCase() ===
            NATIVE_TOKEN_ADDRESS.toLowerCase();
    }, [effectiveToken]);
    const isEnabled = useMemo(() => {
        const base = !!publicClient && !!effChainId && !!effectiveToken && !!user;
        return typeof enabled === 'boolean' ? base && enabled : base;
    }, [publicClient, effChainId, user, effectiveToken, enabled]);
    const keyString = isEnabled
        ? BALANCE_KEY(effChainId, (user ?? '0x0000000000000000000000000000000000000000'), effectiveToken)
        : 'balance:disabled';
    const queryKey = useMemo(() => [keyString], [keyString]);
    const query = useQuery({
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
                const bal = await publicClient.getBalance({ address: user });
                return { balance: bal, decimals: 18 };
            }
            const code = await publicClient.getCode({ address: effectiveToken });
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
                        address: effectiveToken,
                        abi: erc20Abi,
                        functionName: 'decimals',
                    }),
                publicClient.readContract({
                    address: effectiveToken,
                    abi: erc20Abi,
                    functionName: 'balanceOf',
                    args: [user],
                }),
            ]);
            return { balance: bal, decimals: Number(d) };
        },
        select: (data) => {
            const { balance, decimals } = data;
            const formatted = typeof decimals === 'number' ? formatUnits(balance, decimals) : undefined;
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
