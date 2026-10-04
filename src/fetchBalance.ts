// File: src/fetchBalance.ts
//
// 2026-10-03 — real token balance read for EVERY balance row (Swap sell/buy/Uniswap
// receive, Send, Sponsor pay). The package's rows hardcoded "Balance: 0" and the web app's own wagmi-based
// useGetBalance isn't available in this extension (no WagmiProvider), so the
// extension supplies MeritWallet's `fetchBalance` prop with a plain viem
// read over the same public RPC every other extension read in sidepanel.ts uses.
//
// The returned function must keep a stable identity: MeritWallet re-fetches
// whenever the prop changes, so build it once at module scope.
import { createPublicClient, erc20Abi, http, type Address } from 'viem';

export function makeFetchBalance(rpcUrl: string) {
  const client = createPublicClient({ transport: http(rpcUrl) });
  return async ({
    tokenAddress,
    accountAddress,
  }: {
    tokenAddress?: string;
    accountAddress: string;
  }): Promise<bigint | undefined> => {
    // No tokenAddress means the native token (MeritWallet resolves the 0xEeee…
    // sentinel to undefined before calling).
    if (!tokenAddress) {
      return client.getBalance({ address: accountAddress as Address });
    }
    return client.readContract({
      address: tokenAddress as Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [accountAddress as Address],
    });
  };
}
