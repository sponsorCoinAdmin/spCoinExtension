// @ts-nocheck
export const getStakingRewards = async (context, lastUpdateTime, interestRate, quantity) => {
    const stakingRewards = await context.spCoinContractDeployed.getStakingRewards(lastUpdateTime, interestRate, quantity);
    context.spCoinLogger.logExitFunction();
    return stakingRewards;
};
