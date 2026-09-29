// @ts-nocheck
import { getSignerAddress, requireBackDateRateTransactionSetOwner, } from "../shared";
export const addBackDatedAgentTransaction = async (context, _adminSigner, _recipientKey, _recipientRateKey, _accountAgentKey, _agentRateKey, _transactionQty, _transactionBackDate) => {
    context.spCoinLogger.logFunctionHeader("addBackDatedAgentTransaction = async(" +
        _adminSigner + ", " +
        _recipientKey + ", " +
        _recipientRateKey + ", " +
        _accountAgentKey + ", " +
        _agentRateKey + ", " +
        _transactionQty + ", " +
        _transactionBackDate + ")");
    _transactionBackDate = Math.trunc(_transactionBackDate);
    const signerAddress = await getSignerAddress(_adminSigner);
    if (!signerAddress) {
        throw new Error("backdated agent add requires an owner signer.");
    }
    await requireBackDateRateTransactionSetOwner(context, signerAddress);
    const transactionIndex = await context.spCoinContractDeployed.getAgentTransactionCount(signerAddress, _recipientKey, _recipientRateKey, _accountAgentKey, _agentRateKey);
    const rateTransactionSetKey = await context.spCoinContractDeployed.getAgentRateTransactionSetKey(signerAddress, _recipientKey, _recipientRateKey, _accountAgentKey, _agentRateKey);
    const addTx = await context.sponsorAgentTransaction(_recipientKey, _recipientRateKey, _accountAgentKey, _agentRateKey, _transactionQty);
    if (addTx && typeof addTx.wait === "function") {
        await addTx.wait();
    }
    const backDateTx = await context.spCoinContractDeployed.backDateTransaction(signerAddress, _recipientKey, _recipientRateKey, _accountAgentKey, _agentRateKey, transactionIndex, _transactionBackDate);
    if (backDateTx && typeof backDateTx.wait === "function") {
        await backDateTx.wait();
    }
    const tx = await context.spCoinContractDeployed.backDateRateTransactionSet(rateTransactionSetKey, _transactionBackDate);
    context.spCoinLogger.logExitFunction();
    return tx;
};
