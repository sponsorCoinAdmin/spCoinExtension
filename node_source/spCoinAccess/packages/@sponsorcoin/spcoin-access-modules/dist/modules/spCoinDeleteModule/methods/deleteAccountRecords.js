// @ts-nocheck
export const deleteAccountRecords = async (context, _accountListKeys) => {
    context.spCoinLogger.logFunctionHeader("deleteAccountRecords = async(arrayAccounts)");
    const maxCount = _accountListKeys.length;
    context.spCoinLogger.logDetail("JS => Inserting " + maxCount + " Records to Blockchain Network");
    for (let idx = 0; idx < maxCount; idx++) {
        const accountKey = _accountListKeys[idx];
        context.spCoinLogger.logDetail("JS => Deleting " + idx + ", " + accountKey);
        await context.deleteAccountRecord(accountKey);
    }
    context.spCoinLogger.logDetail("JS => Inserted " + maxCount + " Account to Blockchain Network");
    context.spCoinLogger.logExitFunction();
    return maxCount;
};
