// @ts-nocheck
export const claimOnChainAgentRewards = async (context, accountKey) => {
    context.spCoinLogger.logFunctionHeader("claimOnChainAgentRewards(accountKey)");
    const tx = await context.spCoinContractDeployed.claimOnChainAgentRewards(accountKey);
    context.spCoinLogger.logExitFunction();
    return tx;
};
