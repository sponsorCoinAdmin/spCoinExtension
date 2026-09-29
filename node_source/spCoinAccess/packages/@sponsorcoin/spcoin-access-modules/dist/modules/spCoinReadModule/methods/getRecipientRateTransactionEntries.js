// @ts-nocheck
export async function getRecipientTransactionEntries(context, _sponsorCoin, _recipientKey, _recipientRateKey) {
    context.spCoinLogger.logFunctionHeader("getRecipientTransactionEntries = async(" + _recipientKey + ", " + _recipientRateKey + ")");
    let transactionRecords = [];
    try {
        const transactionCount = await context.spCoinContractDeployed.getRecipientTransactionCount(_sponsorCoin, _recipientKey, _recipientRateKey);
        for (let transactionIndex = 0; transactionIndex < Number(transactionCount || 0); transactionIndex++) {
            const [insertionTime, stakingRewards] = await context.spCoinContractDeployed.getRecipientTransactionAt(_sponsorCoin, _recipientKey, _recipientRateKey, transactionIndex);
            transactionRecords.push({
                insertionTime: String(insertionTime),
                stakingRewards: String(stakingRewards),
            });
        }
    }
    catch (_error) {
        transactionRecords = [];
    }
    context.spCoinLogger.logExitFunction();
    return context.spCoinSerialize.mapTransactionRecords(transactionRecords);
}
