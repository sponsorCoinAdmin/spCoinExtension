// @ts-nocheck
export const claimOnChainRecipientRewards = async (context, accountKey) => {
    context.spCoinLogger.logFunctionHeader("claimOnChainRecipientRewards(accountKey)");
    const tx = await context.spCoinContractDeployed.claimOnChainRecipientRewards(accountKey);
    context.spCoinLogger.logExitFunction();
    return tx;
};
