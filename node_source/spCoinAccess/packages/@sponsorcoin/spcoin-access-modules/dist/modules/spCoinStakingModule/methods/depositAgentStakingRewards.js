// @ts-nocheck
export const depositAgentStakingRewards = async (context, _sponsorAccount, _recipientAccount, _recipientRate, _agentAccount, _agentRate, _amount) => {
    context.spCoinLogger.logFunctionHeader("depositAgentStakingRewards = async(" +
        _recipientAccount + ", " +
        _agentAccount + ", " +
        _agentRate + ", " +
        _amount + ")");
    context.spCoinLogger.logExitFunction();
    throw new Error("depositStakingRewards is internal-only on the current SpCoin contract. Use claimOnChainTotalRewards instead.");
};
