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
import { encodeFunctionData, parseAbi, formatUnits } from 'viem';
import { UNISWAP_V3_FEE_TIERS, getUniswapV3Addresses, toPoolTokenAddress, isNativeToken, } from '../uniswap/addresses';
import { erc20Abi } from '../uniswap/abi/swapRouter02Abi';
const SWAP_ROUTER_ABI = parseAbi([
    'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) external payable returns (uint256 amountOut)',
    'function exactInput((bytes path,address recipient,uint256 amountIn,uint256 amountOutMinimum) params) external payable returns (uint256 amountOut)',
]);
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
export async function executeUniswapV3Swap({ chainId, tokenIn, tokenOut, amountIn, amountOutMinimum, recipient, fee = UNISWAP_V3_FEE_TIERS.MEDIUM, context, rpcUrl, }) {
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
            // eth_call failed — proceed with approve
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
    // Build exactInputSingle params and encode the calldata
    const params = {
        tokenIn: poolTokenIn,
        tokenOut: poolTokenOut,
        fee,
        recipient: recipient,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
    };
    const swapCalldata = encodeFunctionData({
        abi: SWAP_ROUTER_ABI,
        functionName: 'exactInputSingle',
        args: [params],
    });
    const value = isNativeIn ? amountIn : 0n;
    const result = await context.executor.execute({
        to: addresses.swapRouter02,
        data: swapCalldata,
        value: value > 0n ? formatUnits(value, 18) : undefined,
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
