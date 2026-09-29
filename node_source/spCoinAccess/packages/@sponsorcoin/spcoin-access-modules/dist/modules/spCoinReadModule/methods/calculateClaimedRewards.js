// @ts-nocheck
import { getAccountRecordObjectCached, getAgentRateListCached, getAgentRateTransactionSetCached, getInflationRateCached, getRecipientRateAgentListCached, getRecipientRateListCached, getRecipientRateTransactionSetCached, } from "./getAccountRecord";
const YEAR_SECONDS = 31556925n;
const DECIMAL_MULTIPLIER = 10n ** 18n;
const PERCENT_DIVISER = DECIMAL_MULTIPLIER / 100n;
const MIN_PENDING_REWARDS_CACHE_MS = 10000;
const DEFAULT_PENDING_REWARDS_CACHE_MS = 10000;
const DEFAULT_STABLE_REWARDS_READ_CACHE_MS = 24 * 60 * 60 * 1000;
function toBigIntValue(value) {
    const normalized = String(value ?? "0").replace(/,/g, "").trim();
    if (!normalized)
        return 0n;
    try {
        return BigInt(normalized);
    }
    catch (_error) {
        return 0n;
    }
}
function toAddressList(value) {
    return Array.from(Array.isArray(value) ? value : []).map((entry) => String(entry ?? "").trim()).filter(Boolean);
}
function toRateList(value) {
    return Array.from(Array.isArray(value) ? value : []).map((entry) => String(entry ?? "").trim()).filter(Boolean);
}
function addPending(target, key, value) {
    target[key] = (toBigIntValue(target[key]) + toBigIntValue(value)).toString();
}
function normalizeAccountKey(value) {
    return String(value ?? "").trim().toLowerCase();
}
function addPendingForAccount(target, accountKey, key, value) {
    const normalizedAccountKey = normalizeAccountKey(accountKey);
    if (!normalizedAccountKey)
        return;
    if (!target.__pendingRewardsByAccount || typeof target.__pendingRewardsByAccount !== "object") {
        target.__pendingRewardsByAccount = {};
    }
    const entry = target.__pendingRewardsByAccount[normalizedAccountKey] || {
        accountKey: String(accountKey ?? "").trim(),
        pendingSponsorRewards: "0",
        pendingRecipientRewards: "0",
        pendingAgentRewards: "0",
    };
    entry[key] = (toBigIntValue(entry[key]) + toBigIntValue(value)).toString();
    entry.pendingRewards = (toBigIntValue(entry.pendingSponsorRewards) +
        toBigIntValue(entry.pendingRecipientRewards) +
        toBigIntValue(entry.pendingAgentRewards)).toString();
    target.__pendingRewardsByAccount[normalizedAccountKey] = entry;
}
function trackBucketLastUpdate(target, key, value) {
    const next = toBigIntValue(value);
    if (next <= 0n)
        return;
    const current = toBigIntValue(target[key]);
    if (current <= 0n || next < current) {
        target[key] = next.toString();
    }
}
function normalizePendingRewardsOptions(optionsOrTimestampOverride = undefined, timestampOverride = undefined) {
    const options = optionsOrTimestampOverride &&
        typeof optionsOrTimestampOverride === "object" &&
        !Array.isArray(optionsOrTimestampOverride)
        ? optionsOrTimestampOverride
        : {};
    const rawTimestampOverride = timestampOverride ??
        options.timestampOverride ??
        options.currentTimeStamp ??
        options.currentTimestamp ??
        (options === optionsOrTimestampOverride ? undefined : optionsOrTimestampOverride);
    const requestedCacheMs = Number(options.pendingRewardsCacheMs ??
        options.cacheMs ??
        options.ttlMs ??
        options.cacheTtlMs ??
        DEFAULT_PENDING_REWARDS_CACHE_MS);
    const stableReadTtlMs = options.stableReadTtlMs ??
        options.readTtlMs ??
        options.relationshipReadTtlMs ??
        DEFAULT_STABLE_REWARDS_READ_CACHE_MS;
    const forceRefreshCache = options.cache === "forceRefresh" ||
        options.cache === false ||
        options.useCache === false ||
        options.cacheEnabled === false;
    const cacheMs = Math.max(MIN_PENDING_REWARDS_CACHE_MS, Number.isFinite(requestedCacheMs) ? requestedCacheMs : DEFAULT_PENDING_REWARDS_CACHE_MS);
    return {
        timestampOverride: rawTimestampOverride,
        forceRefreshCache,
        cacheMs,
        readCacheOptions: {
            cache: forceRefreshCache
                ? "forceRefresh"
                : options.cache === "forceRefresh" || options.cache === "useCacheOnly"
                    ? options.cache
                    : "default",
            ...(options.cacheNamespace ? { cacheNamespace: options.cacheNamespace } : {}),
            ...(options.blockTag != null ? { blockTag: options.blockTag } : {}),
            ttlMs: stableReadTtlMs,
            ...(options.traceCache === true ? { traceCache: true } : {}),
        },
        // Capturing the per-bucket formula trace is pure in-memory bookkeeping
        // (no extra RPC calls) — on by default so the resolved
        // sponsorKey/recipientKey/agentKey/rateKey/totalStaked/
        // lastUpdateTimeStamp/annualInflation values are always available for
        // the caller to log, not just when a caller happens to opt in.
        traceRewardFormula: options.traceRewardFormula !== false,
    };
}
function getOffChainRewardsEstimateCache(runtime) {
    if (!runtime.__pendingRewardsCache || typeof runtime.__pendingRewardsCache !== "object") {
        runtime.__pendingRewardsCache = new Map();
    }
    return runtime.__pendingRewardsCache;
}
function getOffChainRewardsEstimateCacheKey(accountKey, timestampOverride, cacheMs = DEFAULT_PENDING_REWARDS_CACHE_MS) {
    const normalizedAccount = String(accountKey ?? "").trim().toLowerCase();
    const normalizedTimestamp = toBigIntValue(timestampOverride);
    const normalizedCacheMs = Math.max(1, Number.isFinite(Number(cacheMs)) ? Number(cacheMs) : DEFAULT_PENDING_REWARDS_CACHE_MS);
    const cacheWindowSeconds = Math.max(1, Math.floor(normalizedCacheMs / 1000));
    const timestampBucket = normalizedTimestamp > 0n
        ? (normalizedTimestamp / BigInt(cacheWindowSeconds)).toString()
        : "now";
    return `${normalizedAccount}|bucket:${timestampBucket}|ttlMs:${normalizedCacheMs}`;
}
function tracePendingRewardsCache(runtime, options, message) {
    if (!options?.readCacheOptions?.traceCache)
        return;
    const line = `Cache Trace: method=calculateClaimedRewards ${message}`;
    runtime?.spCoinLogger?.logDetail?.(`JS => ${line}`);
    try {
        if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
            window.dispatchEvent(new CustomEvent("spcoin-rpc-trace", { detail: { line } }));
        }
    }
    catch (_error) {
        // Tracing must never affect reward calculation.
    }
    try {
        console.debug(line);
    }
    catch (_error) {
        // Ignore console failures in restricted runtimes.
    }
}
function describePendingRewardsOptions(options) {
    const readOptions = options?.readCacheOptions ?? {};
    return [
        `estimateTimestampOverride=${String(options?.timestampOverride ?? "")}`,
        `estimateForceRefresh=${String(Boolean(options?.forceRefreshCache))}`,
        `estimateCacheMs=${String(options?.cacheMs ?? "")}`,
        `readCacheMode=${String(readOptions.cache ?? "")}`,
        `readTtlMs=${String(readOptions.ttlMs ?? "")}`,
        `readTtlSource=${readOptions.ttlMs == DEFAULT_STABLE_REWARDS_READ_CACHE_MS ? "default-stable-rewards-read-ttl" : "explicit-stable-read-ttl"}`,
        `readNamespace=${String(readOptions.cacheNamespace ?? "")}`,
        `readBlockTag=${String(readOptions.blockTag ?? "")}`,
        `readTimestampOverride=${String(readOptions.timestampOverride ?? "")}`,
        `traceCache=${String(Boolean(readOptions.traceCache))}`,
        `traceRewardFormula=${String(Boolean(options?.traceRewardFormula))}`,
    ].join(" ");
}
// A 503/transport failure (or any other error) can land mid-walk anywhere
// across the annualInflation read, the account record read, or the
// sponsor/recipient/agent relationship walks — the underlying error message
// alone (e.g. "server response 503") doesn't say which one was in flight.
// Wrapping each top-level step lets that surface in the trace log
// (PendingReward:estimate-error's `message`) as a `step=` prefix instead of
// leaving it a mystery which part of the calculation was interrupted.
async function runStep(stepName, fn) {
    try {
        return await fn();
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const wrapped = new Error(`[calculateClaimedRewards:step=${stepName}] ${message}`);
        wrapped.cause = error;
        throw wrapped;
    }
}
function clonePendingRewardsResult(value) {
    if (!value || typeof value !== "object")
        return value;
    try {
        return JSON.parse(JSON.stringify(value));
    }
    catch (_error) {
        return value;
    }
}
function formatLocalTimestamp(secondsValue) {
    const seconds = Number(toBigIntValue(secondsValue));
    if (!Number.isFinite(seconds) || seconds <= 0)
        return "N/A";
    const date = new Date(seconds * 1000);
    if (Number.isNaN(date.getTime()))
        return "N/A";
    const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    const hour24 = date.getHours();
    const hour12 = hour24 % 12 || 12;
    const minute = String(date.getMinutes()).padStart(2, "0");
    const meridiem = hour24 < 12 ? "a.m." : "p.m.";
    const timeZone = date
        .toLocaleTimeString("en-US", { timeZoneName: "short" })
        .split(" ")
        .pop() || "";
    return `${month}-${day}-${year}, ${hour12}:${minute} ${meridiem}${timeZone ? ` ${timeZone}` : ""}`;
}
function calculatePendingStakingRewards(totalStaked, lastUpdateTimeStamp, currentTimeStamp, rate) {
    const normalizedLastUpdate = toBigIntValue(lastUpdateTimeStamp);
    const normalizedCurrentTime = toBigIntValue(currentTimeStamp);
    const timeDiff = normalizedLastUpdate > normalizedCurrentTime ? 0n : normalizedCurrentTime - normalizedLastUpdate;
    return (timeDiff * toBigIntValue(totalStaked) * toBigIntValue(rate)) / 100n / YEAR_SECONDS;
}
function buildRewardFormulaTrace(kind, keys, totalStaked, lastUpdateTimeStamp, currentTimeStamp, rate, rewards) {
    const normalizedLastUpdate = toBigIntValue(lastUpdateTimeStamp);
    const normalizedCurrentTime = toBigIntValue(currentTimeStamp);
    const timeDiff = normalizedLastUpdate > normalizedCurrentTime ? 0n : normalizedCurrentTime - normalizedLastUpdate;
    return {
        kind,
        ...keys,
        totalStaked: String(totalStaked ?? "0"),
        lastUpdateTimeStamp: String(lastUpdateTimeStamp ?? "0"),
        currentTimeStamp: String(currentTimeStamp ?? "0"),
        timeDiff: timeDiff.toString(),
        rate: String(rate ?? "0"),
        yearSeconds: YEAR_SECONDS.toString(),
        formula: "floor(floor(timeDiff * totalStaked * rate / 100) / yearSeconds)",
        rewards: String(rewards ?? "0"),
    };
}
// The reward pool is a direct top-down split, not a chain of "gross up then
// re-derive" divisions:
//   base               = totalStaked accrued at annualInflation over timeDiff
//   recipientAgentPool = base * recipientRateKey / 100   (this % goes to Recipient+Agent; remainder to Sponsor)
//   agentReward         = recipientAgentPool * agentRateKey / 1000   (up to 10%, since agentRateKey maxes at 100)
//   recipientReward     = recipientAgentPool - agentReward           (the rest of that pool)
// e.g. recipientRateKey=50, agentRateKey=100 (max) → Sponsor 50%, Recipient 45%, Agent 5% of base.
function splitRewardPool(base, recipientRate) {
    const normalizedBase = toBigIntValue(base);
    const recipientAgentPool = (normalizedBase * toBigIntValue(recipientRate)) / 100n;
    const sponsorReward = normalizedBase - recipientAgentPool;
    return { recipientAgentPool, sponsorReward };
}
function splitAgentPool(recipientAgentPool, agentRate) {
    const agentReward = (toBigIntValue(recipientAgentPool) * toBigIntValue(agentRate)) / 1000n;
    const recipientReward = toBigIntValue(recipientAgentPool) - agentReward;
    return { agentReward, recipientReward };
}
async function getCurrentBlockTimestamp(runtime, timestampOverride = undefined) {
    const normalizedOverride = toBigIntValue(timestampOverride);
    if (normalizedOverride > 0n)
        return normalizedOverride;
    return BigInt(Math.floor(Date.now() / 1000));
}
async function getAnnualInflation(runtime, readOptions = undefined) {
    try {
        return toBigIntValue(await getInflationRateCached(runtime, readOptions));
    }
    catch (_error) {
        return 10n;
    }
}
async function getAccountLinks(runtime, accountKey, readOptions = undefined) {
    const accountRecord = await getAccountRecordObjectCached(runtime, accountKey, readOptions);
    return {
        sponsorKeys: toAddressList(accountRecord?.sponsorKeys),
        recipientKeys: toAddressList(accountRecord?.recipientKeys),
        parentRecipientKeys: toAddressList(accountRecord?.parentRecipientKeys),
    };
}
async function calculateRecipientSetRewards(runtime, sponsorKey, recipientKey, recipientRate, currentTimeStamp, annualInflation, readOptions = undefined, formulaTrace = undefined) {
    const setRecord = await getRecipientRateTransactionSetCached(runtime, sponsorKey, recipientKey, recipientRate, readOptions);
    if (!setRecord?.inserted)
        return { recipientRewards: 0n, sponsorRewards: 0n, lastUpdate: "0", stakedQuantity: "0" };
    const base = calculatePendingStakingRewards(setRecord.totalStaked, setRecord.lastUpdateTimeStamp, currentTimeStamp, annualInflation);
    const { recipientAgentPool, sponsorReward } = splitRewardPool(base, recipientRate);
    // No agent on this transaction set — the whole Recipient+Agent pool
    // belongs to the recipient.
    formulaTrace?.push(buildRewardFormulaTrace("recipient", {
        sponsorKey, recipientKey, recipientRate: String(recipientRate ?? "0"),
        annualInflation: String(annualInflation ?? "0"), base: base.toString(),
        recipientRewards: recipientAgentPool.toString(), sponsorRewards: sponsorReward.toString(),
    }, setRecord.totalStaked, setRecord.lastUpdateTimeStamp, currentTimeStamp, annualInflation, base));
    return {
        recipientRewards: recipientAgentPool,
        sponsorRewards: sponsorReward,
        lastUpdate: String(setRecord.lastUpdateTimeStamp ?? "0"),
        stakedQuantity: String(setRecord.totalStaked ?? "0"),
    };
}
async function calculateAgentSetRewards(runtime, sponsorKey, recipientKey, recipientRate, agentKey, agentRate, currentTimeStamp, annualInflation, readOptions = undefined, formulaTrace = undefined) {
    const setRecord = await getAgentRateTransactionSetCached(runtime, sponsorKey, recipientKey, recipientRate, agentKey, agentRate, readOptions);
    if (!setRecord?.inserted)
        return { agentRewards: 0n, recipientRewards: 0n, sponsorRewards: 0n, lastUpdate: "0", stakedQuantity: "0" };
    const base = calculatePendingStakingRewards(setRecord.totalStaked, setRecord.lastUpdateTimeStamp, currentTimeStamp, annualInflation);
    const { recipientAgentPool, sponsorReward } = splitRewardPool(base, recipientRate);
    // agentRate is the raw 0-100 on-chain slider key (getAgentRateList reads
    // it straight from storage) — up to 10% of the combined Recipient+Agent
    // pool (agentRate/1000, maxing at 100/1000 = 10%). The remainder of that
    // pool goes to the recipient.
    const { agentReward, recipientReward } = splitAgentPool(recipientAgentPool, agentRate);
    formulaTrace?.push(buildRewardFormulaTrace("agent", {
        sponsorKey, recipientKey, recipientRate: String(recipientRate ?? "0"), agentKey, agentRate: String(agentRate ?? "0"),
        annualInflation: String(annualInflation ?? "0"), base: base.toString(), recipientAgentPool: recipientAgentPool.toString(),
        agentRewards: agentReward.toString(), recipientRewards: recipientReward.toString(), sponsorRewards: sponsorReward.toString(),
    }, setRecord.totalStaked, setRecord.lastUpdateTimeStamp, currentTimeStamp, annualInflation, base));
    return {
        agentRewards: agentReward,
        recipientRewards: recipientReward,
        sponsorRewards: sponsorReward,
        lastUpdate: String(setRecord.lastUpdateTimeStamp ?? "0"),
        stakedQuantity: String(setRecord.totalStaked ?? "0"),
    };
}
async function getRecipientRates(runtime, sponsorKey, recipientKey, readOptions = undefined) {
    try {
        return toRateList(await getRecipientRateListCached(runtime, sponsorKey, recipientKey, readOptions));
    }
    catch (_error) {
        return [];
    }
}
async function getRecipientRateAgents(runtime, sponsorKey, recipientKey, recipientRate, readOptions = undefined) {
    try {
        return toAddressList(await getRecipientRateAgentListCached(runtime, sponsorKey, recipientKey, recipientRate, readOptions));
    }
    catch (_error) {
        return [];
    }
}
async function getAgentRates(runtime, sponsorKey, recipientKey, recipientRate, agentKey, readOptions = undefined) {
    try {
        return toRateList(await getAgentRateListCached(runtime, sponsorKey, recipientKey, recipientRate, agentKey, readOptions));
    }
    catch (_error) {
        return [];
    }
}
async function addSponsorPathPending(runtime, pending, accountKey, currentTimeStamp, annualInflation, readOptions = undefined, formulaTrace = undefined) {
    const { recipientKeys } = await getAccountLinks(runtime, accountKey, readOptions);
    tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=sponsor account=${String(accountKey ?? "")} recipientCount=${String(recipientKeys.length)}`);
    if (recipientKeys.length === 0) {
        tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=sponsor stop=no-recipient-links account=${String(accountKey ?? "")}`);
    }
    for (const recipientKey of recipientKeys) {
        const recipientRates = await getRecipientRates(runtime, accountKey, recipientKey, readOptions);
        tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=sponsor sponsor=${String(accountKey ?? "")} recipient=${String(recipientKey ?? "")} recipientRateCount=${String(recipientRates.length)}`);
        if (recipientRates.length === 0) {
            tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=sponsor stop=no-recipient-rates sponsor=${String(accountKey ?? "")} recipient=${String(recipientKey ?? "")}`);
        }
        for (const recipientRate of recipientRates) {
            const { recipientRewards, sponsorRewards, lastUpdate, stakedQuantity } = await calculateRecipientSetRewards(runtime, accountKey, recipientKey, recipientRate, currentTimeStamp, annualInflation, readOptions, formulaTrace);
            trackBucketLastUpdate(pending, "sponsorBucketLastUpdateTimeStamp", lastUpdate);
            addPending(pending, "sponsorBucketStakedQuantity", stakedQuantity);
            addPending(pending, "pendingSponsorRewards", sponsorRewards);
            addPendingForAccount(pending, accountKey, "pendingSponsorRewards", sponsorRewards);
            addPendingForAccount(pending, recipientKey, "pendingRecipientRewards", recipientRewards);
            const agentKeys = await getRecipientRateAgents(runtime, accountKey, recipientKey, recipientRate, readOptions);
            tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=sponsor sponsor=${String(accountKey ?? "")} recipient=${String(recipientKey ?? "")} recipientRate=${String(recipientRate ?? "")} agentCount=${String(agentKeys.length)}`);
            for (const agentKey of agentKeys) {
                const agentRates = await getAgentRates(runtime, accountKey, recipientKey, recipientRate, agentKey, readOptions);
                tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=sponsor sponsor=${String(accountKey ?? "")} recipient=${String(recipientKey ?? "")} recipientRate=${String(recipientRate ?? "")} agent=${String(agentKey ?? "")} agentRateCount=${String(agentRates.length)}`);
                for (const agentRate of agentRates) {
                    const { agentRewards, recipientRewards: recipientAgentRewards, sponsorRewards: sponsorAgentRewards, lastUpdate: agentLastUpdate, stakedQuantity: agentStakedQuantity } = await calculateAgentSetRewards(runtime, accountKey, recipientKey, recipientRate, agentKey, agentRate, currentTimeStamp, annualInflation, readOptions, formulaTrace);
                    trackBucketLastUpdate(pending, "sponsorBucketLastUpdateTimeStamp", agentLastUpdate);
                    addPending(pending, "sponsorBucketStakedQuantity", agentStakedQuantity);
                    addPending(pending, "pendingSponsorRewards", sponsorAgentRewards);
                    addPendingForAccount(pending, accountKey, "pendingSponsorRewards", sponsorAgentRewards);
                    addPendingForAccount(pending, recipientKey, "pendingRecipientRewards", recipientAgentRewards);
                    addPendingForAccount(pending, agentKey, "pendingAgentRewards", agentRewards);
                }
            }
        }
    }
}
async function addRecipientPathPending(runtime, pending, accountKey, currentTimeStamp, annualInflation, readOptions = undefined, formulaTrace = undefined) {
    const { sponsorKeys } = await getAccountLinks(runtime, accountKey, readOptions);
    tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=recipient account=${String(accountKey ?? "")} sponsorCount=${String(sponsorKeys.length)}`);
    if (sponsorKeys.length === 0) {
        tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=recipient stop=no-sponsor-links account=${String(accountKey ?? "")}`);
    }
    for (const sponsorKey of sponsorKeys) {
        const recipientRates = await getRecipientRates(runtime, sponsorKey, accountKey, readOptions);
        tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=recipient sponsor=${String(sponsorKey ?? "")} recipient=${String(accountKey ?? "")} recipientRateCount=${String(recipientRates.length)}`);
        if (recipientRates.length === 0) {
            tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=recipient stop=no-recipient-rates sponsor=${String(sponsorKey ?? "")} recipient=${String(accountKey ?? "")}`);
        }
        for (const recipientRate of recipientRates) {
            const { recipientRewards, sponsorRewards, lastUpdate, stakedQuantity } = await calculateRecipientSetRewards(runtime, sponsorKey, accountKey, recipientRate, currentTimeStamp, annualInflation, readOptions, formulaTrace);
            trackBucketLastUpdate(pending, "recipientBucketLastUpdateTimeStamp", lastUpdate);
            addPending(pending, "recipientBucketStakedQuantity", stakedQuantity);
            addPending(pending, "pendingRecipientRewards", recipientRewards);
            addPendingForAccount(pending, accountKey, "pendingRecipientRewards", recipientRewards);
            addPendingForAccount(pending, sponsorKey, "pendingSponsorRewards", sponsorRewards);
            const agentKeys = await getRecipientRateAgents(runtime, sponsorKey, accountKey, recipientRate, readOptions);
            tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=recipient sponsor=${String(sponsorKey ?? "")} recipient=${String(accountKey ?? "")} recipientRate=${String(recipientRate ?? "")} agentCount=${String(agentKeys.length)}`);
            for (const agentKey of agentKeys) {
                const agentRates = await getAgentRates(runtime, sponsorKey, accountKey, recipientRate, agentKey, readOptions);
                tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=recipient sponsor=${String(sponsorKey ?? "")} recipient=${String(accountKey ?? "")} recipientRate=${String(recipientRate ?? "")} agent=${String(agentKey ?? "")} agentRateCount=${String(agentRates.length)}`);
                for (const agentRate of agentRates) {
                    const { agentRewards, recipientRewards: recipientAgentRewards, sponsorRewards: sponsorAgentRewards, lastUpdate: agentLastUpdate, stakedQuantity: agentStakedQuantity } = await calculateAgentSetRewards(runtime, sponsorKey, accountKey, recipientRate, agentKey, agentRate, currentTimeStamp, annualInflation, readOptions, formulaTrace);
                    trackBucketLastUpdate(pending, "recipientBucketLastUpdateTimeStamp", agentLastUpdate);
                    addPending(pending, "recipientBucketStakedQuantity", agentStakedQuantity);
                    addPending(pending, "pendingRecipientRewards", recipientAgentRewards);
                    addPendingForAccount(pending, accountKey, "pendingRecipientRewards", recipientAgentRewards);
                    addPendingForAccount(pending, sponsorKey, "pendingSponsorRewards", sponsorAgentRewards);
                    addPendingForAccount(pending, agentKey, "pendingAgentRewards", agentRewards);
                }
            }
        }
    }
}
async function addAgentPathPending(runtime, pending, accountKey, currentTimeStamp, annualInflation, readOptions = undefined, formulaTrace = undefined) {
    const { parentRecipientKeys } = await getAccountLinks(runtime, accountKey, readOptions);
    tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=agent account=${String(accountKey ?? "")} parentRecipientCount=${String(parentRecipientKeys.length)}`);
    if (parentRecipientKeys.length === 0) {
        tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=agent stop=no-parent-recipient-links account=${String(accountKey ?? "")}`);
    }
    for (const parentRecipientKey of parentRecipientKeys) {
        const { sponsorKeys } = await getAccountLinks(runtime, parentRecipientKey, readOptions);
        tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=agent account=${String(accountKey ?? "")} parentRecipient=${String(parentRecipientKey ?? "")} sponsorCount=${String(sponsorKeys.length)}`);
        for (const sponsorKey of sponsorKeys) {
            const recipientRates = await getRecipientRates(runtime, sponsorKey, parentRecipientKey, readOptions);
            tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=agent sponsor=${String(sponsorKey ?? "")} parentRecipient=${String(parentRecipientKey ?? "")} recipientRateCount=${String(recipientRates.length)}`);
            for (const recipientRate of recipientRates) {
                const agentKeys = await getRecipientRateAgents(runtime, sponsorKey, parentRecipientKey, recipientRate, readOptions);
                tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=agent sponsor=${String(sponsorKey ?? "")} parentRecipient=${String(parentRecipientKey ?? "")} recipientRate=${String(recipientRate ?? "")} agentCount=${String(agentKeys.length)}`);
                if (!agentKeys.map((key) => key.toLowerCase()).includes(String(accountKey).toLowerCase())) {
                    tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=agent skip=account-not-in-agent-list account=${String(accountKey ?? "")} sponsor=${String(sponsorKey ?? "")} parentRecipient=${String(parentRecipientKey ?? "")} recipientRate=${String(recipientRate ?? "")}`);
                    continue;
                }
                const agentRates = await getAgentRates(runtime, sponsorKey, parentRecipientKey, recipientRate, accountKey, readOptions);
                tracePendingRewardsCache(runtime, { readCacheOptions: readOptions }, `path=agent sponsor=${String(sponsorKey ?? "")} parentRecipient=${String(parentRecipientKey ?? "")} recipientRate=${String(recipientRate ?? "")} account=${String(accountKey ?? "")} agentRateCount=${String(agentRates.length)}`);
                for (const agentRate of agentRates) {
                    const { agentRewards, recipientRewards: recipientParentAmount, sponsorRewards: sponsorAmount, lastUpdate, stakedQuantity } = await calculateAgentSetRewards(runtime, sponsorKey, parentRecipientKey, recipientRate, accountKey, agentRate, currentTimeStamp, annualInflation, readOptions, formulaTrace);
                    trackBucketLastUpdate(pending, "agentBucketLastUpdateTimeStamp", lastUpdate);
                    addPending(pending, "agentBucketStakedQuantity", stakedQuantity);
                    addPending(pending, "pendingAgentRewards", agentRewards);
                    addPendingForAccount(pending, accountKey, "pendingAgentRewards", agentRewards);
                    addPendingForAccount(pending, parentRecipientKey, "pendingRecipientRewards", recipientParentAmount);
                    addPendingForAccount(pending, sponsorKey, "pendingSponsorRewards", sponsorAmount);
                }
            }
        }
    }
}
export async function calculateClaimedRewards(context, accountKey, optionsOrTimestampOverride = undefined, timestampOverride = undefined) {
    const runtime = context;
    const options = normalizePendingRewardsOptions(optionsOrTimestampOverride, timestampOverride);
    tracePendingRewardsCache(runtime, options, `normalized account=${String(accountKey ?? "")} ${describePendingRewardsOptions(options)}`);
    const cache = getOffChainRewardsEstimateCache(runtime);
    const cacheKey = getOffChainRewardsEstimateCacheKey(accountKey, options.timestampOverride);
    const nowMs = Date.now();
    const cached = options.forceRefreshCache ? null : cache.get(cacheKey);
    if (cached && cached.expiresAtMs > nowMs) {
        tracePendingRewardsCache(runtime, options, `Cache Read Direct: phase=hit key=${cacheKey} ttlRemainingMs=${cached.expiresAtMs - nowMs}`);
        return clonePendingRewardsResult(await cached.promise);
    }
    tracePendingRewardsCache(runtime, options, `${options.forceRefreshCache ? "Cache Readthrough Force Refresh: phase=forceRefresh" : cached ? "Cache Readthrough: phase=expired" : "Cache Readthrough: phase=miss"} key=${cacheKey} cacheMs=${options.cacheMs}`);
    runtime.spCoinLogger.logFunctionHeader("calculateClaimedRewards(" + accountKey + ")");
    const pendingPromise = (async () => {
        if (options.readCacheOptions?.cache === "forceRefresh") {
            tracePendingRewardsCache(runtime, options, `Cache Clear: phase=relationship-cache cacheMode=${options.readCacheOptions.cache}`);
            delete runtime.__relationshipReadCache;
        }
        const currentTimeStamp = await getCurrentBlockTimestamp(runtime, options.timestampOverride);
        const readOptions = options.readCacheOptions;
        tracePendingRewardsCache(runtime, options, `stable-read-options account=${String(accountKey ?? "")} currentTimeStamp=${String(currentTimeStamp)} ${describePendingRewardsOptions(options)}`);
        const annualInflation = await runStep("annualInflation", () => getAnnualInflation(runtime, readOptions));
        const accountRecord = await runStep("accountRecord", () => getAccountRecordObjectCached(runtime, accountKey, readOptions));
        const formulaTrace = options.traceRewardFormula ? [] : undefined;
        const pending = {
            TYPE: "--ACCOUNT_PENDING_REWARDS--",
            accountKey: String(accountKey ?? ""),
            calculatedTimeStamp: currentTimeStamp.toString(),
            calculatedFormatted: formatLocalTimestamp(currentTimeStamp),
            lastSponsorUpdate: String(accountRecord?.lastSponsorUpdateTimeStamp ?? "0"),
            lastRecipientUpdate: String(accountRecord?.lastRecipientUpdateTimeStamp ?? "0"),
            lastAgentUpdate: String(accountRecord?.lastAgentUpdateTimeStamp ?? "0"),
            annualInflation: annualInflation.toString(),
            sponsorBucketLastUpdateTimeStamp: "0",
            recipientBucketLastUpdateTimeStamp: "0",
            agentBucketLastUpdateTimeStamp: "0",
            sponsorBucketStakedQuantity: "0",
            recipientBucketStakedQuantity: "0",
            agentBucketStakedQuantity: "0",
            pendingRewards: "0",
            pendingSponsorRewards: "0",
            pendingRecipientRewards: "0",
            pendingAgentRewards: "0",
        };
        await runStep("sponsorPath", () => addSponsorPathPending(runtime, pending, accountKey, currentTimeStamp, annualInflation, readOptions, formulaTrace));
        await runStep("recipientPath", () => addRecipientPathPending(runtime, pending, accountKey, currentTimeStamp, annualInflation, readOptions, formulaTrace));
        await runStep("agentPath", () => addAgentPathPending(runtime, pending, accountKey, currentTimeStamp, annualInflation, readOptions, formulaTrace));
        pending.pendingRewards = (toBigIntValue(pending.pendingSponsorRewards) +
            toBigIntValue(pending.pendingRecipientRewards) +
            toBigIntValue(pending.pendingAgentRewards)).toString();
        if (formulaTrace) {
            pending.__rewardFormulaTrace = formulaTrace;
        }
        runtime.spCoinLogger.logExitFunction();
        return pending;
    })();
    cache.set(cacheKey, {
        expiresAtMs: nowMs + options.cacheMs,
        promise: pendingPromise,
    });
    tracePendingRewardsCache(runtime, options, `Cache Update: phase=set key=${cacheKey} ttlMs=${options.cacheMs} expiresAtMs=${nowMs + options.cacheMs}`);
    try {
        return clonePendingRewardsResult(await pendingPromise);
    }
    catch (error) {
        cache.delete(cacheKey);
        throw error;
    }
}
