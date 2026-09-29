import { runCachedRead } from "./utils/readCache";
import { applyMethodCacheDefaults } from "./utils/readCacheTtl";
export function buildHandler(method, run) {
    return { method, run };
}
export function getDynamicMethod(target, method) {
    const candidate = target[method];
    return typeof candidate === "function" ? candidate : undefined;
}
export async function runDynamicMethod(context, method = context.canonicalMethod) {
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
        spCoinLogger: context.read?.spCoinLogger ??
            context.contract?.spCoinLogger,
    };
    return runCachedRead(cacheContext, method, context.methodArgs, cacheOptions, () => contractMethod(...context.methodArgs));
}
export function createDynamicHandler(method, after) {
    return buildHandler(method, async (context) => {
        const result = await runDynamicMethod(context, method);
        return after ? after(result, context) : result;
    });
}
export function createReadHandler(method, mapArgs) {
    return buildHandler(method, async (context) => {
        const readMethod = getDynamicMethod(context.read, method);
        if (!readMethod) {
            throw new Error(`SpCoin read method ${method} is not available on read access.`);
        }
        return readMethod(...(mapArgs ? mapArgs(context) : context.methodArgs));
    });
}
export function createPassthroughFirstArgHandler(method) {
    return buildHandler(method, async (context) => context.methodArgs[0]);
}
export function createSerializedHandler(config) {
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
