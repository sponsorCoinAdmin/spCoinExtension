// @ts-nocheck
/**
 * SponsorCoin Access Modules
 * File: dist/onChain/spCoinOnChainProcessor.js
 * Role: On-chain processor facade that wires contract access modules together.
 */
import * as ethers_1 from "ethers";
import * as add_1 from "./add";
import * as delete_1 from "./delete";
import * as erc20_1 from "./erc20";
import * as read_1 from "./read";
import * as rewards_1 from "./rewards";
import * as staking_1 from "./staking";
export class SpCoinOnChainProcessor {
    constructor(spCoinABI, spCoinAddress, signer) {
        const contract = new ethers_1.ethers.Contract(spCoinAddress, spCoinABI, signer);
        this.contract = contract;
        this.add = new add_1.SpCoinAddModule(contract);
        this.delete = new delete_1.SpCoinDeleteModule(contract);
        this.erc20 = new erc20_1.SpCoinERC20Module(contract);
        this.read = new read_1.SpCoinReadModule(contract);
        this.rewards = new rewards_1.SpCoinRewardsModule(contract);
        this.staking = new staking_1.SpCoinStakingModule(contract);
    }
    methods() {
        return {
            contract: this.contract,
            add: this.add,
            delete: this.delete,
            erc20: this.erc20,
            read: this.read,
            rewards: this.rewards,
            staking: this.staking,
        };
    }
}
