import { SpCoinLogger } from "../../utils/logging";
import { bindAddMethods } from "./bindAddMethods";
import type { SpCoinAddModuleContext } from "./types";

export class SpCoinAddModule implements SpCoinAddModuleContext {
  [methodName: string]: unknown;

  spCoinContractDeployed;
  spCoinLogger;

  constructor(_spCoinContractDeployed: SpCoinAddModuleContext["spCoinContractDeployed"]) {
    this.spCoinContractDeployed = _spCoinContractDeployed;
    this.spCoinLogger = new SpCoinLogger(_spCoinContractDeployed);
    bindAddMethods(this);
  }
}
export { bindAddMethods } from "./bindAddMethods";
export * from "./methods";
export * from "./shared";
export * from "./types";

