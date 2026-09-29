// @ts-nocheck
import { BURN_ADDRESS } from "../shared";

export const backDateRecipientTransaction = async (
    context,
    _adminSigner,
    _recipientKey,
    _recipientRateKey,
    _transactionIndex,
    _transactionBackDate
) => {
    context.spCoinLogger.logFunctionHeader(
        "backDateRecipientTransaction = async(" +
            _recipientKey + ", " +
            _recipientRateKey + ", " +
            _transactionIndex + ", " +
            _transactionBackDate + ")"
    );
    const signerAddress = typeof _adminSigner?.getAddress === "function"
        ? await _adminSigner.getAddress()
        : _adminSigner?.address;
    if (!signerAddress) {
        throw new Error("backdating recipient transaction dates requires a sponsor signer.");
    }
    const tx = await context.spCoinContractDeployed.backDateTransaction(
        signerAddress,
        _recipientKey,
        _recipientRateKey,
        BURN_ADDRESS,
        0,
        _transactionIndex,
        _transactionBackDate
    );
    context.spCoinLogger.logExitFunction();
    return tx;
};
