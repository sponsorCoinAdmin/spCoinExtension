// @ts-nocheck
export const depositRecipientStakingRewards = async (context, _sponsorAccount, _recipientAccount, _recipientRate, _amount) => {
    context.spCoinLogger.logFunctionHeader("depositRecipientStakingRewards = async(" +
        _sponsorAccount + ", " +
        _recipientAccount + ", " +
        _recipientRate + ", " +
        _amount + ")");
    context.spCoinLogger.logExitFunction();
    throw new Error("depositStakingRewards is internal-only on the current SpCoin contract. Use claimOnChainTotalRewards instead.");
};
