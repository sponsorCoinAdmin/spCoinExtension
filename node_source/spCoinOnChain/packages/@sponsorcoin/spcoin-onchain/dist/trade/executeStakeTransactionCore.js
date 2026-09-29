// File: trade/executeStakeTransactionCore.ts
// Portable core of the real on-chain stake write (2026-09-26, Phase 4).
// Ported from web-app-local lib/spCoin/executeStakeTransactionCore.ts.
//
// Key change: uses TradeExecutor (signer-agnostic send + eth_call) instead
// of ethers Contract + Signer directly. The spCoin contract ABI is passed
// as a parameter (loaded by the caller via their own ABI-loading logic),
// and the read-step calls are injected as a function so the extension
// can use its own cross-origin fetch pattern.
import { encodeFunctionData, formatUnits } from 'viem';
/**
 * Snaps a desired rate to the nearest value that is both within [lowerBound,
 * upperBound] and a whole number of `increment` steps from lowerBound —
 * mirrors Security.sol's validate*RateRange + rateMatchesIncrement checks,
 * so a submitted rate key can't revert for being off-grid.
 */
export function snapRateToIncrement(desired, lowerBound, upperBound, increment) {
    if (!Number.isFinite(desired))
        return lowerBound;
    if (!(increment > 0))
        return Math.min(Math.max(Math.round(desired), lowerBound), upperBound);
    const steps = Math.round((desired - lowerBound) / increment);
    const snapped = lowerBound + steps * increment;
    return Math.min(Math.max(snapped, lowerBound), upperBound);
}
async function resolveRecipientRateKey(desiredRateKey, range, readParams, readStep) {
    const [lower, upper] = range;
    const incrementResult = await readStep(readParams, 'getRecipientRateIncrement');
    const increment = Number(incrementResult ?? 0);
    return String(snapRateToIncrement(desiredRateKey, lower, upper, increment));
}
async function resolveAgentRateKey(desiredRateKey, range, readParams, readStep) {
    const [lower, upper] = range;
    const incrementResult = await readStep(readParams, 'getAgentRateIncrement');
    const increment = Number(incrementResult ?? 0);
    return String(snapRateToIncrement(desiredRateKey, lower, upper, increment));
}
/**
 * The portable core of the on-chain stake write. Resolves rate keys against
 * the contract's real increment grid, builds calldata via viem
 * encodeFunctionData (signer-free), and sends via TradeExecutor.execute().
 *
 * The rate-key RPC reads happen BEFORE the execute() call — same ordering
 * as the original (getConnectedSigner ran before rate-key reads), so the
 * approval UI doesn't wait on network round-trips it doesn't need.
 */
export async function executeStakeTransactionCore({ recipientKey, agentKey, amountRaw, desiredRecipientRateKey, desiredAgentRateKey, recipientRateRange, agentRateRange, readParams, abi, readStep, chainId, context, onConfirmed, displayAccounts, }) {
    if (amountRaw <= 0n) {
        throw new Error('Enter an amount to stake.');
    }
    if (!recipientKey) {
        throw new Error('Select a recipient before staking.');
    }
    const hasAgent = Boolean(agentKey);
    const methodName = hasAgent ? 'sponsorAgentTransaction' : 'sponsorRecipientTransaction';
    // Resolve rate keys via injected read-step (calls /api/spCoin/run-script)
    const recipientRateKey = await resolveRecipientRateKey(desiredRecipientRateKey, recipientRateRange, readParams, readStep);
    const agentRateKey = hasAgent
        ? await resolveAgentRateKey(desiredAgentRateKey, agentRateRange, readParams, readStep)
        : '';
    // Build calldata via viem encodeFunctionData (signer-free).
    // abi is viem's Abi type (portable, no ethers dependency).
    let calldata;
    if (hasAgent) {
        calldata = encodeFunctionData({
            abi,
            functionName: 'sponsorAgentTransaction',
            args: [recipientKey, recipientRateKey, agentKey, agentRateKey, amountRaw],
        });
    }
    else {
        calldata = encodeFunctionData({
            abi,
            functionName: 'sponsorRecipientTransaction',
            args: [recipientKey, recipientRateKey, amountRaw],
        });
    }
    // Execute via TradeExecutor (web: ethers Signer; ext: meritSign.ts)
    const result = await context.executor.execute({
        to: readParams.contractAddress,
        data: calldata,
        chainId,
        rpcUrl: readParams.rpcUrl,
        display: {
            label: methodName,
            contractAddress: readParams.contractAddress,
            title: 'Staking Transaction',
            skipMandatoryApprovalGate: true,
            amount: {
                label: 'Stake spCoin',
                value: formatUnits(amountRaw, 18),
            },
            ...(displayAccounts ? { accounts: displayAccounts } : {}),
        },
    });
    await onConfirmed?.();
    return {
        transactionHash: result.transactionHash,
        receipt: result.receipt,
        recipientRateKey,
        agentRateKey,
        methodName,
    };
}
