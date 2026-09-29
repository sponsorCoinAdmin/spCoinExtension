// @ts-nocheck
import { SpCoinLogger } from "../../utils/logging";
import { SpCoinAddModule } from "../spCoinAddModule/index";

export class SpCoinAdminModule {
    constructor(_spCoinContractDeployed) {
        this.spCoinContractDeployed = _spCoinContractDeployed;
        this.spCoinLogger = new SpCoinLogger(_spCoinContractDeployed);
        this.add = new SpCoinAddModule(_spCoinContractDeployed);
    }

    async setLowerRecipientRate(newLowerRecipientRate) {
        if (typeof this.spCoinContractDeployed?.getRecipientRateRange !== "function" ||
            typeof this.spCoinContractDeployed?.setRecipientRateRange !== "function") {
            throw new Error("Recipient rate methods are not available on the current SpCoin contract.");
        }
        const range = await this.spCoinContractDeployed.getRecipientRateRange();
        return this.spCoinContractDeployed.setRecipientRateRange(newLowerRecipientRate, range[1]);
    }

    async setUpperRecipientRate(newUpperRecipientRate) {
        if (typeof this.spCoinContractDeployed?.getRecipientRateRange !== "function" ||
            typeof this.spCoinContractDeployed?.setRecipientRateRange !== "function") {
            throw new Error("Recipient rate methods are not available on the current SpCoin contract.");
        }
        const range = await this.spCoinContractDeployed.getRecipientRateRange();
        return this.spCoinContractDeployed.setRecipientRateRange(range[0], newUpperRecipientRate);
    }

    async setLowerAgentRate(newLowerAgentRate) {
        if (typeof this.spCoinContractDeployed?.getAgentRateRange !== "function" ||
            typeof this.spCoinContractDeployed?.setAgentRateRange !== "function") {
            throw new Error("Agent rate methods are not available on the current SpCoin contract.");
        }
        const range = await this.spCoinContractDeployed.getAgentRateRange();
        return this.spCoinContractDeployed.setAgentRateRange(newLowerAgentRate, range[1]);
    }

    async setUpperAgentRate(newUpperAgentRate) {
        if (typeof this.spCoinContractDeployed?.getAgentRateRange !== "function" ||
            typeof this.spCoinContractDeployed?.setAgentRateRange !== "function") {
            throw new Error("Agent rate methods are not available on the current SpCoin contract.");
        }
        const range = await this.spCoinContractDeployed.getAgentRateRange();
        return this.spCoinContractDeployed.setAgentRateRange(range[0], newUpperAgentRate);
    }

    async addBackDatedSponsorship(...args) {
        return this.add.addBackDatedSponsorship(...args);
    }

    async addBackDatedAgentSponsorship(...args) {
        return this.add.addBackDatedAgentSponsorship(...args);
    }

    async addBackDatedRecipientSponsorship(...args) {
        return this.add.addBackDatedRecipientSponsorship(...args);
    }

    async addBackDatedRecipientTransaction(...args) {
        return this.add.addBackDatedRecipientTransaction(...args);
    }

    async addBackDatedAgentTransaction(...args) {
        return this.add.addBackDatedAgentTransaction(...args);
    }

    async backDateRecipientTransaction(...args) {
        return this.add.backDateRecipientTransaction(...args);
    }

    async backDateRecipientTransactionDate(...args) {
        return this.add.backDateRecipientTransactionDate(...args);
    }

    async backDateAgentTransaction(...args) {
        return this.add.backDateAgentTransaction(...args);
    }

    async backDateAgentTransactionDate(...args) {
        return this.add.backDateAgentTransactionDate(...args);
    }
}
