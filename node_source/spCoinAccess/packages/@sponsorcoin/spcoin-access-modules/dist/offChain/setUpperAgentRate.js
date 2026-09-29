// @ts-nocheck
/**
 * SponsorCoin Access Modules
 * File: dist/offChain/setUpperAgentRate.js
 * Role: Off-chain helper that updates the upper agent rate through the on-chain processor.
 */
export async function setUpperAgentRate(newUpperAgentRate) {
    if (typeof (this.contract === null || this.contract === void 0 ? void 0 : this.contract.getAgentRateRange) !== "function" || typeof (this.contract === null || this.contract === void 0 ? void 0 : this.contract.setAgentRateRange) !== "function") {
        throw new Error("Agent rate methods are not available on the current SpCoin contract.");
    }
    const range = await this.contract.getAgentRateRange();
    return this.contract.setAgentRateRange(range[0], newUpperAgentRate);
}
