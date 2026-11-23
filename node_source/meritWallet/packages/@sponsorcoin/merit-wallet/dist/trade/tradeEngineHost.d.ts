import { type TradeExecutionResult, type TradeExecutor } from '@sponsorcoin/spcoin-exchange-engine';
import type { Authenticator } from '../auth/authenticator';
type Receipt = NonNullable<TradeExecutionResult['receipt']>;
/** What a host supplies to reach the chain: an eth_call and a receipt waiter (the browser wallet's cache one client per endpoint; the stand-alone wallet builds one per call). */
export interface TradeChainIo {
    call(rpcUrl: string, to: string, data: string): Promise<string>;
    /** The receipt in the shape the swap flow reads; null when it is not mined in time. */
    waitForReceipt(rpcUrl: string, hash: string): Promise<Receipt | null>;
}
/** Wait for the transaction to be mined and return the receipt in the shape the swap flow reads; null when it is not mined in time. */
export declare function waitForTradeReceipt(rpcUrl: string, hash: string, timeoutMs?: number): Promise<Receipt | null>;
/** The plain chain IO (one viem client per call). */
export declare const viemTradeChainIo: TradeChainIo;
/** A TradeExecutor over the vault authenticator: execute() queues the transaction for approval and sends it; call() is a plain eth_call (allowances and the like). */
export declare function createTradeExecutor(authenticator: Authenticator, from: string, defaultRpcUrl: string, io?: TradeChainIo): TradeExecutor;
/** Register the swap hooks with the engine, once. `rpcOf` answers a chain's endpoint (the page's chains first, then the bundled network settings). */
export declare function registerTradeEngineHosts(authenticator: Authenticator, rpcOf: (chainId: number) => string | undefined, io?: TradeChainIo): void;
export {};
