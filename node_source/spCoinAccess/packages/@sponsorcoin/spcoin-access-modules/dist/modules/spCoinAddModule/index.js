import { SpCoinLogger } from "../../utils/logging";
import { bindAddMethods } from "./bindAddMethods";
export class SpCoinAddModule {
    constructor(_spCoinContractDeployed) {
        this.spCoinContractDeployed = _spCoinContractDeployed;
        this.spCoinLogger = new SpCoinLogger(_spCoinContractDeployed);
        bindAddMethods(this);
    }
}
export { bindAddMethods } from "./bindAddMethods";
export * from "./methods";
export * from "./shared";
export * from "./types";
