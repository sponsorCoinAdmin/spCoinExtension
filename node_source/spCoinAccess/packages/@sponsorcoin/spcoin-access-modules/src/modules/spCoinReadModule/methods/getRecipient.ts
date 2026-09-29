// @ts-nocheck
import { RecipientStruct } from "../../../dataTypes/spCoinDataTypes";
import { bigIntToDateTimeString, bigIntToDecString, getLocation } from "../../../utils/dateTime";
export async function getRecipient(context, _sponsorKey, _recipientKey) {
    const runtime = context;
    runtime.spCoinLogger.logFunctionHeader("getRecipient = async(" + _sponsorKey + "," + _recipientKey + ")");
    const recipientRecord = new RecipientStruct();
    recipientRecord.recipientKey = _recipientKey;
    const recordStr = await runtime.spCoinSerialize.getRecipientRecordFields(_sponsorKey, _recipientKey);
    recipientRecord.creationTime = bigIntToDateTimeString(recordStr[0]);
    recipientRecord.location = getLocation();
    recipientRecord.stakedSPCoins = bigIntToDecString(recordStr[1]);
    runtime.spCoinLogger.logExitFunction();
    return recipientRecord;
}

