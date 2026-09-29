// File: src/executeUniswapV3Swap.ts
// Extension-side swap execution adapter (2026-09-27, Phase 4).
//
// Thin wrapper around the portable executeUniswapV3Swap from
// @sponsorcoin/spcoin-onchain (re-exported via @sponsorcoin/spcoin-exchange-
// engine), wiring the extension's TradeExecutor (meritSign.ts). This is the
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
import { buildMeritTradeExecutorContext } from './tradeExecutorMerit';
import type { TradeExecutorContext, TradeExecutorAccount } from '@sponsorcoin/spcoin-exchange-engine';

export interface ExecuteUniswapV3SwapParamsExt {
  baseUrl: string;
  rpcUrl: string;
  chainId: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOutMinimum: bigint;
  recipient: string;
  fee?: number;
  fromAddress: string;
}

export type { ExecuteUniswapV3SwapResult };

export async function executeUniswapV3Swap({
  baseUrl,
  rpcUrl,
  chainId,
  tokenIn,
  tokenOut,
  amountIn,
  amountOutMinimum,
  recipient,
  fee,
  fromAddress,
}: ExecuteUniswapV3SwapParamsExt): Promise<ExecuteUniswapV3SwapResult> {
  const account: TradeExecutorAccount = {
    address: fromAddress,
    isConnected: Boolean(fromAddress),
    chainId,
  };

  const context: TradeExecutorContext = buildMeritTradeExecutorContext(
    { baseUrl, rpcUrl },
    account,
  );

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
