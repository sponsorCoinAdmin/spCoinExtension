// @ts-nocheck
import { RecipientRateStruct } from "../../../dataTypes/spCoinDataTypes";
import { bigIntToDateTimeString, bigIntToDecString } from "../../../utils/dateTime";
export async function getRecipientTransaction(context, _sponsorKey, _recipientKey, _recipientRateKey) {
    const runtime = context;
    runtime.spCoinLogger.logFunctionHeader("getRecipientTransaction(" + _sponsorKey + _recipientKey + ", " + _recipientRateKey + ")");
    const recipientTransaction = new RecipientRateStruct();
    let inserted = false;
    let recordStr = ["0", "0", "0"];
    try {
        const core = await runtime.spCoinContractDeployed.getRecipientTransaction(_sponsorKey, _recipientKey, _recipientRateKey);
        inserted = Boolean(core?.[6]);
        if (inserted) {
            recordStr = [
                String(core?.[3] ?? "0"),
                String(core?.[4] ?? "0"),
                String(core?.[5] ?? "0"),
            ];
        }
    }
    catch (_error) {
        inserted = false;
        recordStr = ["0", "0", "0"];
    }
    if (!inserted) {
        try {
            recordStr = await runtime.spCoinSerialize.getRecipientTransactionFields(_sponsorKey, _recipientKey, _recipientRateKey);
            inserted = !((recordStr[0] || "0") === "0" && (recordStr[1] || "0") === "0" && (recordStr[2] || "0") === "0");
        }
        catch (_error) {
            inserted = false;
            recordStr = ["0", "0", "0"];
        }
    }
    recipientTransaction.recipientRate = _recipientRateKey;
    recipientTransaction.inserted = inserted;
    recipientTransaction.creationTime = inserted ? bigIntToDateTimeString(recordStr[0]) : "";
    recipientTransaction.lastUpdateTime = inserted ? bigIntToDateTimeString(recordStr[1]) : "";
    recipientTransaction.stakedSPCoins = bigIntToDecString(recordStr[2]);
    runtime.spCoinLogger.logExitFunction();
    return recipientTransaction;
}

