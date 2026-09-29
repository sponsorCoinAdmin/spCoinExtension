// @ts-nocheck
export const deleteAccountRecord = async (context, _accountKey) => {
    context.spCoinLogger.logFunctionHeader("deleteAccountRecord = async(" + _accountKey + ")");
    context.spCoinLogger.logDetail("JS => Deleting Account " + _accountKey + " From Blockchain Network");
    const signerAddress =
        typeof context?.signer?.getAddress === "function"
            ? await context.signer.getAddress()
            : String(context?.signer?.address || "");
    context.spCoinLogger.logDetail("JS => deleteAccountRecord signer = " + String(signerAddress || "(missing)"));
    context.spCoinLogger.logDetail("JS => deleteAccountRecord stage = use-bound-contract");
    context.spCoinLogger.logDetail("JS => deleteAccountRecord stage = send");
    const tx = await context.spCoinContractDeployed.deleteAccountRecord(_accountKey);
    context.spCoinLogger.logDetail("JS => deleteAccountRecord tx hash = " + String(tx?.hash || ""));
    context.spCoinLogger.logExitFunction();
    return tx;
};

