import type { TradeExecutorContext, TradeExecutionResult } from '@sponsorcoin/spcoin-common';
export interface ExecuteMultiHopUniswapV3SwapParams {
    chainId: number;
    /** Token being sold — already resolved to a real ERC-20 address by the caller. */
    tokenIn: string;
    /** Intermediate token to route through — WETH in practice. */
    through: string;
    /** Token being bought — already resolved to a real ERC-20 address. */
    tokenOut: string;
    amountIn: bigint;
    /** Minimum acceptable output in tokenOut base units. */
    amountOutMinimum: bigint;
    /** Who receives tokenOut — almost always the signer's own address. */
    recipient: string;
    /** Fee tier for tokenIn -> through hop. Defaults to 0.3%. */
    feeIn?: number;
    /** Fee tier for through -> tokenOut hop. Defaults to feeIn. */
    feeOut?: number;
    /** Platform-specific signing/sending + account/display state. */
    context: TradeExecutorContext;
    rpcUrl: string;
}
export interface ExecuteMultiHopUniswapV3SwapResult extends TradeExecutionResult {
    approvalSubmitted: boolean;
    /** The exact path bytes actually swapped. */
    path: string;
}
/**
 * Multi-hop counterpart to executeUniswapV3Swap — same approve-then-swap
 * structure, only the router call differs (exactInput + encoded path,
 * instead of exactInputSingle + token pair).
 *
 * Hardcoded to exactly one intermediate hop, matching the quote side.
 * Native-ETH-in handling mirrors the single-hop case — sent as `value`,
 * no separate wrap step.
 */
export declare function executeMultiHopUniswapV3Swap({ chainId, tokenIn, through, tokenOut, amountIn, amountOutMinimum, recipient, feeIn, feeOut, context, rpcUrl, }: ExecuteMultiHopUniswapV3SwapParams): Promise<ExecuteMultiHopUniswapV3SwapResult>;
