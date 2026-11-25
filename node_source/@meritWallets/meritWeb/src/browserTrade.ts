// File: src/browserTrade.ts
//
// The browser wallet's TRADE host is the shared one (merit-wallet's trade/tradeEngineHost.ts, also the stand-alone wallet's) with this package's cached chain clients as its chain IO (2026-11-23 consolidation; it was a near-identical copy).
import { createTradeExecutor, registerTradeEngineHosts, type Authenticator, type TradeChainIo } from '@sponsorcoin/merit-wallet';
import { publicClientFor, waitForReceipt } from './chainClients';

const browserChainIo: TradeChainIo = {
  call: async (rpcUrl, to, data) => (await publicClientFor(rpcUrl).call({ to: to as `0x${string}`, data: data as `0x${string}` })).data ?? '0x',
  waitForReceipt: (rpcUrl, hash) => waitForReceipt(rpcUrl, hash) as ReturnType<TradeChainIo['waitForReceipt']>,
};

/** A TradeExecutor over the vault authenticator: execute() queues the transaction for approval and sends it; call() is a plain eth_call. */
export const createBrowserTradeExecutor = (authenticator: Authenticator, from: string, defaultRpcUrl: string) => createTradeExecutor(authenticator, from, defaultRpcUrl, browserChainIo);

/** Register the swap hooks with the engine, once. `rpcOf` answers a chain's endpoint (the page's chains first, then the bundled network settings). */
export const registerBrowserTradeHosts = (authenticator: Authenticator, rpcOf: (chainId: number) => string | undefined) => registerTradeEngineHosts(authenticator, rpcOf, browserChainIo);
