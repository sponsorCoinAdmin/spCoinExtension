// File: trade/executeMultiHopUniswapV3Swap.ts
// Portable Uniswap V3 multi-hop swap execution (2026-09-26, Phase 4).
// Ported from web-app-local lib/uniswap/executeMultiHopUniswapV3Swap.ts.
// Key change: uses TradeExecutor instead of ethers Contract + Signer.

import { encodeFunctionData, parseAbi } from 'viem';
import type { TradeExecutorContext, TradeExecutionResult } from '@sponsorcoin/spcoin-common';
import {
  UNISWAP_V3_FEE_TIERS,
  getUniswapV3Addresses,
  toPoolTokenAddress,
  isNativeToken,
} from '../uniswap/addresses';
import { encodeSingleHopThroughPath } from '../uniswap/multiHopPath';
import { erc20Abi } from '../uniswap/abi/swapRouter02Abi';

const SWAP_ROUTER_ABI = parseAbi([
  'function exactInput((bytes path,address recipient,uint256 amountIn,uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)',
]);

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
export async function executeMultiHopUniswapV3Swap({
  chainId,
  tokenIn,
  through,
  tokenOut,
  amountIn,
  amountOutMinimum,
  recipient,
  feeIn = UNISWAP_V3_FEE_TIERS.MEDIUM,
  feeOut,
  context,
  rpcUrl,
}: ExecuteMultiHopUniswapV3SwapParams): Promise<ExecuteMultiHopUniswapV3SwapResult> {
  if (amountIn <= 0n) {
    throw new Error('Enter an amount to swap.');
  }

  const addresses = getUniswapV3Addresses(chainId);
  if (!addresses) {
    throw new Error(`Uniswap V3 addresses not verified for chain ${chainId}.`);
  }

  if (!rpcUrl) {
    throw new Error('RPC URL is not ready yet.');
  }

  const isNativeIn = isNativeToken(tokenIn, chainId);
  const poolTokenIn = toPoolTokenAddress(tokenIn, chainId);
  const poolThrough = toPoolTokenAddress(through, chainId);
  const poolTokenOut = toPoolTokenAddress(tokenOut, chainId);

  let approvalSubmitted = false;

  if (!isNativeIn) {
    const ownerAddress = context.account.address ?? '';
    const allowanceCalldata = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'allowance',
      args: [ownerAddress as `0x${string}`, addresses.swapRouter02 as `0x${string}`],
    });

    let currentAllowance = 0n;
    try {
      const allowanceResult = await context.executor.call({
        to: poolTokenIn,
        data: allowanceCalldata,
        chainId,
        rpcUrl,
      });
      if (allowanceResult && allowanceResult.length >= 64) {
        currentAllowance = BigInt(allowanceResult);
      }
    } catch {
      // proceeds with approve
    }

    if (currentAllowance < amountIn) {
      const approveCalldata = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [addresses.swapRouter02 as `0x${string}`, amountIn],
      });

      await context.executor.execute({
        to: poolTokenIn,
        data: approveCalldata,
        chainId,
        rpcUrl,
        display: {
          label: 'Uniswap V3 Approve',
          contractAddress: poolTokenIn,
          title: 'Spending Authorization',
          skipMandatoryApprovalGate: true,
        },
      });
      approvalSubmitted = true;
    }
  }

  const path = encodeSingleHopThroughPath({
    tokenIn: poolTokenIn,
    through: poolThrough as `0x${string}`,
    tokenOut: poolTokenOut as `0x${string}`,
    feeIn,
    feeOut,
  });

  const swapCalldata = encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: 'exactInput',
    args: [{ path: path as `0x${string}`, recipient: recipient as `0x${string}`, amountIn, amountOutMinimum }],
  });

  const value = isNativeIn ? amountIn : 0n;

  const result = await context.executor.execute({
    to: addresses.swapRouter02,
    data: swapCalldata,
    value: value > 0n ? value : undefined,
    chainId,
    rpcUrl,
    display: {
      label: 'Uniswap V3 Multi-hop Swap',
      contractAddress: addresses.swapRouter02,
      title: 'Confirm Swap',
      skipMandatoryApprovalGate: true,
    },
  });

  return {
    transactionHash: result.transactionHash,
    receipt: result.receipt,
    approvalSubmitted,
    path,
  };
}
