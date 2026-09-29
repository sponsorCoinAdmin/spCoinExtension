// 2026-09-27, fix (live bug) — erc20Abi was exported as raw string fragments
// and passed directly to viem's encodeFunctionData() in executeUniswapV3Swap.ts,
// triggering "Cannot use 'in' operator to search for 'name' in function allowance(...)"
// because viem's ABI resolution hits a string fragment instead of a parsed AbiItem
// object. parseAbi() converts the fragments to proper Abi objects.
import { parseAbi } from 'viem';

export const swapRouter02Abi = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
  'function exactInput((bytes path,address recipient,uint256 amountIn,uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)',
]);

export const erc20Abi = parseAbi([
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
]);
