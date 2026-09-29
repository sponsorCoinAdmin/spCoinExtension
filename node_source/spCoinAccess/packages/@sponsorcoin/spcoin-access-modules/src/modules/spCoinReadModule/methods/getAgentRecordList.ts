// @ts-nocheck
export async function getAgentRecordList(context, _sponsorKey, _recipientKey, _recipientRateKey, _agentAccountList) {
    const runtime = context;
    runtime.spCoinLogger.logFunctionHeader("getAgentRecordList = async(" + _sponsorKey + ", " + _recipientKey + ", " + _recipientRateKey + ")");
    const agentRecordList = [];
    for (const [, agentKey] of Object.entries(_agentAccountList)) {
        const agentRecord = await runtime.getAgent(_sponsorKey, _recipientKey, _recipientRateKey, agentKey);
        agentRecordList.push(agentRecord);
    }
    runtime.spCoinLogger.logExitFunction();
    return agentRecordList;
}

