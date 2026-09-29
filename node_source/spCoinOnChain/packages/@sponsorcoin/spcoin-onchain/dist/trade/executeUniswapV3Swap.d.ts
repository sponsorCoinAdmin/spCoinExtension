import type { TradeExecutorContext, TradeExecutionResult } from '@sponsorcoin/spcoin-common';
export interface ExecuteUniswapV3SwapParams {
    chainId: number;
    tokenIn: string;
    tokenOut: string;
    amountIn: bigint;
    /**
     * Minimum acceptable output, in tokenOut's base units — the caller's
     * responsibility to compute (lastQuote.amountOut minus slippage tolerance),
     * not this function's. Keeps the engine decoupled from UI-level slippage
     * settings.
     */
    amountOutMinimum: bigint;
    /** Who receives tokenOut — almost always the signer's own address. */
    recipient: string;
    /**
     * Fee tier for the tokenIn -> tokenOut pool. Defaults to 0.3% (MEDIUM).
     * Must match whatever tier the quote this amountOutMinimum came from.
     */
    fee?: number;
    /** Platform-specific signing/sending + account/display state. */
    context: TradeExecutorContext;
    rpcUrl: string;
}
export interface ExecuteUniswapV3SwapResult extends TradeExecutionResult {
    /** True when a separate approve() transaction was submitted before the swap. */
    approvalSubmitted: boolean;
}
/**
 * Uniswap-direct's execution counterpart to the quote functions — real
 * on-chain execution via SwapRouter02.exactInputSingle, not a simulation.
 *
 * Same approve-then-swap structure as the original: native ETH needs no
 * approval (SwapRouter02 pulls it via `value`); only ERC-20 sell needs
 * an allowance check + conditional approve() call.
 *
 * No Permit2, no EIP-712 signing — SwapRouter02 uses plain approve() +
 * transferFrom() (that's the whole reason this engine sidesteps the
 * fork-chainId/domain-mismatch problem 0x's Permit2 flow would hit here).
 * Native-ETH input needs no separate wrap step — exactInputSingle, called
 * with tokenIn set to the chain's wrapped-native address and native ETH
 * sent as `value`, auto-wraps internally.
 */
export declare function executeUniswapV3Swap({ chainId, tokenIn, tokenOut, amountIn, amountOutMinimum, recipient, fee, context, rpcUrl, }: ExecuteUniswapV3SwapParams): Promise<ExecuteUniswapV3SwapResult>;
