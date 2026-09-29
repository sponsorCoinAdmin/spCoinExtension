// @ts-nocheck
export async function getActiveAccountKeyAt(context, index) {
    context.spCoinLogger.logFunctionHeader("getActiveAccountKeyAt = async(" + index + ")");
    if (typeof context.spCoinContractDeployed.getActiveAccountKeyAt !== "function") {
        if (typeof context.getActiveAccountKeys !== "function") {
            throw new Error("getActiveAccountKeyAt requires getActiveAccountKeys().");
        }
        const activeAccountList = await context.getActiveAccountKeys();
        context.spCoinLogger.logExitFunction();
        return activeAccountList[Number(index)];
    }
    const activeAccountKey = await context.spCoinContractDeployed.getActiveAccountKeyAt(index);
    context.spCoinLogger.logExitFunction();
    return activeAccountKey;
}

export const getActiveAccountElement = getActiveAccountKeyAt;
