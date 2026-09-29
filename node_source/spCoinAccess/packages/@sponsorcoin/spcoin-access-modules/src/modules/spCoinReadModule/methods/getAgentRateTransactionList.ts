// @ts-nocheck
export async function getAgentTransactionList(context, _sponsorKey, _recipientKey, _recipientRateKey, _agentKey) {
    const runtime = context;
    runtime.spCoinLogger.logFunctionHeader("getAgentTransactionList(" + ", " + _sponsorKey + ", " + _recipientKey + ", " + _recipientRateKey + ", " + _agentKey + ")");
    const agentRateList = await runtime.getAgentRateList(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
    const agentTransactionList = [];
    for (const [, agentRateKey] of Object.entries(agentRateList)) {
        const agentTransaction = await runtime.getAgentTransaction(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey, agentRateKey);
        agentTransactionList.push(agentTransaction);
    }
    runtime.spCoinLogger.logExitFunction();
    return agentTransactionList;
}

