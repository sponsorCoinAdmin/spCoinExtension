// File: src/chainRpc.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, rows 5 and 8) -- the extension's RPC lookup. It used to keep its own table of public endpoints;
// since row 8 the endpoints live in the wallet's one network registry (spcoin-feeds' network records, the MetaMask NetworkController-style
// source every host reads), so this file only asks it. A chain that is not in the registry has no RPC here: its balances read as unavailable.
import { getNetworkConfiguration } from '@sponsorcoin/spcoin-feeds/networks';

export const HARDHAT_CHAIN_ID = 31337;
export const HARDHAT_RPC_URL = getNetworkConfiguration(HARDHAT_CHAIN_ID)?.rpcUrl ?? '';

export function rpcUrlForChain(chainId: number): string | undefined {
  return getNetworkConfiguration(chainId)?.rpcUrl || undefined;
}
