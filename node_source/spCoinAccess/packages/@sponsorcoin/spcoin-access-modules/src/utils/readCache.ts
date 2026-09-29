export type SpCoinReadCacheMode = "default" | "forceRefresh" | "useCacheOnly";

export const FALLBACK_READ_CACHE_TTL_MS = 10_000;

export interface SpCoinReadCacheOptions {
  cache?: SpCoinReadCacheMode;
  cacheNamespace?: string;
  blockTag?: "latest" | "pending" | number;
  ttlMs?: number;
  traceCache?: boolean;
  timestampOverride?: string | number | bigint;
}

export function isReadCacheOptions(value: unknown): value is SpCoinReadCacheOptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    "cache" in record ||
    "cacheNamespace" in record ||
    "blockTag" in record ||
    "ttlMs" in record ||
    "traceCache" in record ||
    "timestampOverride" in record
  );
}

export function splitReadCacheOptions(args: unknown[]): {
  args: unknown[];
  options: SpCoinReadCacheOptions;
} {
  const nextArgs = [...args];
  const last = nextArgs[nextArgs.length - 1];
  if (isReadCacheOptions(last)) {
    nextArgs.pop();
    return { args: nextArgs, options: last };
  }
  return { args: nextArgs, options: {} };
}

export interface CacheEntry {
  value: unknown;
  cachedAt: number;
  dependencies: Set<string>;
}

export interface ProviderScopeInfo {
  chainId: string;
  contractAddress: string;
  providerType: string;
  runnerType: string;
  rpcUrl: string;
  scopeSource: string;
}

export interface ClearCacheResult {
  cleared: true;
  entriesBefore: number;
  entriesAfter: number;
}

export interface SetCacheTraceModeResult {
  cacheTraceMode: boolean;
}

const cache = new Map<string, CacheEntry>();
const dependencyIndex = new Map<string, Set<string>>();
let globalCacheTraceMode = false;

export function normalizeAddress(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function parseMs(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeArg(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalizeArg);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, innerValue]) => [key, normalizeArg(innerValue)]),
    );
  }
  if (typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value.trim())) {
    return value.trim().toLowerCase();
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(normalizeArg(value));
}

export function getContractAddress(context: unknown): string {
  const contract = (context as { spCoinContractDeployed?: Record<string, unknown> })?.spCoinContractDeployed;
  return normalizeAddress(contract?.target || contract?.address || contract?.contractAddress || "unknown-contract");
}

export function getProviderScopeInfo(context: unknown): ProviderScopeInfo {
  const contract = (context as { spCoinContractDeployed?: Record<string, unknown> })?.spCoinContractDeployed;
  const runner = contract?.runner as Record<string, unknown> | undefined;
  const provider = (runner?.provider || runner || contract?.provider) as Record<string, unknown> | undefined;
  const providerType = String(provider?.constructor?.name || typeof provider || "unknown");
  const runnerType = String(runner?.constructor?.name || typeof runner || "unknown");
  const connectionUrl =
    typeof provider?._getConnection === "function"
      ? (provider._getConnection() as { url?: unknown } | undefined)?.url
      : provider?.connection && typeof provider.connection === "object"
        ? (provider.connection as { url?: unknown }).url
        : (provider?._connection && typeof provider._connection === "object"
            ? (provider._connection as { url?: unknown }).url
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
  const network = provider?._network as { chainId?: unknown } | undefined;
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

export function getChainId(context: unknown): string {
  return getProviderScopeInfo(context).chainId;
}

export function buildReadCacheKey(
  context: unknown,
  method: string,
  args: unknown[],
  options: SpCoinReadCacheOptions = {},
): string {
  const scopedOptions =
    options.cacheNamespace != null || options.blockTag != null || options.timestampOverride != null
      ? {
          cacheNamespace: options.cacheNamespace,
          blockTag: options.blockTag,
          timestampOverride:
            typeof options.timestampOverride === "bigint"
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

export function compactKey(value: string) {
  if (value.length <= 240) return value;
  return `${value.slice(0, 180)}...${value.slice(-48)}`;
}

export function serializeTraceArg(value: unknown): string {
  try {
    const json = stableJson(value);
    return json.length <= 160 ? json : `${json.slice(0, 120)}...${json.slice(-32)}`;
  } catch {
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
let defaultTtlMsOverride: { publicTtlMs?: string; serverTtlMs?: string } = {};

export function configureDefaultReadCacheTtlEnv(env: { publicTtlMs?: string; serverTtlMs?: string }): void {
  defaultTtlMsOverride = { ...defaultTtlMsOverride, ...env };
}

export function getDefaultReadCacheTtlMs(): number {
  const publicTtlMs = parseMs(defaultTtlMsOverride.publicTtlMs);
  if (publicTtlMs !== null && publicTtlMs > 0) return publicTtlMs;
  const serverTtlMs = parseMs(defaultTtlMsOverride.serverTtlMs);
  if (serverTtlMs !== null && serverTtlMs > 0) return serverTtlMs;
  return FALLBACK_READ_CACHE_TTL_MS;
}

export function getCacheMode(options: SpCoinReadCacheOptions): SpCoinReadCacheMode {
  return options.cache || "default";
}

export function getEffectiveTtlMs(options: SpCoinReadCacheOptions) {
  const ttlMs = parseMs(options.ttlMs);
  return ttlMs !== null ? ttlMs : getDefaultReadCacheTtlMs();
}

export function shouldInvalidateExactEntry(options: SpCoinReadCacheOptions): boolean {
  return parseMs(options.ttlMs) === 0;
}

export function allowsLiveRead(options: SpCoinReadCacheOptions): boolean {
  return getCacheMode(options) !== "useCacheOnly";
}

export function isEntryFresh(entry: CacheEntry, options: SpCoinReadCacheOptions) {
  const ttlMs = getEffectiveTtlMs(options);
  if (!Number.isFinite(ttlMs) || ttlMs <= 0) return false;
  return Date.now() - entry.cachedAt <= ttlMs;
}

export function getEntryAgeMs(entry: CacheEntry | undefined, nowMs = Date.now()) {
  return entry ? Math.max(0, nowMs - Number(entry.cachedAt || nowMs)) : null;
}

function indexEntry(key: string, dependencies: Set<string>) {
  for (const dependency of dependencies) {
    if (!dependencyIndex.has(dependency)) dependencyIndex.set(dependency, new Set());
    dependencyIndex.get(dependency)?.add(key);
  }
}

function unindexEntry(key: string) {
  const entry = cache.get(key);
  if (!entry) return;
  for (const dependency of entry.dependencies) {
    const keys = dependencyIndex.get(dependency);
    keys?.delete(key);
    if (keys?.size === 0) dependencyIndex.delete(dependency);
  }
}

export function getCacheEntry(key: string): CacheEntry | undefined {
  return cache.get(key);
}

export function setCacheEntry(key: string, value: unknown, dependencies: Set<string>) {
  unindexEntry(key);
  cache.set(key, { value, cachedAt: Date.now(), dependencies });
  indexEntry(key, dependencies);
}

export function invalidateReadCacheEntry(key: string): number {
  if (!cache.has(key)) return 0;
  unindexEntry(key);
  cache.delete(key);
  return 1;
}

export function invalidateReadCacheByDependency(dependency: string): number {
  const keys = Array.from(dependencyIndex.get(dependency) || []);
  for (const key of keys) {
    invalidateReadCacheEntry(key);
  }
  return keys.length;
}

export function invalidateReadCacheByDependencies(dependencies: Iterable<string>): number {
  const keys = new Set<string>();
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

export function invalidateReadCacheForAccount(accountKey: string): number {
  return invalidateReadCacheByDependency(`account:${normalizeAddress(accountKey)}`);
}

export function invalidateReadCacheForContract(contractAddress: string, chainId = "unknown-chain"): number {
  return invalidateReadCacheByDependency(`contract:${String(chainId)}:${normalizeAddress(contractAddress)}`);
}

export function clearReadCache(): void {
  cache.clear();
  dependencyIndex.clear();
}

export function clearCache(): ClearCacheResult {
  const entriesBefore = cache.size;
  clearReadCache();
  return {
    cleared: true,
    entriesBefore,
    entriesAfter: cache.size,
  };
}

export function getReadCacheSize(): number {
  return cache.size;
}

export function getCacheTraceMode(): boolean {
  return globalCacheTraceMode;
}

export function setCacheTraceMode(enabled: boolean): SetCacheTraceModeResult {
  globalCacheTraceMode = Boolean(enabled);
  return { cacheTraceMode: globalCacheTraceMode };
}

const METHOD_DOMAIN_TAGS: Record<string, string[]> = {
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

export function buildReadCacheDependencies(context: unknown, method: string, args: unknown[]): Set<string> {
  const contractAddress = getContractAddress(context);
  const chainId = getChainId(context);
  const dependencies = new Set<string>([
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

const WRITE_DOMAIN_TAGS: Record<string, string[]> = {
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

export function invalidateAfterWrite(methodName: string, args: unknown[] = []): number {
  const dependencies = new Set<string>(WRITE_DOMAIN_TAGS[String(methodName || "")] ?? []);
  for (const arg of args) {
    if (typeof arg === "string" && /^0x[a-fA-F0-9]{40}$/.test(arg.trim())) {
      dependencies.add(`account:${normalizeAddress(arg)}`);
    }
  }
  if (dependencies.size === 0) return 0;
  return invalidateReadCacheByDependencies(dependencies);
}

export function invalidateAfterAccountWrite(accountKey: string): number {
  return invalidateReadCacheForAccount(accountKey);
}

function emitBrowserTrace(line: string) {
  try {
    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(new CustomEvent("spcoin-rpc-trace", { detail: { line } }));
    }
  } catch {
    // Tracing must never affect read behavior.
  }
}

function trace(context: unknown, options: SpCoinReadCacheOptions, message: string) {
  if (!options.traceCache && !getCacheTraceMode()) return;
  const logger = (context as { spCoinLogger?: { logDetail?: (value: string) => void } })?.spCoinLogger;
  const line = `Cache Trace: ${message}`;
  logger?.logDetail?.(`JS => ${line}`);
  emitBrowserTrace(line);
  try {
    console.debug(line);
  } catch {
    // Ignore console failures in restricted runtimes.
  }
}

function getCacheTraceAction(phase: string) {
  if (phase === "hit" || phase === "hit-only") return "Cache Read Direct";
  if (phase === "set") return "Cache Update";
  if (phase === "invalidate-exact") return "Cache Clear";
  if (phase === "forceRefresh") return "Cache Readthrough Force Refresh";
  if (phase === "miss") return "Cache Readthrough";
  if (phase === "miss-only") return "Cache Read Only Miss";
  return "Cache Trace";
}

function traceReadCacheDecision(params: {
  context: unknown;
  options: SpCoinReadCacheOptions;
  method: string;
  args: unknown[];
  key: string;
  phase: string;
  mode: SpCoinReadCacheMode;
  entry?: CacheEntry;
  fresh?: boolean;
  detail?: string;
}) {
  const { context, options, method, args, key, phase, mode, entry, fresh, detail } = params;
  if (!options.traceCache && !getCacheTraceMode()) return;
  const nowMs = Date.now();
  const scope = getProviderScopeInfo(context);
  const ttlMs = getEffectiveTtlMs(options);
  const ageMs = getEntryAgeMs(entry, nowMs);
  const dependencies = entry ? Array.from(entry.dependencies).join(",") : "";
  const action = getCacheTraceAction(phase);
  trace(
    context,
    options,
    [
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
    ].filter(Boolean).join(" "),
  );
}

export async function runCachedRead(
  context: unknown,
  method: string,
  args: unknown[],
  options: SpCoinReadCacheOptions,
  loader: () => Promise<unknown> | unknown,
): Promise<unknown> {
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
