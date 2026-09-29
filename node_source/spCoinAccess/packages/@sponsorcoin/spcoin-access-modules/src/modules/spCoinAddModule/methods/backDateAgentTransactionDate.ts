// @ts-nocheck
export const backDateAgentTransaction = async (
    context,
    _adminSigner,
    _recipientKey,
    _recipientRateKey,
    _accountAgentKey,
    _agentRateKey,
    _transactionIndex,
    _transactionBackDate
) => {
    context.spCoinLogger.logFunctionHeader(
        "backDateAgentTransaction = async(" +
            _recipientKey + ", " +
            _recipientRateKey + ", " +
            _accountAgentKey + ", " +
            _agentRateKey + ", " +
            _transactionIndex + ", " +
            _transactionBackDate + ")"
    );
    const signerAddress = typeof _adminSigner?.getAddress === "function"
        ? await _adminSigner.getAddress()
        : _adminSigner?.address;
    if (!signerAddress) {
        throw new Error("backdating agent transaction dates requires a sponsor signer.");
    }
    const tx = await context.spCoinContractDeployed.backDateTransaction(
        signerAddress,
        _recipientKey,
        _recipientRateKey,
        _accountAgentKey,
        _agentRateKey,
        _transactionIndex,
        _transactionBackDate
    );
    context.spCoinLogger.logExitFunction();
    return tx;
};
