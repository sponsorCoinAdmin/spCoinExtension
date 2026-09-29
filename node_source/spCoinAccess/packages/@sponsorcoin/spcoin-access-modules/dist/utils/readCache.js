export const FALLBACK_READ_CACHE_TTL_MS = 10000;
export function isReadCacheOptions(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
    const record = value;
    return ("cache" in record ||
        "cacheNamespace" in record ||
        "blockTag" in record ||
        "ttlMs" in record ||
        "traceCache" in record ||
        "timestampOverride" in record);
}
export function splitReadCacheOptions(args) {
    const nextArgs = [...args];
    const last = nextArgs[nextArgs.length - 1];
    if (isReadCacheOptions(last)) {
        nextArgs.pop();
        return { args: nextArgs, options: last };
    }
    return { args: nextArgs, options: {} };
}
const cache = new Map();
const dependencyIndex = new Map();
let globalCacheTraceMode = false;
export function normalizeAddress(value) {
    return String(value ?? "").trim().toLowerCase();
}
export function parseMs(value) {
    if (value == null || value === "")
        return null;
    const parsed = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : null;
}
function normalizeArg(value) {
    if (typeof value === "bigint")
        return value.toString();
    if (Array.isArray(value))
        return value.map(normalizeArg);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, innerValue]) => [key, normalizeArg(innerValue)]));
    }
    if (typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value.trim())) {
        return value.trim().toLowerCase();
    }
    return value;
}
export function stableJson(value) {
    return JSON.stringify(normalizeArg(value));
}
export function getContractAddress(context) {
    const contract = context?.spCoinContractDeployed;
    return normalizeAddress(contract?.target || contract?.address || contract?.contractAddress || "unknown-contract");
}
export function getProviderScopeInfo(context) {
    const contract = context?.spCoinContractDeployed;
    const runner = contract?.runner;
    const provider = (runner?.provider || runner || contract?.provider);
    const providerType = String(provider?.constructor?.name || typeof provider || "unknown");
    const runnerType = String(runner?.constructor?.name || typeof runner || "unknown");
    const connectionUrl = typeof provider?._getConnection === "function"
        ? provider._getConnection()?.url
        : provider?.connection && typeof provider.connection === "object"
            ? provider.connection.url
            : (provider?._connection && typeof provider._connection === "object"
                ? provider._connection.url
                : undefined);
    const rpcUrl = String(connectionUrl ?? "").trim();
    const contractAddress = getContractAddress(context);
    if (rpcUrl) {
        return {
            chainId: `rpc:${rpcUrl}`,
            contractAddress,
            providerType,
            runnerType,
            rpcUrl,
            scopeSource: "rpcUrl",
        };
    }
    const network = provider?._network;
    const chainId = String(network?.chainId ?? provider?.chainId ?? runner?.chainId ?? "unknown-chain");
    return {
        chainId,
        contractAddress,
        providerType,
        runnerType,
        rpcUrl,
        scopeSource: chainId === "unknown-chain" ? "unknown" : "chainId",
    };
}
export function getChainId(context) {
    return getProviderScopeInfo(context).chainId;
}
export function buildReadCacheKey(context, method, args, options = {}) {
    const scopedOptions = options.cacheNamespace != null || options.blockTag != null || options.timestampOverride != null
        ? {
            cacheNamespace: options.cacheNamespace,
            blockTag: options.blockTag,
            timestampOverride: typeof options.timestampOverride === "bigint"
                ? options.timestampOverride.toString()
                : options.timestampOverride,
        }
        : {};
    return [
        getChainId(context),
        getContractAddress(context),
        String(method || ""),
        stableJson(args),
        stableJson(scopedOptions),
    ].join(":");
}
export function compactKey(value) {
    if (value.length <= 240)
        return value;
    return `${value.slice(0, 180)}...${value.slice(-48)}`;
}
export function serializeTraceArg(value) {
    try {
        const json = stableJson(value);
        return json.length <= 160 ? json : `${json.slice(0, 120)}...${json.slice(-32)}`;
    }
    catch {
        return String(value);
    }
}
// 2026-09-29, real fix — this package must never read process.env.
// NEXT_PUBLIC_*/bare env vars directly: NEXT_PUBLIC_-prefixed build-time
// inlining is a Next.js-specific mechanism (Vite, the extension's own
// bundler, has no equivalent), and a bare SPCOIN_READ_CACHE_TTL_MS assumes
// a Node/server execution context this portable library can't assume
// either. Injectable instead, defaulting to unset — the exact same
// behavior any consumer that never had these vars populated already got
// (falls through to FALLBACK_READ_CACHE_TTL_MS below), so this is a real
// architectural fix with zero runtime behavior change for existing
// callers. The web app's own bootstrap calls configureDefaultReadCacheTtlEnv
// once with its real process.env reads; the extension never calls it,
// same fallback as before.
let defaultTtlMsOverride = {};
export function configureDefaultReadCacheTtlEnv(env) {
    defaultTtlMsOverride = { ...defaultTtlMsOverride, ...env };
}
export function getDefaultReadCacheTtlMs() {
    const publicTtlMs = parseMs(defaultTtlMsOverride.publicTtlMs);
    if (publicTtlMs !== null && publicTtlMs > 0)
        return publicTtlMs;
    const serverTtlMs = parseMs(defaultTtlMsOverride.serverTtlMs);
    if (serverTtlMs !== null && serverTtlMs > 0)
        return serverTtlMs;
    return FALLBACK_READ_CACHE_TTL_MS;
}
export function getCacheMode(options) {
    return options.cache || "default";
}
export function getEffectiveTtlMs(options) {
    const ttlMs = parseMs(options.ttlMs);
    return ttlMs !== null ? ttlMs : getDefaultReadCacheTtlMs();
}
export function shouldInvalidateExactEntry(options) {
    return parseMs(options.ttlMs) === 0;
}
export function allowsLiveRead(options) {
    return getCacheMode(options) !== "useCacheOnly";
}
export function isEntryFresh(entry, options) {
    const ttlMs = getEffectiveTtlMs(options);
    if (!Number.isFinite(ttlMs) || ttlMs <= 0)
        return false;
    return Date.now() - entry.cachedAt <= ttlMs;
}
export function getEntryAgeMs(entry, nowMs = Date.now()) {
    return entry ? Math.max(0, nowMs - Number(entry.cachedAt || nowMs)) : null;
}
function indexEntry(key, dependencies) {
    for (const dependency of dependencies) {
        if (!dependencyIndex.has(dependency))
            dependencyIndex.set(dependency, new Set());
        dependencyIndex.get(dependency)?.add(key);
    }
}
function unindexEntry(key) {
    const entry = cache.get(key);
    if (!entry)
        return;
    for (const dependency of entry.dependencies) {
        const keys = dependencyIndex.get(dependency);
        keys?.delete(key);
        if (keys?.size === 0)
            dependencyIndex.delete(dependency);
    }
}
export function getCacheEntry(key) {
    return cache.get(key);
}
export function setCacheEntry(key, value, dependencies) {
    unindexEntry(key);
    cache.set(key, { value, cachedAt: Date.now(), dependencies });
    indexEntry(key, dependencies);
}
export function invalidateReadCacheEntry(key) {
    if (!cache.has(key))
        return 0;
    unindexEntry(key);
    cache.delete(key);
    return 1;
}
export function invalidateReadCacheByDependency(dependency) {
    const keys = Array.from(dependencyIndex.get(dependency) || []);
    for (const key of keys) {
        invalidateReadCacheEntry(key);
    }
    return keys.length;
}
export function invalidateReadCacheByDependencies(dependencies) {
    const keys = new Set();
    for (const dependency of dependencies) {
        for (const key of dependencyIndex.get(dependency) || []) {
            keys.add(key);
        }
    }
    for (const key of keys) {
        invalidateReadCacheEntry(key);
    }
    return keys.size;
}
export function invalidateReadCacheForAccount(accountKey) {
    return invalidateReadCacheByDependency(`account:${normalizeAddress(accountKey)}`);
}
export function invalidateReadCacheForContract(contractAddress, chainId = "unknown-chain") {
    return invalidateReadCacheByDependency(`contract:${String(chainId)}:${normalizeAddress(contractAddress)}`);
}
export function clearReadCache() {
    cache.clear();
    dependencyIndex.clear();
}
export function clearCache() {
    const entriesBefore = cache.size;
    clearReadCache();
    return {
        cleared: true,
        entriesBefore,
        entriesAfter: cache.size,
    };
}
export function getReadCacheSize() {
    return cache.size;
}
export function getCacheTraceMode() {
    return globalCacheTraceMode;
}
export function setCacheTraceMode(enabled) {
    globalCacheTraceMode = Boolean(enabled);
    return { cacheTraceMode: globalCacheTraceMode };
}
const METHOD_DOMAIN_TAGS = {
    getInflationRate: ["inflation", "rewards"],
    getAccountRecord: ["account-record", "rewards"],
    getAccountRelationshipRecord: ["account-record", "account-links", "rewards"],
    getAccountRewardSnapshotRecord: ["account-record", "rewards"],
    getAccountRewardTotals: ["account-record", "rewards"],
    getSummaryRecord: ["account-record", "rewards"],
    getAccountLinks: ["account-links"],
    getSponsorRecipientRates: ["rates"],
    getRecipientRateTransactionSetKey: ["rates", "rate-transactions"],
    getAgentRateTransactionSetKey: ["rates", "rate-transactions"],
    getRateTransactionSet: ["rate-transactions", "rewards"],
    getRecipientRateAgentList: ["account-links", "rates"],
    getAgentRateList: ["rates"],
    estimateOffChainTotalRewards: ["rewards"],
    estimateOffChainSponsorRewards: ["rewards"],
    estimateOffChainRecipientRewards: ["rewards"],
    estimateOffChainAgentRewards: ["rewards"],
};
export function buildReadCacheDependencies(context, method, args) {
    const contractAddress = getContractAddress(context);
    const chainId = getChainId(context);
    const dependencies = new Set([
        `chain:${chainId}`,
        `contract:${chainId}:${contractAddress}`,
        `method:${String(method || "")}`,
    ]);
    for (const tag of METHOD_DOMAIN_TAGS[String(method || "")] ?? []) {
        dependencies.add(tag);
    }
    for (const arg of args) {
        if (typeof arg === "string" && /^0x[a-fA-F0-9]{40}$/.test(arg.trim())) {
            dependencies.add(`account:${normalizeAddress(arg)}`);
        }
    }
    return dependencies;
}
const WRITE_DOMAIN_TAGS = {
    claimOnChainTotalRewards: ["rewards"],
    claimOnChainSponsorRewards: ["rewards"],
    claimOnChainRecipientRewards: ["rewards"],
    claimOnChainAgentRewards: ["rewards"],
    sponsorRecipientTransaction: ["rewards", "account-links", "rates", "rate-transactions"],
    sponsorAgentTransaction: ["rewards", "account-links", "rates", "rate-transactions"],
    addRecipient: ["rewards", "account-links", "rates"],
    addAgent: ["rewards", "account-links", "rates"],
    unSponsorRecipient: ["rewards", "account-links", "rates", "rate-transactions"],
    unSponsorAgent: ["rewards", "account-links", "rates", "rate-transactions"],
    deleteRecipientRate: ["rewards", "rates", "rate-transactions"],
    deleteAgentRate: ["rewards", "rates", "rate-transactions"],
    setInflationRate: ["inflation", "rewards"],
    addRecipientRate: ["rates", "rewards"],
    addAgentRate: ["rates", "rewards"],
};
export function invalidateAfterWrite(methodName, args = []) {
    const dependencies = new Set(WRITE_DOMAIN_TAGS[String(methodName || "")] ?? []);
    for (const arg of args) {
        if (typeof arg === "string" && /^0x[a-fA-F0-9]{40}$/.test(arg.trim())) {
            dependencies.add(`account:${normalizeAddress(arg)}`);
        }
    }
    if (dependencies.size === 0)
        return 0;
    return invalidateReadCacheByDependencies(dependencies);
}
export function invalidateAfterAccountWrite(accountKey) {
    return invalidateReadCacheForAccount(accountKey);
}
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
