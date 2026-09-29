// @ts-nocheck
import {
    BURN_ADDRESS,
    getSignerAddress,
    requireBackDateRateTransactionSetOwner,
} from "../shared";

export const addBackDatedRecipientTransaction = async (
    context,
    _adminSigner,
    _recipientKey,
    _recipientRateKey,
    _transactionQty,
    _transactionBackDate
) => {
    context.spCoinLogger.logFunctionHeader("addBackDatedRecipientTransaction = async(" +
        _adminSigner + ", " +
        _recipientKey + ", " +
        _recipientRateKey + ", " +
        _transactionQty + ", " +
        _transactionBackDate + ")");
    _transactionBackDate = Math.trunc(_transactionBackDate);
    const signerAddress = await getSignerAddress(_adminSigner);
    if (!signerAddress) {
        throw new Error("backdated recipient add requires an owner signer.");
    }
    await requireBackDateRateTransactionSetOwner(context, signerAddress);
    const transactionIndex = await context.spCoinContractDeployed.getRecipientTransactionCount(
        signerAddress,
        _recipientKey,
        _recipientRateKey
    );
    const rateTransactionSetKey = await context.spCoinContractDeployed.getRecipientRateTransactionSetKey(
        signerAddress,
        _recipientKey,
        _recipientRateKey
    );
    const addTx = await context.sponsorRecipientTransaction(_recipientKey, _recipientRateKey, _transactionQty);
    if (addTx && typeof addTx.wait === "function") {
        await addTx.wait();
    }
    const backDateTx = await context.spCoinContractDeployed.backDateTransaction(
        signerAddress,
        _recipientKey,
        _recipientRateKey,
        BURN_ADDRESS,
        0,
        transactionIndex,
        _transactionBackDate
    );
    if (backDateTx && typeof backDateTx.wait === "function") {
        await backDateTx.wait();
    }
    const tx = await context.spCoinContractDeployed.backDateRateTransactionSet(
        rateTransactionSetKey,
        _transactionBackDate
    );
    context.spCoinLogger.logExitFunction();
    return tx;
};
