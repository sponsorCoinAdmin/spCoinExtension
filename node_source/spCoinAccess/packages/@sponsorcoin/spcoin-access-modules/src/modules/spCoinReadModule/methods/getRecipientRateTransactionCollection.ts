// @ts-nocheck
export async function getRecipientTransactionList(context, _sponsorKey, _recipientKey) {
    const runtime = context;
    runtime.spCoinLogger.logFunctionHeader("getRecipientTransactionList = async(" + _sponsorKey + "," + _recipientKey + ")");
    const networkRateList = await runtime.getRecipientRateList(_sponsorKey, _recipientKey);
    const recipientTransactionList = [];
    for (const [, recipientRateKey] of Object.entries(networkRateList)) {
        const recipientTransaction = await runtime.getRecipientTransaction(_sponsorKey, _recipientKey, recipientRateKey);
        recipientTransactionList.push(recipientTransaction);
    }
    runtime.spCoinLogger.logExitFunction();
    return recipientTransactionList;
}

