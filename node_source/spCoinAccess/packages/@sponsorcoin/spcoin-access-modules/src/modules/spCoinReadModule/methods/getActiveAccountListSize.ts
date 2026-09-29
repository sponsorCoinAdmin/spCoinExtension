// @ts-nocheck
export async function getActiveAccountCount(context) {
    const runtime = context;
    runtime.spCoinLogger.logFunctionHeader("getActiveAccountCount = async()");
    if (typeof runtime.spCoinContractDeployed.getActiveAccountCount === "function") {
        const activeCount = await runtime.spCoinContractDeployed.getActiveAccountCount();
        runtime.spCoinLogger.logExitFunction();
        return Number(activeCount ?? 0);
    }
    if (typeof runtime.getActiveAccountKeys !== "function") {
        throw new Error("getActiveAccountCount requires getActiveAccountCount() or getActiveAccountKeys().");
    }
    const activeCount = (await runtime.getActiveAccountKeys()).length;
    runtime.spCoinLogger.logExitFunction();
    return activeCount;
}

export const getActiveAccountListSize = getActiveAccountCount;
