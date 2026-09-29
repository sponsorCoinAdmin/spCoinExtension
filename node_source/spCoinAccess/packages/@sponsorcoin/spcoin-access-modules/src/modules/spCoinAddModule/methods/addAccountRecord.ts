// @ts-nocheck
export const addAccountRecord = async (context, _accountKey) => {
    context.spCoinLogger.logFunctionHeader("addAccountRecord = async(" + _accountKey + ")");
    context.spCoinLogger.logDetail("JS => Inserting Account " + _accountKey + " To Blockchain Network");
    await context.spCoinContractDeployed.addAccountRecord(_accountKey);
    context.spCoinLogger.logExitFunction();
};

