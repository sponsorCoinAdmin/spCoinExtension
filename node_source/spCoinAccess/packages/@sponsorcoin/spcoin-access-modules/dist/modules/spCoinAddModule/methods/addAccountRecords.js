// @ts-nocheck
export const addAccountRecords = async (context, _accountListKeys) => {
    context.spCoinLogger.logFunctionHeader("addAccountRecord = async(arrayAccounts)");
    const maxCount = _accountListKeys.length;
    context.spCoinLogger.logDetail("JS => Inserting " + maxCount + " Records to Blockchain Network");
    for (let idx = 0; idx < maxCount; idx++) {
        const account = _accountListKeys[idx];
        context.spCoinLogger.logDetail("JS => Inserting " + idx + ", " + account);
        await context.spCoinContractDeployed.addAccountRecord(account);
    }
    context.spCoinLogger.logDetail("JS => Inserted " + maxCount + " Account to Blockchain Network");
    context.spCoinLogger.logExitFunction();
    return maxCount;
};
