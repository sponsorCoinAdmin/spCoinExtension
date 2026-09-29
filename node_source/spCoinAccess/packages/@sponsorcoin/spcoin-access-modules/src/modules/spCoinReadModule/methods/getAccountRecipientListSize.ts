// @ts-nocheck
export async function getAccountRecipientListSize(context, _accountKey) {
    const runtime = context;
    runtime.spCoinLogger.logFunctionHeader("getAccountRecipientListSize = async(" + _accountKey + ")");
    let maxSize;
    const readAccountRecord = runtime?.spCoinContractDeployed?.getAccountRecord;
    if (typeof readAccountRecord === "function") {
        const record = await readAccountRecord(_accountKey);
        maxSize = Number(record?.recipientCount ?? record?.[6] ?? 0);
    }
    else {
        maxSize = (await runtime.getAccountRecipientList(_accountKey)).length;
    }
    runtime.spCoinLogger.logDetail("JS => Found " + maxSize + " Account Recipient Keys");
    runtime.spCoinLogger.logExitFunction();
    return maxSize;
}

