// @ts-nocheck
import { normalizeRawQuantityUnits } from "../../spCoinAddModule/shared";
// _quantity is optional in JS — pass 0 (or omit it) to delete the entire
// bucket, matching the contract's own "0 means delete all" convention.
export const deleteAgentRate = async (context, _sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey, _quantity = 0) => {
    context.spCoinLogger.logFunctionHeader("deleteAgentRate = async(" +
        _sponsorKey + ", " +
        _recipientKey + ", " +
        _recipientRateKey + ", " +
        _agentKey + ", " +
        _agentRateKey + ", " +
        _quantity + ")");
    const amount = await normalizeRawQuantityUnits(context, _quantity);
    const tx = await context.spCoinContractDeployed.deleteAgentRate(_sponsorKey, _recipientKey, _recipientRateKey, _agentKey, _agentRateKey, amount);
    context.spCoinLogger.logExitFunction();
    return tx;
};
