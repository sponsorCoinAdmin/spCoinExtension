// File: index.ts
// Public barrel for @sponsorcoin/spcoin-onchain.
//
  // Portable on-chain transaction execution primitives (swap, stake, approve).
  // All execution modules use TradeExecutor (defined in @sponsorcoin/spcoin-common)
  // — a signer-agnostic interface each platform implements.

// Trade execution primitives
export {
  executeErc20Approve,
  type ExecuteErc20ApproveParams,
  type ExecuteErc20ApproveResult,
} from './trade/executeErc20Approve';

export {
  executeUniswapV3Swap,
  type ExecuteUniswapV3SwapParams,
  type ExecuteUniswapV3SwapResult,
} from './trade/executeUniswapV3Swap';

export {
  executeMultiHopUniswapV3Swap,
  type ExecuteMultiHopUniswapV3SwapParams,
  type ExecuteMultiHopUniswapV3SwapResult,
} from './trade/executeMultiHopUniswapV3Swap';

export {
  executeStakeTransactionCore,
  snapRateToIncrement,
  type ExecuteStakeTransactionCoreParams,
  type ExecuteStakeTransactionResult,
  type RunScriptParams,
  type ReadStepFn,
} from './trade/executeStakeTransactionCore';

// Re-export uniswap infrastructure (addresses, ABI, path encoding) —
// kept separate from trade primitives so callers importing only the
// uniswap config/helpers don't pull in the execution modules.
export {
  NATIVE_TOKEN_ADDRESS,
  UNISWAP_V3_FEE_TIERS,
  isNativeToken,
  isUniswapV3VerifiedChainId,
  getUniswapV3Addresses,
  getWrappedNativeAddress,
  toPoolTokenAddress,
  type UniswapV3ChainAddresses,
} from './uniswap/addresses';
export { encodeMultiHopPath, encodeSingleHopThroughPath, type MultiHopPathParams } from './uniswap/multiHopPath';
export { erc20Abi, swapRouter02Abi } from './uniswap/abi/swapRouter02Abi';
