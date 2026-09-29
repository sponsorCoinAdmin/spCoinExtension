// @ts-nocheck
export const claimOnChainSponsorRewards = async (context, accountKey) => {
    context.spCoinLogger.logFunctionHeader("claimOnChainSponsorRewards(accountKey)");
    const tx = await context.spCoinContractDeployed.claimOnChainSponsorRewards(accountKey);
    context.spCoinLogger.logExitFunction();
    return tx;
};
