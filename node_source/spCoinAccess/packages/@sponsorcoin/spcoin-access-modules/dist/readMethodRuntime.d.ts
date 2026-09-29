import type { SpCoinDynamicMethod, SpCoinDynamicMethodHost } from "./modules/shared/runtimeTypes";
import { type SpCoinReadCacheOptions } from "./utils/readCache";
export interface ReadMethodHandlerContext {
    canonicalMethod: string;
    selectedMethod: string;
    methodArgs: unknown[];
    spCoinAccessSource: string;
    read: SpCoinDynamicMethodHost;
    staking: SpCoinDynamicMethodHost;
    contract: SpCoinDynamicMethodHost;
    readCacheOptions?: SpCoinReadCacheOptions;
    requireExternalSerializedValue: (method: string, args: unknown[]) => unknown;
}
export interface ReadMethodHandler<Result = unknown> {
    method: string;
    run: (context: ReadMethodHandlerContext) => Promise<Result>;
}
export interface SerializedHandlerConfig {
    method: string;
    localMethod: string;
    localArgs?: (context: ReadMethodHandlerContext) => unknown[];
}
export declare function buildHandler<Result = unknown>(method: string, run: (context: ReadMethodHandlerContext) => Promise<Result>): ReadMethodHandler<Result>;
export declare function getDynamicMethod(target: SpCoinDynamicMethodHost, method: string): SpCoinDynamicMethod | undefined;
export declare function runDynamicMethod(context: ReadMethodHandlerContext, method?: string): Promise<unknown>;
export declare function createDynamicHandler<Result = unknown>(method: string, after?: (result: unknown, context: ReadMethodHandlerContext) => Result | Promise<Result>): ReadMethodHandler<Result | unknown>;
export declare function createReadHandler(method: string, mapArgs?: (context: ReadMethodHandlerContext) => unknown[]): ReadMethodHandler;
export declare function createPassthroughFirstArgHandler(method: string): ReadMethodHandler;
export declare function createSerializedHandler(config: SerializedHandlerConfig): ReadMethodHandler;
