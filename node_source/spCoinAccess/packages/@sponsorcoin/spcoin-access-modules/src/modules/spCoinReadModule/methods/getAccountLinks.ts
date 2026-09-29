// @ts-nocheck
export async function getAccountLinks(context, accountKey) {
    context.spCoinLogger.logFunctionHeader("getAccountLinks(" + accountKey + ")");
    const readAccountLinks = context.spCoinContractDeployed?.getAccountLinks;
    try {
        const links = typeof readAccountLinks === "function"
            ? await readAccountLinks.call(context.spCoinContractDeployed, accountKey)
            : [];
        const toStrArray = (value) =>
            Array.from(new Set(Array.from(Array.isArray(value) ? value : []).map((entry) => String(entry ?? "").trim()).filter(Boolean)));
        const record = links ?? {};
        context.spCoinLogger.logExitFunction();
        return {
            sponsorKeys: toStrArray(record.sponsorKeys ?? record[0]),
            recipientKeys: toStrArray(record.recipientKeys ?? record[1]),
            agentKeys: toStrArray(record.agentKeys ?? record[2]),
            parentRecipientKeys: toStrArray(record.parentRecipientKeys ?? record[3]),
        };
    }
    catch (error) {
        context.spCoinLogger.logExitFunction();
        throw error;
    }
}
