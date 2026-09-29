import type { SpCoinAddModuleContext } from "./types";
export declare class SpCoinAddModule implements SpCoinAddModuleContext {
    [methodName: string]: unknown;
    spCoinContractDeployed: any;
    spCoinLogger: any;
    constructor(_spCoinContractDeployed: SpCoinAddModuleContext["spCoinContractDeployed"]);
}
export { bindAddMethods } from "./bindAddMethods";
export * from "./methods";
export * from "./shared";
export * from "./types";
