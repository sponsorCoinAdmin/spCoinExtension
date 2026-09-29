// @ts-nocheck
import { normalizeRawQuantityUnits } from "../shared";
export const sponsorRecipientTransaction = async (context, _recipientKey, _recipientRateKey, _transactionQty) => {
    context.spCoinLogger.logFunctionHeader("sponsorRecipientTransaction = async(" + _recipientKey + ", " + _recipientRateKey + ", " + _transactionQty + ")");
    const amount = await normalizeRawQuantityUnits(context, _transactionQty);
    const contractMethod = context.spCoinContractDeployed.sponsorRecipientTransaction
        ?? context.spCoinContractDeployed.sponsorRecipientTransaction;
    const tx = await contractMethod(_recipientKey, _recipientRateKey, amount);
    context.spCoinLogger.logExitFunction();
    return tx;
};
