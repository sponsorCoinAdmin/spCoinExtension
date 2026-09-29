// File: trade/executeErc20Approve.ts
// Portable ERC20 approve execution (2026-09-26, Phase 4 start).
//
// Ported from web-app-local lib/spCoin/executeErc20Approve.ts. Key change:
// uses TradeExecutor (signer-agnostic send + eth_call) instead of ethers
// Contract + Signer directly, so the extension (meritSign.ts POST path)
// and web app (ethers Signer path) share one implementation.
//
// Calldata is built with viem's encodeFunctionData (signer-free, imported
// from the already-viem peer dep), then executed via TradeExecutor.execute().
// The allowance check uses TradeExecutor.call() (eth_call) before submitting,
// same as the original Contract.allowance() — avoids a redundant approve
// when the router already has sufficient allowance.
import { encodeFunctionData, parseAbi } from 'viem';
const ERC20_ABI = parseAbi([
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function approve(address spender, uint256 amount) external returns (bool)',
]);
/**
 * Portable ERC20 approve() execution — same shape as the web-app-local
 * original, but signer-agnostic via TradeExecutor.
 *
 * The allow-check-then-approve pattern mirrors executeUniswapV3Swap.ts's
 * own pre-swap allowance flow: read current allowance via eth_call, skip
 * the approve if the router already has enough.
 */
export async function executeErc20Approve({ tokenAddress, spenderAddress, amountRaw, context, rpcUrl, chainId, }) {
    if (amountRaw <= 0n) {
        throw new Error('Enter an amount to approve.');
    }
    if (!tokenAddress) {
        throw new Error('No token selected to approve.');
    }
    if (!spenderAddress) {
        throw new Error('Spender contract is not ready yet.');
    }
    if (!rpcUrl) {
        throw new Error('RPC URL is not ready yet.');
    }
    const ownerAddress = context.account.address ?? '';
    // Check current allowance via eth_call before approving
    const allowanceCalldata = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [ownerAddress, spenderAddress],
    });
    let currentAllowance = 0n;
    try {
        const allowanceResult = await context.executor.call({
            to: tokenAddress,
            data: allowanceCalldata,
            chainId,
            rpcUrl,
        });
        if (allowanceResult && allowanceResult.length >= 64) {
            currentAllowance = BigInt(allowanceResult);
        }
    }
    catch {
        // eth_call failed — proceed with approve; if it reverts, the
        // execute() call below surfaces the real error.
    }
    if (currentAllowance >= amountRaw) {
        // Sufficient allowance already — no approve needed. Matches the
        // original's approvalSubmitted = false path.
        return {
            transactionHash: '',
            receipt: null,
            approvalSubmitted: false,
            allowance: currentAllowance,
        };
    }
    // Build approve() calldata
    const approveCalldata = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, amountRaw],
    });
    const result = await context.executor.execute({
        to: tokenAddress,
        data: approveCalldata,
        chainId,
        rpcUrl,
        display: {
            label: 'ERC20 Approve',
            contractAddress: tokenAddress,
            amount: {
                label: 'Approve',
                value: amountRaw.toString(),
            },
        },
    });
    return {
        transactionHash: result.transactionHash,
        receipt: result.receipt,
        approvalSubmitted: true,
        allowance: amountRaw,
    };
}
