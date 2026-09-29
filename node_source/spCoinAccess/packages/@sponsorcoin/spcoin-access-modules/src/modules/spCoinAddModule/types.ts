import type {
  SpCoinDynamicMethod,
  SpCoinLoggerLike,
  SpCoinModuleContract,
} from "../shared/runtimeTypes";

export interface SpCoinAddModuleContext {
  spCoinContractDeployed: SpCoinModuleContract;
  spCoinLogger: SpCoinLoggerLike;
  [methodName: string]: unknown;
}

export type SpCoinAddMethod = (
  context: SpCoinAddModuleContext,
  ...args: unknown[]
) => unknown;

export type SpCoinAddBoundMethod = SpCoinDynamicMethod;
