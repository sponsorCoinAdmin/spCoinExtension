import type { SpCoinReadModuleContext } from "./types";
export declare class SpCoinReadModule implements SpCoinReadModuleContext {
    [methodName: string]: unknown;
    spCoinContractDeployed: any;
    spCoinSerialize: any;
    spCoinLogger: any;
    constructor(_spCoinContractDeployed: SpCoinReadModuleContext["spCoinContractDeployed"]);
}
export { bindReadMethods } from './bindReadMethods';
export * from './methods';
export * from './shared';
export * from './types';
