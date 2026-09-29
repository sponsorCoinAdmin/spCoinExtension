// @ts-nocheck
export async function getRecipientRateAgentKeys(context, _sponsorKey, _recipientKey, _recipientRateKey) {
    context.spCoinLogger.logFunctionHeader("getRecipientRateAgentKeys = async(" + _sponsorKey + ", " + _recipientKey + ", " + _recipientRateKey + ")");
    let agentKeys = [];
    try {
        agentKeys = await context.spCoinContractDeployed.getRecipientRateAgentList(_sponsorKey, _recipientKey, _recipientRateKey);
    }
    catch (_error) {
        agentKeys = [];
    }
    context.spCoinLogger.logExitFunction();
    return agentKeys;
}

export const getRecipientRateAgentList = getRecipientRateAgentKeys;

