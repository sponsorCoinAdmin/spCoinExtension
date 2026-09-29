// @ts-nocheck
export async function getRecipientTransactionIdKeys(context, _sponsorKey, _recipientKey, _recipientRateKey) {
    context.spCoinLogger.logFunctionHeader(
        "getRecipientTransactionIdKeys = async(" + _sponsorKey + ", " + _recipientKey + ", " + _recipientRateKey + ")"
    );
    if (typeof context.spCoinContractDeployed.getRecipientTransactionIdKeys !== "function") {
        throw new Error("SpCoin contract does not expose getRecipientTransactionIdKeys().");
    }
    const transactionIds = await context.spCoinContractDeployed.getRecipientTransactionIdKeys(
        _sponsorKey,
        _recipientKey,
        _recipientRateKey,
    );
    context.spCoinLogger.logExitFunction();
    return transactionIds;
}
