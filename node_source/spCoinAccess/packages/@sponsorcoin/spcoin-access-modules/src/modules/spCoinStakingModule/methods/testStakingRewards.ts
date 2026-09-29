// @ts-nocheck
export const testStakingRewards = async (context, lastUpdateTime, testUpdateTime, interestRate, quantity) => {
    const stakingRewards = await context.spCoinContractDeployed.testStakingRewards(lastUpdateTime, testUpdateTime, interestRate, quantity);
    context.spCoinLogger.logExitFunction();
    return stakingRewards;
};

