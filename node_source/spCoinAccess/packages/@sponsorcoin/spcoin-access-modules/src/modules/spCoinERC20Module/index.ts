// @ts-nocheck
import { SpCoinLogger } from "../../utils/logging";
import { bindERC20Methods } from "./bindERC20Methods";
export class SpCoinERC20Module {
    constructor(_spCoinContractDeployed) {
        this.spCoinContractDeployed = _spCoinContractDeployed;
        this.spCoinLogger = new SpCoinLogger(_spCoinContractDeployed);
        bindERC20Methods(this);
    }
}
export { bindERC20Methods } from "./bindERC20Methods";
export * from "./methods";
export * from "./types";

