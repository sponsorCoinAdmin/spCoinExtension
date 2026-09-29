// @ts-nocheck
/**
 * SponsorCoin Access Modules
 * File: dist/offChain/setLowerRecipientRate.js
 * Role: Off-chain helper that updates the lower recipient rate through the on-chain processor.
 */
export async function setLowerRecipientRate(newLowerRecipientRate) {
    if (typeof (this.contract === null || this.contract === void 0 ? void 0 : this.contract.getRecipientRateRange) !== "function" || typeof (this.contract === null || this.contract === void 0 ? void 0 : this.contract.setRecipientRateRange) !== "function") {
        throw new Error("Recipient rate methods are not available on the current SpCoin contract.");
    }
    const range = await this.contract.getRecipientRateRange();
    return this.contract.setRecipientRateRange(newLowerRecipientRate, range[1]);
}
