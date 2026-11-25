// File: src/browserTrade.ts
//
// The browser wallet's TRADE host is the shared one (merit-wallet's trade/tradeEngineHost.ts, also the stand-alone wallet's) with this package's cached chain clients as its chain IO (2026-11-23 consolidation; it was a near-identical copy).
import { createTradeExecutor, registerTradeEngineHosts } from '@sponsorcoin/merit-wallet';
import { publicClientFor, waitForReceipt } from './chainClients';
const browserChainIo = {
    call: async (rpcUrl, to, data) => (await publicClientFor(rpcUrl).call({ to: to, data: data })).data ?? '0x',
    waitForReceipt: (rpcUrl, hash) => waitForReceipt(rpcUrl, hash),
};
/** A TradeExecutor over the vault authenticator: execute() queues the transaction for approval and sends it; call() is a plain eth_call. */
export const createBrowserTradeExecutor = (authenticator, from, defaultRpcUrl) => createTradeExecutor(authenticator, from, defaultRpcUrl, browserChainIo);
/** Register the swap hooks with the engine, once. `rpcOf` answers a chain's endpoint (the page's chains first, then the bundled network settings). */
export const registerBrowserTradeHosts = (authenticator, rpcOf) => registerTradeEngineHosts(authenticator, rpcOf, browserChainIo);
