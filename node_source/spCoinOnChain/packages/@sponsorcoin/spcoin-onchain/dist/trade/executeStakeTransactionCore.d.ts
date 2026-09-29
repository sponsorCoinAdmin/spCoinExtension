import { type Abi } from 'viem';
import type { TradeExecutorContext, TradeExecutionResult } from '@sponsorcoin/spcoin-common';
import type { MessageAccountEntry } from '@sponsorcoin/spcoin-common/context';
export interface RunScriptParams {
    contractAddress: string;
    rpcUrl: string;
    accessSource: 'node_modules' | 'local';
    readMode: 'hardhat' | 'metamask';
}
/** Injected function for reading from spCoin contract via run-script route. */
export type ReadStepFn = (params: RunScriptParams, method: string, args?: {
    key: string;
    value: string;
}[]) => Promise<unknown>;
export interface ExecuteStakeTransactionCoreParams {
    recipientKey: string;
    agentKey: string;
    /** Raw base-unit stake amount (matches Transactions.sol's uint256 _amount). */
    amountRaw: bigint;
    desiredRecipientRateKey: number;
    desiredAgentRateKey: number;
    recipientRateRange: [number, number];
    agentRateRange: [number, number];
    readParams: RunScriptParams;
    /** ABI for the spCoin contract — caller loads via their own path. */
    abi: Abi;
    /** Read-step function for rate-key resolution (getRecipientRateIncrement, etc). */
    readStep: ReadStepFn;
    /** Network chain ID for the write. */
    chainId: number;
    /** Platform-specific signing/sending + account/display state. */
    context: TradeExecutorContext;
    /** Account identity rows for the confirmation UI — passed by the caller who has the full spCoinAccount data. */
    displayAccounts?: MessageAccountEntry[];
    /** Called once the transaction has confirmed (receipt in hand) — caller's hook for cache refresh etc. */
    onConfirmed?: () => void | Promise<void>;
}
export interface ExecuteStakeTransactionResult extends TradeExecutionResult {
    recipientRateKey: string;
    /** Empty string when no agent was involved (direct sponsorRecipientTransaction). */
    agentRateKey: string;
    /** The actual contract method invoked. */
    methodName: string;
}
/**
 * Snaps a desired rate to the nearest value that is both within [lowerBound,
 * upperBound] and a whole number of `increment` steps from lowerBound —
 * mirrors Security.sol's validate*RateRange + rateMatchesIncrement checks,
 * so a submitted rate key can't revert for being off-grid.
 */
export declare function snapRateToIncrement(desired: number, lowerBound: number, upperBound: number, increment: number): number;
/**
 * The portable core of the on-chain stake write. Resolves rate keys against
 * the contract's real increment grid, builds calldata via viem
 * encodeFunctionData (signer-free), and sends via TradeExecutor.execute().
 *
 * The rate-key RPC reads happen BEFORE the execute() call — same ordering
 * as the original (getConnectedSigner ran before rate-key reads), so the
 * approval UI doesn't wait on network round-trips it doesn't need.
 */
export declare function executeStakeTransactionCore({ recipientKey, agentKey, amountRaw, desiredRecipientRateKey, desiredAgentRateKey, recipientRateRange, agentRateRange, readParams, abi, readStep, chainId, context, onConfirmed, displayAccounts, }: ExecuteStakeTransactionCoreParams): Promise<ExecuteStakeTransactionResult>;
