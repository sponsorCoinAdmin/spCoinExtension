import type {
  SpCoinDynamicMethod,
  SpCoinDynamicMethodHost,
} from "./modules/shared/runtimeTypes";
import { runCachedRead, type SpCoinReadCacheOptions } from "./utils/readCache";
import { applyMethodCacheDefaults } from "./utils/readCacheTtl";

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

export function buildHandler<Result = unknown>(
  method: string,
  run: (context: ReadMethodHandlerContext) => Promise<Result>,
): ReadMethodHandler<Result> {
  return { method, run };
}

export function getDynamicMethod(
  target: SpCoinDynamicMethodHost,
  method: string,
): SpCoinDynamicMethod | undefined {
  const candidate = target[method];
  return typeof candidate === "function" ? (candidate as SpCoinDynamicMethod) : undefined;
}

export async function runDynamicMethod(
  context: ReadMethodHandlerContext,
  method: string = context.canonicalMethod,
): Promise<unknown> {
  const readMethod = getDynamicMethod(context.read, method);
  if (readMethod) {
    return readMethod(...context.methodArgs, applyMethodCacheDefaults(method, context.readCacheOptions ?? {}));
  }

  const stakingMethod = getDynamicMethod(context.staking, method);
  if (stakingMethod) {
    return stakingMethod(...context.methodArgs);
  }

  const contractMethod = getDynamicMethod(context.contract, method);
  if (!contractMethod) {
    throw new Error(`SpCoin read method ${context.selectedMethod} is not available on access modules or contract.`);
  }

  const cacheOptions = applyMethodCacheDefaults(method, context.readCacheOptions ?? {});
  const cacheContext = {
    spCoinContractDeployed: context.contract,
    spCoinLogger:
      (context.read as { spCoinLogger?: unknown } | undefined)?.spCoinLogger ??
      (context.contract as { spCoinLogger?: unknown } | undefined)?.spCoinLogger,
  };
  return runCachedRead(cacheContext, method, context.methodArgs, cacheOptions, () => contractMethod(...context.methodArgs));
}

export function createDynamicHandler<Result = unknown>(
  method: string,
  after?: (result: unknown, context: ReadMethodHandlerContext) => Result | Promise<Result>,
): ReadMethodHandler<Result | unknown> {
  return buildHandler(method, async (context) => {
    const result = await runDynamicMethod(context, method);
    return after ? after(result, context) : result;
  });
}

export function createReadHandler(
  method: string,
  mapArgs?: (context: ReadMethodHandlerContext) => unknown[],
): ReadMethodHandler {
  return buildHandler(method, async (context) => {
    const readMethod = getDynamicMethod(context.read, method);
    if (!readMethod) {
      throw new Error(`SpCoin read method ${method} is not available on read access.`);
    }

    return readMethod(...(mapArgs ? mapArgs(context) : context.methodArgs));
  });
}

export function createPassthroughFirstArgHandler(method: string): ReadMethodHandler {
  return buildHandler(method, async (context) => context.methodArgs[0]);
}

export function createSerializedHandler(
  config: SerializedHandlerConfig,
): ReadMethodHandler {
  return buildHandler(config.method, async (context) => {
    if (context.spCoinAccessSource === "local") {
      const localMethod = getDynamicMethod(context.read, config.localMethod);
      if (!localMethod) {
        throw new Error(`Local read method ${config.localMethod} is not available.`);
      }

      return localMethod(...(config.localArgs ? config.localArgs(context) : context.methodArgs));
    }

    return context.requireExternalSerializedValue(config.method, context.methodArgs);
  });
}

