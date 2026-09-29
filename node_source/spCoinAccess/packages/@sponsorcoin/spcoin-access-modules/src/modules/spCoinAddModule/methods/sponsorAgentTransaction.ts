// @ts-nocheck
import { normalizeRawQuantityUnits } from "../shared";

export const sponsorAgentTransaction = async (
    context,
    _recipientKey,
    _recipientRateKey,
    _accountAgentKey,
    _agentRateKey,
    _transactionQty
) => {
    context.spCoinLogger.logFunctionHeader(
        "sponsorAgentTransaction = async(" +
            _recipientKey + ", " +
            _recipientRateKey + ", " +
            _accountAgentKey + ", " +
            _agentRateKey + ", " +
            _transactionQty + ")"
    );
    const amount = await normalizeRawQuantityUnits(context, _transactionQty);
    const contractMethod = context.spCoinContractDeployed.sponsorAgentTransaction
        ?? context.spCoinContractDeployed.sponsorAgentTransaction;
    const tx = await contractMethod(
        _recipientKey,
        _recipientRateKey,
        _accountAgentKey,
        _agentRateKey,
        amount
    );
    context.spCoinLogger.logExitFunction();
    return tx;
};
