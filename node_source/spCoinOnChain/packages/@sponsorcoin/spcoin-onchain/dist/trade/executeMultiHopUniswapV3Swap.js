// File: trade/executeMultiHopUniswapV3Swap.ts
// Portable Uniswap V3 multi-hop swap execution (2026-09-26, Phase 4).
// Ported from web-app-local lib/uniswap/executeMultiHopUniswapV3Swap.ts.
// Key change: uses TradeExecutor instead of ethers Contract + Signer.
import { encodeFunctionData, parseAbi, formatUnits } from 'viem';
import { UNISWAP_V3_FEE_TIERS, getUniswapV3Addresses, toPoolTokenAddress, isNativeToken, } from '../uniswap/addresses';
import { encodeSingleHopThroughPath } from '../uniswap/multiHopPath';
import { erc20Abi } from '../uniswap/abi/swapRouter02Abi';
const SWAP_ROUTER_ABI = parseAbi([
    'function exactInput((bytes path,address recipient,uint256 amountIn,uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)',
]);
/**
 * Multi-hop counterpart to executeUniswapV3Swap — same approve-then-swap
 * structure, only the router call differs (exactInput + encoded path,
 * instead of exactInputSingle + token pair).
 *
 * Hardcoded to exactly one intermediate hop, matching the quote side.
 * Native-ETH-in handling mirrors the single-hop case — sent as `value`,
 * no separate wrap step.
 */
export async function executeMultiHopUniswapV3Swap({ chainId, tokenIn, through, tokenOut, amountIn, amountOutMinimum, recipient, feeIn = UNISWAP_V3_FEE_TIERS.MEDIUM, feeOut, context, rpcUrl, }) {
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
            args: [ownerAddress, addresses.swapRouter02],
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
        }
        catch {
            // proceeds with approve
        }
        if (currentAllowance < amountIn) {
            const approveCalldata = encodeFunctionData({
                abi: erc20Abi,
                functionName: 'approve',
                args: [addresses.swapRouter02, amountIn],
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
        through: poolThrough,
        tokenOut: poolTokenOut,
        feeIn,
        feeOut,
    });
    const swapCalldata = encodeFunctionData({
        abi: SWAP_ROUTER_ABI,
        functionName: 'exactInput',
        args: [{ path: path, recipient: recipient, amountIn, amountOutMinimum }],
    });
    const value = isNativeIn ? amountIn : 0n;
    const result = await context.executor.execute({
        to: addresses.swapRouter02,
        data: swapCalldata,
        value: value > 0n ? formatUnits(value, 18) : undefined,
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
