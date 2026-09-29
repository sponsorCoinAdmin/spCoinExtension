// File: trade/executeUniswapV3Swap.ts
// Portable Uniswap V3 swap execution (2026-09-26, Phase 4).
// Ported from web-app-local lib/uniswap/executeUniswapV3Swap.ts. Key change:
// uses TradeExecutor (signer-agnostic send + eth_call) instead of ethers
// Contract + Signer directly, so the extension (meritSign.ts POST path)
// and web app (ethers Signer path) share one implementation.
//
// Calldata is built with viem's encodeFunctionData (signer-free, imported
// from the already-viem peer dep), then executed via TradeExecutor.execute().
// The allowance check uses TradeExecutor.call() (eth_call) before submitting,
// mirroring the original Contract.allowance() — avoids a redundant approve
// when the router already has sufficient allowance.

import { encodeFunctionData, parseAbi } from 'viem';
import type { TradeExecutorContext, TradeExecutionResult } from '@sponsorcoin/spcoin-common';
import {
  UNISWAP_V3_FEE_TIERS,
  getUniswapV3Addresses,
  toPoolTokenAddress,
  isNativeToken,
} from '../uniswap/addresses';
import { erc20Abi } from '../uniswap/abi/swapRouter02Abi';

const SWAP_ROUTER_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path,address recipient,uint256 amountIn,uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)',
]);

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
export async function executeUniswapV3Swap({
  chainId,
  tokenIn,
  tokenOut,
  amountIn,
  amountOutMinimum,
  recipient,
  fee = UNISWAP_V3_FEE_TIERS.MEDIUM,
  context,
  rpcUrl,
}: ExecuteUniswapV3SwapParams): Promise<ExecuteUniswapV3SwapResult> {
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
  const poolTokenOut = toPoolTokenAddress(tokenOut, chainId);

  let approvalSubmitted = false;

  // Native ETH needs no approval at all — SwapRouter02 pulls it via `value`,
  // never `transferFrom`. Only a real ERC-20 sell needs an allowance.
  if (!isNativeIn) {
    const ownerAddress = context.account.address ?? '';
    console.log('[DEBUG executeUniswapV3Swap] about to encode allowance, erc20Abi type:', typeof erc20Abi, 'isArray:', Array.isArray(erc20Abi), 'length:', erc20Abi.length, 'firstEl type:', typeof erc20Abi[0]);
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
      // eth_call failed — proceed with approve
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

  // Build exactInputSingle params and encode the calldata
  const params = {
    tokenIn: poolTokenIn as `0x${string}`,
    tokenOut: poolTokenOut as `0x${string}`,
    fee,
    recipient: recipient as `0x${string}`,
    amountIn,
    amountOutMinimum,
    sqrtPriceLimitX96: 0n,
  };

  // 2026-09-27, fix — formatUnits returned a decimal string like "0.023...",
  // which BigInt() cannot parse (throws RangeError). Pass the raw bigint
  // (wei) directly — the ethers executor does BigInt(value) itself.
  console.log('[DEBUG executeUniswapV3Swap] about to encode exactInputSingle, SWAP_ROUTER_ABI:', SWAP_ROUTER_ABI);
  const swapCalldata = encodeFunctionData({
    abi: SWAP_ROUTER_ABI,
    functionName: 'exactInputSingle',
    args: [params],
  });

  const value = isNativeIn ? amountIn : 0n;

  // 2026-09-27, fix — formatUnits returned a decimal string like "0.023...",
  // which BigInt() cannot parse (throws RangeError). Pass the raw bigint
  // (wei) directly — the ethers executor does BigInt(value) itself.
  const result = await context.executor.execute({
    to: addresses.swapRouter02,
    data: swapCalldata,
    value: value > 0n ? value : undefined,
    chainId,
    rpcUrl,
    display: {
      label: 'Uniswap V3 Swap',
      contractAddress: addresses.swapRouter02,
      title: 'Confirm Swap',
      skipMandatoryApprovalGate: true,
    },
  });

  return {
    transactionHash: result.transactionHash,
    receipt: result.receipt,
    approvalSubmitted,
  };
}
