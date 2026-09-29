import type { SpCoinDynamicMethod, SpCoinLoggerLike, SpCoinModuleContract, SpCoinSerializeLike } from "../shared/runtimeTypes";
export interface SpCoinReadModuleContext {
    spCoinContractDeployed: SpCoinModuleContract;
    spCoinSerialize: SpCoinSerializeLike;
    spCoinLogger: SpCoinLoggerLike;
    [methodName: string]: unknown;
}
export type SpCoinReadMethod = (context: SpCoinReadModuleContext, ...args: unknown[]) => unknown;
export type SpCoinReadBoundMethod = SpCoinDynamicMethod;
