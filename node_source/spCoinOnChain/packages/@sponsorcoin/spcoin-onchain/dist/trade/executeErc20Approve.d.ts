import type { TradeExecutorContext, TradeExecutionResult } from '@sponsorcoin/spcoin-common';
export interface ExecuteErc20ApproveParams {
    /** The pay token being approved for spend — e.g. BRETT, never spCoin itself. */
    tokenAddress: string;
    /** Who's being granted the allowance — e.g. Uniswap's SwapRouter02. */
    spenderAddress: string;
    /** Raw base-unit amount to approve (matches tokenAddress's own decimals). */
    amountRaw: bigint;
    /** Platform-specific signing/sending + account/display state. */
    context: TradeExecutorContext;
    /** Network config — needed for RPC calls and chainId-scoped display. */
    rpcUrl: string;
    chainId: number;
}
export interface ExecuteErc20ApproveResult extends TradeExecutionResult {
    /** True when a separate approve() transaction was submitted (allowance was insufficient). */
    approvalSubmitted: boolean;
    /** The allowance this approve() granted — same as amountRaw in the simple case. */
    allowance: bigint;
}
/**
 * Portable ERC20 approve() execution — same shape as the web-app-local
 * original, but signer-agnostic via TradeExecutor.
 *
 * The allow-check-then-approve pattern mirrors executeUniswapV3Swap.ts's
 * own pre-swap allowance flow: read current allowance via eth_call, skip
 * the approve if the router already has enough.
 */
export declare function executeErc20Approve({ tokenAddress, spenderAddress, amountRaw, context, rpcUrl, chainId, }: ExecuteErc20ApproveParams): Promise<ExecuteErc20ApproveResult>;
