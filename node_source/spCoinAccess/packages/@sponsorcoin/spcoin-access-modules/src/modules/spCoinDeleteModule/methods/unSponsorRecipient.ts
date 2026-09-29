// @ts-nocheck
export const unSponsorRecipient = async (context, _sponsorKey, _recipientKey) => {
    context.spCoinLogger.logFunctionHeader("unSponsorRecipient(" + _sponsorKey.accountKey + ", " + _recipientKey + ")");
    const tx = await context.spCoinContractDeployed.unSponsorRecipient(_sponsorKey.accountKey, _recipientKey);
    context.spCoinLogger.logExitFunction();
    return tx;
};

