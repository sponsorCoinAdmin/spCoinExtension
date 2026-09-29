// @ts-nocheck
export const claimOnChainTotalRewards = async (context, accountKey) => {
    context.spCoinLogger.logFunctionHeader("claimOnChainTotalRewards(accountKey)");
    const tx = await context.spCoinContractDeployed.claimOnChainTotalRewards(accountKey);
    context.spCoinLogger.logExitFunction();
    return tx;
};
