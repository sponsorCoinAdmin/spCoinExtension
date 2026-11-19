import { type TradeExecutionResult, type TradeExecutor } from '@sponsorcoin/spcoin-exchange-engine';
import type { Authenticator } from '../auth/authenticator';
import type { StandaloneChain } from './createStandaloneWallet';
type Receipt = NonNullable<TradeExecutionResult['receipt']>;
/** Wait for the transaction to be mined and return the receipt in the shape the swap flow reads; null when it is not mined in time. */
export declare function waitForTradeReceipt(rpcUrl: string, hash: string, timeoutMs?: number): Promise<Receipt | null>;
/** A TradeExecutor over the vault authenticator: execute() queues the transaction for approval and sends it; call() is a plain eth_call (allowances and the like). */
export declare function createStandaloneTradeExecutor(authenticator: Authenticator, from: string, defaultRpcUrl: string): TradeExecutor;
/** Register the swap hooks with the engine, once. `rpcOf` answers a chain's endpoint (the page's chains first, then the bundled network settings). */
export declare function registerStandaloneTradeHosts(authenticator: Authenticator, chains: readonly StandaloneChain[], rpcOf: (chainId: number) => string | undefined): void;
export {};
