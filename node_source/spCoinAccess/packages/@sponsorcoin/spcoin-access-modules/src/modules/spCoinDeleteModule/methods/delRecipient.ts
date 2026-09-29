// @ts-nocheck
export const delRecipient = async (context, _sponsorKey, _recipientKey) => {
    context.spCoinLogger.logFunctionHeader("unSponsorRecipient(" + _sponsorKey.accountKey + ", " + _recipientKey + ")");
    const signerAddress =
        typeof context?.signer?.getAddress === "function"
            ? await context.signer.getAddress()
            : String(context?.signer?.address || "");
    context.spCoinLogger.logDetail("JS => unSponsorRecipient signer = " + String(signerAddress || "(missing)"));
    context.spCoinLogger.logDetail("JS => unSponsorRecipient stage = use-bound-contract");
    context.spCoinLogger.logDetail("JS => unSponsorRecipient stage = send");
    const tx = await context.spCoinContractDeployed.unSponsorRecipient(_sponsorKey.accountKey, _recipientKey);
    context.spCoinLogger.logDetail("JS => unSponsorRecipient tx hash = " + String(tx?.hash || ""));
    context.spCoinLogger.logExitFunction();
    return tx;
};
