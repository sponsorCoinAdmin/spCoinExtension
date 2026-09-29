// @ts-nocheck
export async function getAgentTransactionEntries(context, _sponsorCoin, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey) {
    context.spCoinLogger.logFunctionHeader("getAgentTransactionEntries = async(" + _recipientKey + ", " + _recipientRateKey + ", " + _agentKey + ", " + _agentRateKey + ")");
    let transactionRecords = [];
    try {
        const transactionCount = await context.spCoinContractDeployed.getAgentTransactionCount(_sponsorCoin, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey);
        for (let transactionIndex = 0; transactionIndex < Number(transactionCount || 0); transactionIndex++) {
            const [insertionTime, stakingRewards] = await context.spCoinContractDeployed.getAgentTransactionAt(_sponsorCoin, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey, transactionIndex);
            transactionRecords.push({
                insertionTime: String(insertionTime),
                stakingRewards: String(stakingRewards),
            });
        }
    }
    catch (_error) {
        transactionRecords = [];
    }
    context.spCoinLogger.logExitFunction();
    return context.spCoinSerialize.mapTransactionRecords(transactionRecords);
}
