// @ts-nocheck
export async function getTransactionRecord(context, transactionId) {
    context.spCoinLogger.logFunctionHeader("getTransactionRecord = async(" + transactionId + ")");
    if (typeof context.spCoinContractDeployed.getTransactionRecord !== "function") {
        throw new Error("SpCoin contract does not expose getTransactionRecord().");
    }
    const transactionRecord = await context.spCoinContractDeployed.getTransactionRecord(transactionId);
    context.spCoinLogger.logExitFunction();
    return transactionRecord;
}
