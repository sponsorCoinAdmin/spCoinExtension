import { type Authenticator } from '@sponsorcoin/merit-wallet';
/** A TradeExecutor over the vault authenticator: execute() queues the transaction for approval and sends it; call() is a plain eth_call. */
export declare const createBrowserTradeExecutor: (authenticator: Authenticator, from: string, defaultRpcUrl: string) => import("@sponsorcoin/spcoin-common").TradeExecutor;
/** Register the swap hooks with the engine, once. `rpcOf` answers a chain's endpoint (the page's chains first, then the bundled network settings). */
export declare const registerBrowserTradeHosts: (authenticator: Authenticator, rpcOf: (chainId: number) => string | undefined) => void;
