const ACTIVE_COLLECTORS_GLOBAL_KEY = "__spcoinActiveMethodTimingCollectors";
function getActiveCollectorsStore() {
    const scope = globalThis;
    if (!Array.isArray(scope[ACTIVE_COLLECTORS_GLOBAL_KEY])) {
        scope[ACTIVE_COLLECTORS_GLOBAL_KEY] = [];
    }
    return scope[ACTIVE_COLLECTORS_GLOBAL_KEY];
}
const CONTRACT_HELPER_SKIP_SET = new Set([
    "addListener",
    "attach",
    "connect",
    "emit",
    "fallback",
    "getAddress",
    "getError",
    "getEvent",
    "getFunction",
    "listenerCount",
    "listeners",
    "off",
    "on",
    "once",
    "removeAllListeners",
    "removeListener",
    "toJSON",
]);
export function createMethodTimingCollector(startedAtMs = Date.now()) {
    const collector = {
        startedAtMs,
        onChainCalls: [],
        recordOnChainCall(method, runTimeMs) {
            collector.onChainCalls.push({
                method: String(method || "").trim() || "unknown",
                onChainRunTimeMs: Math.max(0, Number(runTimeMs || 0)),
            });
        },
    };
    return collector;
}
function getActiveCollector() {
    const activeCollectors = getActiveCollectorsStore();
    return activeCollectors.length > 0 ? activeCollectors[activeCollectors.length - 1] : undefined;
}
export async function runWithMethodTimingCollector(collector, callback) {
    const activeCollectors = getActiveCollectorsStore();
    activeCollectors.push(collector);
    try {
        return await callback();
    }
    finally {
        const collectorIndex = activeCollectors.lastIndexOf(collector);
        if (collectorIndex >= 0) {
            activeCollectors.splice(collectorIndex, 1);
        }
    }
}
export async function timeOnChainCall(method, callback) {
    const startedAtMs = Date.now();
    try {
        return await callback();
    }
    finally {
        const collector = getActiveCollector();
        if (collector) {
            collector.recordOnChainCall(method, Date.now() - startedAtMs);
        }
    }
}
function normalizeMethodName(method) {
    return String(method ?? "").trim().replace(/\(.*/, "") || "unknown";
}
function toBigIntOrUndefined(value) {
    if (value == null || value === "")
        return undefined;
    if (typeof value === "bigint")
        return value;
    if (typeof value === "number" && Number.isFinite(value))
        return BigInt(Math.trunc(value));
    const normalized = String(value).replace(/,/g, "").trim();
    if (!/^\d+$/.test(normalized))
        return undefined;
    try {
        return BigInt(normalized);
    }
    catch {
        return undefined;
    }
}
function formatWeiAsEther(wei) {
    const divisor = 10n ** 18n;
    const whole = wei / divisor;
    const fraction = wei % divisor;
    if (fraction === 0n)
        return whole.toString();
    return `${whole.toString()}.${fraction.toString().padStart(18, "0").replace(/0+$/, "")}`;
}
export function buildReceiptGasTimingFields(tx, receipt) {
    const txRecord = (tx && typeof tx === "object" ? tx : {});
    const receiptRecord = (receipt && typeof receipt === "object" ? receipt : {});
    const gasUsed = toBigIntOrUndefined(receiptRecord.gasUsed);
    const gasPrice = toBigIntOrUndefined(receiptRecord.effectiveGasPrice) ??
        toBigIntOrUndefined(receiptRecord.gasPrice) ??
        toBigIntOrUndefined(txRecord.gasPrice);
    const feePaid = toBigIntOrUndefined(receiptRecord.fee) ?? (gasUsed != null && gasPrice != null ? gasUsed * gasPrice : undefined);
    return {
        ...(gasUsed != null ? { gasUsed: gasUsed.toString() } : {}),
        ...(gasPrice != null ? { gasPriceWei: gasPrice.toString() } : {}),
        ...(feePaid != null
            ? {
                feePaidWei: feePaid.toString(),
                feePaidEth: formatWeiAsEther(feePaid),
            }
            : {}),
    };
}
export function attachReceiptGasToOnChainCall(collector, method, tx, receipt) {
    const gasFields = buildReceiptGasTimingFields(tx, receipt);
    if (Object.keys(gasFields).length === 0 || !collector)
        return;
    const normalizedMethod = normalizeMethodName(method);
    const calls = Array.isArray(collector.onChainCalls) ? collector.onChainCalls : [];
    const matchingIndex = [...calls]
        .reverse()
        .findIndex((entry) => normalizeMethodName(entry?.method) === normalizedMethod);
    const targetIndex = matchingIndex >= 0 ? calls.length - 1 - matchingIndex : calls.length - 1;
    if (targetIndex >= 0) {
        Object.assign(calls[targetIndex], gasFields);
        return;
    }
    calls.push({
        method: normalizedMethod,
        onChainRunTimeMs: 0,
        ...gasFields,
    });
}
export function buildMethodTimingMeta(collector, completedAtMs = Date.now()) {
    const runTimeMs = Math.max(0, completedAtMs - Number(collector?.startedAtMs || completedAtMs));
    const onChainCalls = Array.isArray(collector?.onChainCalls) ? collector.onChainCalls.map((entry) => ({
        method: String(entry?.method || "").trim() || "unknown",
        onChainRunTimeMs: Math.max(0, Number(entry?.onChainRunTimeMs || 0)),
        ...(entry?.broadcastMs != null ? { broadcastMs: String(entry.broadcastMs) } : {}),
        ...(entry?.receiptWaitMs != null ? { receiptWaitMs: String(entry.receiptWaitMs) } : {}),
        ...(entry?.gasUsed != null ? { gasUsed: String(entry.gasUsed) } : {}),
        ...(entry?.gasPriceWei != null ? { gasPriceWei: String(entry.gasPriceWei) } : {}),
        ...(entry?.feePaidWei != null ? { feePaidWei: String(entry.feePaidWei) } : {}),
        ...(entry?.feePaidEth != null ? { feePaidEth: String(entry.feePaidEth) } : {}),
    })) : [];
    const onChainRunTimeMs = onChainCalls.reduce((total, entry) => total + entry.onChainRunTimeMs, 0);
    return {
        startedAt: new Date(Number(collector?.startedAtMs || completedAtMs)).toISOString(),
        completedAt: new Date(completedAtMs).toISOString(),
        totalRunTimeMs: runTimeMs,
        offChainRunTimeMs: Math.max(0, runTimeMs - onChainRunTimeMs),
        onChainRunTimeMs,
        onChainCallCount: onChainCalls.length,
        onChainCalls: { calls: onChainCalls, totalOnChainMs: onChainRunTimeMs },
    };
}
export function wrapContractWithTiming(contract) {
    if (!contract || typeof contract !== "object") {
        return contract;
    }
    if (contract.__spcoinTimingWrapped) {
        return contract;
    }
    const wrapperCache = new Map();
    const proxy = new Proxy(contract, {
        get(target, prop, receiver) {
            if (prop === "__spcoinTimingWrapped") {
                return true;
            }
            const value = Reflect.get(target, prop, receiver);
            if (typeof prop === "symbol" || typeof value !== "function") {
                return value;
            }
            if (wrapperCache.has(prop)) {
                return wrapperCache.get(prop);
            }
            const propName = String(prop || "");
            const wrapped = (...args) => {
                if (propName === "connect" || propName === "attach") {
                    return wrapContractWithTiming(value.apply(target, args));
                }
                if (CONTRACT_HELPER_SKIP_SET.has(propName)) {
                    return value.apply(target, args);
                }
                return timeOnChainCall(propName, () => Promise.resolve(value.apply(target, args)));
            };
            wrapperCache.set(prop, wrapped);
            return wrapped;
        },
    });
    return proxy;
}
