// @ts-nocheck
import { SpCoinLogger } from "../../utils/logging";
import { bindStakingMethods } from "./bindStakingMethods";
export class SpCoinStakingModule {
    constructor(_spCoinContractDeployed) {
        this.spCoinContractDeployed = _spCoinContractDeployed;
        this.spCoinLogger = new SpCoinLogger(_spCoinContractDeployed);
        bindStakingMethods(this);
    }
}
export { bindStakingMethods } from "./bindStakingMethods";
export * from "./methods";
export * from "./shared";
export * from "./types";

