// @ts-nocheck
export const getAccountTimeInSecondeSinceUpdate = async (context, _tokenLastUpdate) => {
    const timeInSecondeSinceUpdate = await context.spCoinContractDeployed.getAccountTimeInSecondeSinceUpdate(_tokenLastUpdate);
    context.spCoinLogger.logExitFunction();
    return timeInSecondeSinceUpdate;
};
