import type { SpCoinReadCacheOptions } from "./types";
export declare function runCachedRead(context: unknown, method: string, args: unknown[], options: SpCoinReadCacheOptions, loader: () => Promise<unknown> | unknown): Promise<unknown>;
