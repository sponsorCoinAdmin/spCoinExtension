// @ts-nocheck
/**
 * SponsorCoin Access Modules
 * File: dist/offChain/setDefaultAgentRate.js
 * Role: Off-chain helper that updates the default agent rate through the
 * combined setDefaultRates contract call, preserving the current default
 * recipient rate unchanged.
 */
export async function setDefaultAgentRate(newDefaultAgentRate) {
    if (typeof this.contract?.getDefaultRecipientRate !== "function" || typeof this.contract?.setDefaultRates !== "function") {
        throw new Error("Default rate methods are not available on the current SpCoin contract.");
    }
    const currentDefaultRecipientRate = await this.contract.getDefaultRecipientRate();
    return this.contract.setDefaultRates(currentDefaultRecipientRate, newDefaultAgentRate);
}
