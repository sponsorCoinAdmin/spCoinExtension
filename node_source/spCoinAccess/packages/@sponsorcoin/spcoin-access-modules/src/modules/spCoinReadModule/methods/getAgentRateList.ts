// @ts-nocheck
export async function getAgentRateKeys(context, _sponsorKey, _recipientKey, _recipientRateKey, _agentKey) {
    context.spCoinLogger.logFunctionHeader("getAgentRateKeys = async(" + _sponsorKey + ", " + _recipientKey + ", " + _recipientRateKey + ", " + _agentKey + ")");
    const networkRateKeys = await context.spCoinContractDeployed.getAgentRateList(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey);
    const agentRateList = [];
    for (const [, netWorkRateKey] of Object.entries(networkRateKeys)) {
        agentRateList.push(netWorkRateKey);
    }
    context.spCoinLogger.logExitFunction();
    return agentRateList;
}

export const getAgentRateList = getAgentRateKeys;

