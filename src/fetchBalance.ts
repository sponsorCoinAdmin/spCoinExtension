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
import { createPublicClient, http } from 'viem';
import { createBalanceReader, type BalanceClient } from '@sponsorcoin/merit-wallet';

// docs/meritMigration.txt row 27: the reads are merit-wallet's createBalanceReader (the same one the web app uses); this file only supplies a viem client for the chain's RPC.
export function makeFetchBalance(rpcUrl: string) {
  const client = createPublicClient({ transport: http(rpcUrl) });
  return createBalanceReader(() => client as unknown as BalanceClient);
}
