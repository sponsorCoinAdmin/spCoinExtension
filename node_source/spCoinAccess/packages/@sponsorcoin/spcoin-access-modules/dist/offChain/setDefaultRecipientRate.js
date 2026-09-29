// @ts-nocheck
/**
 * SponsorCoin Access Modules
 * File: dist/offChain/setDefaultRecipientRate.js
 * Role: Off-chain helper that updates the default recipient rate through the
 * combined setDefaultRates contract call, preserving the current default
 * agent rate unchanged.
 */
export async function setDefaultRecipientRate(newDefaultRecipientRate) {
    if (typeof this.contract?.getDefaultAgentRate !== "function" || typeof this.contract?.setDefaultRates !== "function") {
        throw new Error("Default rate methods are not available on the current SpCoin contract.");
    }
    const currentDefaultAgentRate = await this.contract.getDefaultAgentRate();
    return this.contract.setDefaultRates(newDefaultRecipientRate, currentDefaultAgentRate);
}
