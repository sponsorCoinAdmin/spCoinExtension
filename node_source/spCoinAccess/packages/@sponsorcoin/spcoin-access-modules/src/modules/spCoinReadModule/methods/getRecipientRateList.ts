// @ts-nocheck
function stringifyBigIntSafe(value) {
    return JSON.stringify(value, (_key, candidate) =>
        typeof candidate === "bigint" ? candidate.toString() : candidate
    );
}

export async function getRecipientRateKeys(context, _sponsorKey, _recipientKey) {
    context.spCoinLogger.logFunctionHeader("getRecipientRateKeys = async(" + _sponsorKey + "," + _recipientKey + ")");
    try {
        const runner = context?.spCoinContractDeployed?.runner;
        const provider = runner?.provider || runner;
        const providerType =
            provider?.constructor?.name ||
            runner?.constructor?.name ||
            typeof provider;
        const candidateUrl =
            provider?._getConnection?.()?.url ||
            provider?.connection?.url ||
            provider?._connection?.url ||
            runner?._getConnection?.()?.url ||
            runner?.connection?.url ||
            runner?._connection?.url ||
            "";
        context.spCoinLogger.logDetail("JS => getRecipientRateKeys provider = " + String(providerType || "(unknown)"));
        context.spCoinLogger.logDetail("JS => getRecipientRateKeys providerUrl = " + String(candidateUrl || "(unavailable)"));
        context.spCoinLogger.logDetail("JS => getRecipientRateKeys stage = send");
        const readMethod =
            typeof context.spCoinContractDeployed.getSponsorRecipientRates === "function"
                ? context.spCoinContractDeployed.getSponsorRecipientRates
                : typeof context.spCoinContractDeployed.getSponsorRecipientRateKeys === "function"
                    ? context.spCoinContractDeployed.getSponsorRecipientRateKeys
                : context.spCoinContractDeployed.getRecipientRateList;
        const networkRateKeys = await readMethod(_sponsorKey, _recipientKey);
        context.spCoinLogger.logDetail("JS => getRecipientRateKeys raw = " + stringifyBigIntSafe(networkRateKeys));
        const recipientRateList = [];
        for (const [, netWorkRateKey] of Object.entries(networkRateKeys)) {
            recipientRateList.push(netWorkRateKey);
        }
        context.spCoinLogger.logDetail("JS => getRecipientRateKeys normalized = " + stringifyBigIntSafe(recipientRateList));
        context.spCoinLogger.logExitFunction();
        return recipientRateList;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const runner = context?.spCoinContractDeployed?.runner;
        const provider = runner?.provider || runner;
        const providerType =
            provider?.constructor?.name ||
            runner?.constructor?.name ||
            typeof provider;
        const candidateUrl =
            provider?._getConnection?.()?.url ||
            provider?.connection?.url ||
            provider?._connection?.url ||
            runner?._getConnection?.()?.url ||
            runner?.connection?.url ||
            runner?._connection?.url ||
            "";
        context.spCoinLogger.logDetail("JS => getRecipientRateKeys failed provider = " + String(providerType || "(unknown)"));
        context.spCoinLogger.logDetail("JS => getRecipientRateKeys failed providerUrl = " + String(candidateUrl || "(unavailable)"));
        context.spCoinLogger.logDetail("JS => getRecipientRateKeys failed = " + message);
        throw new Error("getRecipientRateKeys(" + _sponsorKey + "," + _recipientKey + ") failed: " + message);
    }
}

export const getRecipientRateList = getRecipientRateKeys;
export const getSponsorRecipientRates = getRecipientRateKeys;
export const getSponsorRecipientRateKeys = getRecipientRateKeys;

