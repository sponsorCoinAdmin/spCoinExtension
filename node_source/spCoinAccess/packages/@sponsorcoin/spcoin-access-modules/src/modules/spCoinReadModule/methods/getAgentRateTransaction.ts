// @ts-nocheck
import { AgentRateStruct } from "../../../dataTypes/spCoinDataTypes";
import { bigIntToDateTimeString, bigIntToDecString } from "../../../utils/dateTime";
export async function getAgentTransaction(context, _sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey) {
    const runtime = context;
    runtime.spCoinLogger.logFunctionHeader("getAgentTransaction(" + _sponsorKey + ", " + _recipientKey + ", " + _agentKey + ", " + _agentRateKey + ")");
    const agentTransaction = new AgentRateStruct();
    let inserted = false;
    let recordStr = ["0", "0", "0"];
    try {
        const core = await runtime.spCoinContractDeployed.getAgentTransaction(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey);
        inserted = Boolean(core?.[8]);
        if (inserted) {
            recordStr = [
                String(core?.[5] ?? "0"),
                String(core?.[6] ?? "0"),
                String(core?.[7] ?? "0"),
            ];
        }
    }
    catch (_error) {
        inserted = false;
        recordStr = ["0", "0", "0"];
    }
    if (!inserted) {
        try {
            recordStr = await runtime.spCoinSerialize.getAgentTransactionFields(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey);
            inserted = !((recordStr[0] || "0") === "0" && (recordStr[1] || "0") === "0" && (recordStr[2] || "0") === "0");
        }
        catch (_error) {
            inserted = false;
            recordStr = ["0", "0", "0"];
        }
    }
    agentTransaction.agentRate = _agentRateKey;
    agentTransaction.inserted = inserted;
    agentTransaction.creationTime = inserted ? bigIntToDateTimeString(recordStr[0]) : "";
    agentTransaction.lastUpdateTime = inserted ? bigIntToDateTimeString(recordStr[1]) : "";
    agentTransaction.stakedSPCoins = bigIntToDecString(recordStr[2]);
    runtime.spCoinLogger.logExitFunction();
    return agentTransaction;
}

