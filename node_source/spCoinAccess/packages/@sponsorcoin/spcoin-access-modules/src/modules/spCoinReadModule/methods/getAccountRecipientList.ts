// @ts-nocheck
export async function getRecipientKeys(context, _accountKey) {
    context.spCoinLogger.logFunctionHeader("getRecipientKeys = async(" + _accountKey + ")");
    const recipientKeys = await context.spCoinContractDeployed.getRecipientKeys(_accountKey);
    context.spCoinLogger.logExitFunction();
    return recipientKeys;
}

export const getAccountRecipientList = getRecipientKeys;

