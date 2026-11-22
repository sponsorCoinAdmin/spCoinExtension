// File: src/executeUniswapV3Swap.ts
// Extension-side swap execution adapter (2026-09-27, Phase 4).
//
// Thin wrapper around the portable executeUniswapV3Swap from
// @sponsorcoin/spcoin-onchain (re-exported via @sponsorcoin/spcoin-exchange-
// engine), wiring the extension's TradeExecutor (tradeExecutorMerit.ts). This is the
// extension counterpart to the web app's
// lib/uniswap/executeUniswapV3Swap.ts — same pattern, different
// TradeExecutor context builder.
//
// The portable version handles calldata building (viem encodeFunctionData),
// allowance pre-checks (via TradeExecutor.call), and execution (via
// TradeExecutor.execute) — this file only supplies the Merit-backed
// TradeExecutorContext.

import {
  executeUniswapV3Swap as executeSwapPortable,
  type ExecuteUniswapV3SwapResult,
  type ExecuteUniswapV3SwapParams as PortableSwapParams,
} from '@sponsorcoin/spcoin-onchain';
import { withSwapApprovalDisplay, type SwapConfirmCopy } from '@sponsorcoin/merit-wallet';
import { buildMeritTradeExecutorContext } from './tradeExecutorMerit';
import type { TradeExecutorContext, TradeExecutorAccount } from '@sponsorcoin/spcoin-exchange-engine';

interface ExecuteUniswapV3SwapParamsExt {
  rpcUrl: string;
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: string;
  fee?: number;
  fromAddress: string;
  /** What the confirmation screen shows for the swap itself (the approval-details request the shared swap flow builds); filled in where the portable call has none. */
  confirm?: SwapConfirmCopy;
}

export type { ExecuteUniswapV3SwapResult };

export async function executeUniswapV3Swap({
  rpcUrl,
  chainId,
  tokenIn,
  tokenOut,
  amountIn,
  amountOutMinimum,
  recipient,
  fee,
  fromAddress,
  confirm,
}: ExecuteUniswapV3SwapParamsExt): Promise<ExecuteUniswapV3SwapResult> {
  const account: TradeExecutorAccount = {
    address: fromAddress,
    isConnected: Boolean(fromAddress),
    chainId,
  };

  const context: TradeExecutorContext = buildMeritTradeExecutorContext(
    { rpcUrl },
    account,
  );

  // 2026-11-22 (owner: uniformity in processing): the swap and the spending approval sent before it carry the display every Merit wallet uses (merit-wallet's approval/swapApprovalDisplay.ts)
  if (confirm) context.executor.execute = withSwapApprovalDisplay(context.executor.execute.bind(context.executor), 'Uniswap V3 Swap', confirm);

  const portableParams: PortableSwapParams = {
    chainId,
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMinimum,
    recipient,
    fee,
    context,
    rpcUrl,
  };

  return executeSwapPortable(portableParams);
}
