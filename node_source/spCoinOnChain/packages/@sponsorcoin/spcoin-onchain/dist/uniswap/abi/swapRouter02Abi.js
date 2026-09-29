// File: uniswap/abi/swapRouter02Abi.ts
// Portable Uniswap V3 SwapRouter02 ABI slice (2026-09-26, Phase 4).
// Ported from web-app-local lib/uniswap/abi/swapRouter02Abi.ts — plain ABI
// array, zero app-specific coupling.
import { parseAbi } from 'viem';
export const swapRouter02Abi = [
    'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
    'function exactInput((bytes path,address recipient,uint256 amountIn,uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)',
];
export const erc20Abi = parseAbi([
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',
]);
