// @ts-nocheck
export async function getAgentRateRange(context) {
    return context.spCoinContractDeployed.getAgentRateRange();
}
