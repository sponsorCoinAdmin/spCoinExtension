import { SpCoinLogger } from "../../utils/logging";
import { SpCoinSerialize } from "../../utils/serialize";
import { bindReadMethods } from "./bindReadMethods";
import type { SpCoinReadModuleContext } from "./types";

export class SpCoinReadModule implements SpCoinReadModuleContext {
  [methodName: string]: unknown;

  spCoinContractDeployed;
  spCoinSerialize;
  spCoinLogger;

  constructor(_spCoinContractDeployed: SpCoinReadModuleContext["spCoinContractDeployed"]) {
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

