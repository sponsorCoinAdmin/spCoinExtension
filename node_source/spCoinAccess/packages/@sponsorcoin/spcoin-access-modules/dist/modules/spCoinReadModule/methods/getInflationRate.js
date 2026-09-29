// @ts-nocheck
export async function getInflationRate(context) {
    context.spCoinLogger.logFunctionHeader("getInflationRate()");
    const readInflationRate = context.spCoinContractDeployed?.getInflationRate;
    try {
        const result = typeof readInflationRate === "function"
            ? await readInflationRate.call(context.spCoinContractDeployed)
            : 0;
        context.spCoinLogger.logExitFunction();
        return result;
    }
    catch (error) {
        context.spCoinLogger.logExitFunction();
        throw error;
    }
}
