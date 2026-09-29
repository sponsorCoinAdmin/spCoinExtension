// @ts-nocheck
export async function getAgentTransactionIdKeys(
    context,
    _sponsorKey,
    _recipientKey,
    _recipientRateKey,
    _agentKey,
    _agentRateKey,
) {
    context.spCoinLogger.logFunctionHeader(
        "getAgentTransactionIdKeys = async(" +
            _sponsorKey + ", " +
            _recipientKey + ", " +
            _recipientRateKey + ", " +
            _agentKey + ", " +
            _agentRateKey + ")"
    );
    if (typeof context.spCoinContractDeployed.getAgentTransactionIdKeys !== "function") {
        throw new Error("SpCoin contract does not expose getAgentTransactionIdKeys().");
    }
    const transactionIds = await context.spCoinContractDeployed.getAgentTransactionIdKeys(
        _sponsorKey,
        _recipientKey,
        _recipientRateKey,
        _agentKey,
        _agentRateKey,
    );
    context.spCoinLogger.logExitFunction();
    return transactionIds;
}
