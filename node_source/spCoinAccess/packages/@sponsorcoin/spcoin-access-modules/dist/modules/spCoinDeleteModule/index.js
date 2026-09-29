// @ts-nocheck
import { SpCoinLogger } from "../../utils/logging";
import { bindDeleteMethods } from "./bindDeleteMethods";
export class SpCoinDeleteModule {
    constructor(_spCoinContractDeployed) {
        this.spCoinContractDeployed = _spCoinContractDeployed;
        this.spCoinLogger = new SpCoinLogger(_spCoinContractDeployed);
        bindDeleteMethods(this);
    }
}
export { bindDeleteMethods } from "./bindDeleteMethods";
export * from "./methods";
export * from "./types";
