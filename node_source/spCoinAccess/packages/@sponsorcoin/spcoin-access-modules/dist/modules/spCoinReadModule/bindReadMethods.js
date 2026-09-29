import * as readMethods from "./methods";
import { runCachedRead, splitReadCacheOptions } from "../../utils/readCache";
import { applyMethodCacheDefaults } from "../../utils/readCacheTtl";
const ESTIMATE_REWARD_METHODS = new Set([
    "estimateOffChainTotalRewards",
    "estimateOffChainSponsorRewards",
    "estimateOffChainRecipientRewards",
    "estimateOffChainAgentRewards",
]);
export function bindReadMethods(context) {
    const methodEntries = Object.entries(readMethods);
    for (const [name, method] of methodEntries) {
        context[name] = (async (...args) => {
            const { args: methodArgs, options } = splitReadCacheOptions(args);
            const cacheOptions = applyMethodCacheDefaults(name, options);
            const finalArgs = ESTIMATE_REWARD_METHODS.has(name)
                ? [...methodArgs, cacheOptions]
                : methodArgs;
            return runCachedRead(context, name, finalArgs, cacheOptions, () => method(context, ...finalArgs));
        });
    }
}
