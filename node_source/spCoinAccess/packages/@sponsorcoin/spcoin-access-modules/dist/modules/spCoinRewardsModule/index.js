// @ts-nocheck
import { SpCoinLogger } from "../../utils/logging";
import { SpCoinSerialize } from "../../utils/serialize";
import { bindRewardsMethods } from "./bindRewardsMethods";
export class SpCoinRewardsModule {
    constructor(_spCoinContractDeployed) {
        this.spCoinContractDeployed = _spCoinContractDeployed;
        this.spCoinLogger = new SpCoinLogger(_spCoinContractDeployed);
        this.spCoinSerialize = new SpCoinSerialize(_spCoinContractDeployed);
        bindRewardsMethods(this);
    }
}
export { bindRewardsMethods } from "./bindRewardsMethods";
export * from "./methods";
export * from "./types";
