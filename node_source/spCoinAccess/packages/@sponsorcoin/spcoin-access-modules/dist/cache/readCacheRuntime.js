import { buildReadCacheKey, compactKey, getProviderScopeInfo, serializeTraceArg } from "./readCacheKeys";
import { buildReadCacheDependencies } from "./readCacheTags";
import { allowsLiveRead, getCacheMode, getEffectiveTtlMs, getEntryAgeMs, isEntryFresh, shouldInvalidateExactEntry, } from "./readCachePolicy";
import { getCacheEntry, getCacheTraceMode, getReadCacheSize, invalidateReadCacheEntry, setCacheEntry } from "./readCacheStore";
function emitBrowserTrace(line) {
    try {
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
            window.dispatchEvent(new CustomEvent("spcoin-rpc-trace", { detail: { line } }));
        }
    }
    catch {
        // Tracing must never affect read behavior.
    }
}
function trace(context, options, message) {
    if (!options.traceCache && !getCacheTraceMode())
        return;
    const logger = context?.spCoinLogger;
    const line = `Cache Trace: ${message}`;
    logger?.logDetail?.(`JS => ${line}`);
    emitBrowserTrace(line);
    try {
        console.debug(line);
    }
    catch {
        // Ignore console failures in restricted runtimes.
    }
}
function getCacheTraceAction(phase) {
    if (phase === "hit" || phase === "hit-only")
        return "Cache Read Direct";
    if (phase === "set")
        return "Cache Update";
    if (phase === "invalidate-exact")
        return "Cache Clear";
    if (phase === "forceRefresh")
        return "Cache Readthrough Force Refresh";
    if (phase === "miss")
        return "Cache Readthrough";
    if (phase === "miss-only")
        return "Cache Read Only Miss";
    return "Cache Trace";
}
function traceReadCacheDecision(params) {
    const { context, options, method, args, key, phase, mode, entry, fresh, detail } = params;
    if (!options.traceCache && !getCacheTraceMode())
        return;
    const nowMs = Date.now();
    const scope = getProviderScopeInfo(context);
    const ttlMs = getEffectiveTtlMs(options);
    const ageMs = getEntryAgeMs(entry, nowMs);
    const dependencies = entry ? Array.from(entry.dependencies).join(",") : "";
    const action = getCacheTraceAction(phase);
    trace(context, options, [
        `${action}:`,
        `method=${method}`,
        `phase=${phase}`,
        `mode=${mode}`,
        `liveRead=${String(allowsLiveRead(options))}`,
        `hasEntry=${String(Boolean(entry))}`,
        `fresh=${fresh == null ? "n/a" : String(fresh)}`,
        `ageMs=${ageMs == null ? "n/a" : String(ageMs)}`,
        `ttlMs=${String(ttlMs)}`,
        `cacheSize=${String(getReadCacheSize())}`,
        `namespace=${String(options.cacheNamespace ?? "")}`,
        `timestampOverride=${String(options.timestampOverride ?? "")}`,
        `blockTag=${String(options.blockTag ?? "")}`,
        `scopeSource=${scope.scopeSource}`,
        `chainScope=${scope.chainId}`,
        `contract=${scope.contractAddress}`,
        `provider=${scope.providerType}`,
        `runner=${scope.runnerType}`,
        `rpcUrl=${scope.rpcUrl || ""}`,
        `args=${serializeTraceArg(args)}`,
        `deps=${dependencies}`,
        `key=${compactKey(key)}`,
        detail ? `detail=${detail}` : "",
    ].filter(Boolean).join(" "));
}
export async function runCachedRead(context, method, args, options, loader) {
    const mode = getCacheMode(options);
    const key = buildReadCacheKey(context, method, args, options);
    let entry = getCacheEntry(key);
    if (shouldInvalidateExactEntry(options)) {
        const invalidated = invalidateReadCacheEntry(key);
        traceReadCacheDecision({
            context,
            options,
            method,
            args,
            key,
            phase: "invalidate-exact",
            mode,
            entry,
            fresh: false,
            detail: `invalidated=${String(invalidated)}`,
        });
        entry = undefined;
    }
    const fresh = Boolean(entry && isEntryFresh(entry, options));
    if (entry && fresh && mode !== "forceRefresh") {
        traceReadCacheDecision({ context, options, method, args, key, phase: mode === "useCacheOnly" ? "hit-only" : "hit", mode, entry, fresh: true });
        return entry.value;
    }
    if (!allowsLiveRead(options)) {
        traceReadCacheDecision({ context, options, method, args, key, phase: "miss-only", mode, entry, fresh });
        return null;
    }
    traceReadCacheDecision({
        context,
        options,
        method,
        args,
        key,
        phase: mode === "forceRefresh" ? "forceRefresh" : "miss",
        mode,
        entry,
        fresh,
    });
    const value = await loader();
    setCacheEntry(key, value, buildReadCacheDependencies(context, method, args));
    traceReadCacheDecision({
        context,
        options,
        method,
        args,
        key,
        phase: "set",
        mode,
        entry: getCacheEntry(key),
        fresh: true,
        detail: `valueType=${Array.isArray(value) ? "array" : typeof value}`,
    });
    return value;
}
