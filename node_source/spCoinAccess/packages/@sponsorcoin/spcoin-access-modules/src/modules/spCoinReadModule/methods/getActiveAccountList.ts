// @ts-nocheck
import { getAccountKeys } from "./getMasterAccountList";

function toBigIntValue(value) {
    try {
        return BigInt(String(value ?? "0"));
    } catch (_error) {
        return 0n;
    }
}

function accountRecordHasActiveLinks(record) {
    const source = record && typeof record === "object" ? record : [];
    return (
        toBigIntValue(source.sponsorCount ?? source[5]) > 0n ||
        toBigIntValue(source.recipientCount ?? source[6]) > 0n ||
        toBigIntValue(source.agentCount ?? source[7]) > 0n ||
        toBigIntValue(source.parentRecipientCount ?? source[8]) > 0n
    );
}

export async function getActiveAccountKeys(context) {
    context.spCoinLogger.logFunctionHeader("getActiveAccountKeys = async()");
    if (typeof context.spCoinContractDeployed.getActiveAccountKeys === "function") {
        const activeAccountList = await context.spCoinContractDeployed.getActiveAccountKeys();
        context.spCoinLogger.logExitFunction();
        return activeAccountList;
    }
    if (typeof context.spCoinContractDeployed.getAccountRecord !== "function") {
        throw new Error("getActiveAccountKeys requires getMasterAccountKeys() and getAccountRecord().");
    }
    const masterAccountList = await getAccountKeys(context);
    const activeAccountList = [];
    for (const accountKey of masterAccountList) {
        const accountRecord = await context.spCoinContractDeployed.getAccountRecord(accountKey);
        if (accountRecordHasActiveLinks(accountRecord)) {
            activeAccountList.push(accountKey);
        }
    }
    context.spCoinLogger.logExitFunction();
    return activeAccountList;
}

export const getActiveAccountList = getActiveAccountKeys;
