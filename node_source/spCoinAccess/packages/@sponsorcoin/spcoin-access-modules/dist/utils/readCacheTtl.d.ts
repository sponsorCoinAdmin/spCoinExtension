import type { SpCoinReadCacheOptions } from "./readCache";
export declare function configureReadCacheTtlEnv(overrides: {
    block?: Record<string, string | undefined>;
    method?: Record<string, string | undefined>;
}): void;
export declare function applyMethodCacheDefaults(methodName: string, options: SpCoinReadCacheOptions): SpCoinReadCacheOptions;
