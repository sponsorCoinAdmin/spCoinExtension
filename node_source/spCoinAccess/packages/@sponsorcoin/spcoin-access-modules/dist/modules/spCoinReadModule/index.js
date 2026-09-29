import { SpCoinLogger } from "../../utils/logging";
import { SpCoinSerialize } from "../../utils/serialize";
import { bindReadMethods } from "./bindReadMethods";
export class SpCoinReadModule {
    constructor(_spCoinContractDeployed) {
        this.spCoinContractDeployed = _spCoinContractDeployed;
        this.spCoinSerialize = new SpCoinSerialize(_spCoinContractDeployed);
        this.spCoinLogger = new SpCoinLogger(_spCoinContractDeployed);
        bindReadMethods(this);
    }
}
export { bindReadMethods } from './bindReadMethods';
export * from './methods';
export * from './shared';
export * from './types';
