// @ts-nocheck
export async function getRecipientRateRange(context) {
    return context.spCoinContractDeployed.getRecipientRateRange();
}
