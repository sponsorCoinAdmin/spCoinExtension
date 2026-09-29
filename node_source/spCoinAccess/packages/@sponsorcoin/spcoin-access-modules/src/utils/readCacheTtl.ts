import type { SpCoinReadCacheOptions } from "./readCache";

// 2026-09-29, real fix (library isolation audit, on request — "the
// node_source ... library is suppose to be a standalone library requiring
// nothing from the web app or extension"). BLOCK_READ_CACHE_TTL_ENV_VALUES
// and METHOD_READ_CACHE_TTL_ENV_VALUES below used to be top-level consts
// computed once at import time directly from process.env.NEXT_PUBLIC_*
// (~61 distinct vars) — a Next.js-specific build-time-inlining convention
// this portable library has no business assuming (Vite, the extension's
// own bundler, has no equivalent and never populates it). getMethodEnvTtlMs/
// getBlockEnvTtlMs below are real functions, already called lazily at each
// use site (not frozen at module load), so making the SOURCE they read
// from mutable/injectable is enough — no call-site changes needed, unlike
// the panelTree/*.ts debug flags (see that package's debugFlags.ts for why
// those needed a deeper fix). Both override maps default to empty, the
// exact same fallback behavior any consumer that never had these vars
// populated already gets (falls through to METHOD_READ_CACHE_TTL_MS/
// BLOCK_READ_CACHE_TTL_MS/getBlockDefaultTtlMs below) — zero runtime
// behavior change. The web app's own bootstrap should call
// configureReadCacheTtlEnv() once with its real process.env reads
// (mirrors configureDefaultReadCacheTtlEnv() in readCache.ts, done
// 2026-09-29 earlier the same pass); the extension simply never calls it.
let blockEnvOverrides: Record<string, string | undefined> = {};
let methodEnvOverrides: Record<string, string | undefined> = {};

export function configureReadCacheTtlEnv(overrides: {
  block?: Record<string, string | undefined>;
  method?: Record<string, string | undefined>;
}): void {
  if (overrides.block) blockEnvOverrides = { ...blockEnvOverrides, ...overrides.block };
  if (overrides.method) methodEnvOverrides = { ...methodEnvOverrides, ...overrides.method };
}

const METHOD_READ_CACHE_TTL_MS: Record<string, number> = {
  getAccountRecord: 60 * 60 * 1000,
  getAccountRecordShallow: 60 * 60 * 1000,
  getAccountRelationshipRecord: 60 * 60 * 1000,
  getAccountRewardSnapshotRecord: 60 * 60 * 1000,
  getAccountRewardTotals: 60 * 60 * 1000,
  getAccountLinks: 60 * 60 * 1000,
};

const METHOD_READ_CACHE_TTL_BLOCKS: Record<string, string> = {
  estimateOffChainTotalRewards: "ESTIMATE_REWARDS",
  estimateOffChainSponsorRewards: "ESTIMATE_REWARDS",
  estimateOffChainRecipientRewards: "ESTIMATE_REWARDS",
  estimateOffChainAgentRewards: "ESTIMATE_REWARDS",
  getInflationRate: "INFLATION",
  getAccountStakingRewards: "INITIAL_STAKING_REWARDS",
  getAgentRateKeys: "RATES",
  getAgentRateList: "RATES",
  getAgentRateRange: "RATES",
  getRecipientRateAgentKeys: "RATES",
  getRecipientRateAgentList: "RATES",
  getRecipientRateKeys: "RATES",
  getRecipientRateList: "RATES",
  getSponsorRecipientRates: "RATES",
  getSponsorRecipientRateKeys: "RATES",
  getRateTransactionSet: "RATES",
  getRecipientRateTransactionSetKey: "RATES",
  getAgentRateTransactionSetKey: "RATES",
  getAgentSponsorKeys: "RATES",
  getAgentSponsorAgentRateTransactionSetKeys: "RATES",
  isDeployed: "ACCOUNT_EXISTENCE",
  isAccountInserted: "ACCOUNT_EXISTENCE",
};

const BLOCK_READ_CACHE_TTL_MS: Record<string, number> = {
  INFLATION: 24 * 60 * 60 * 1000,
  RATES: 24 * 60 * 60 * 1000,
};

// The full method-name list this package's own callers use as keys, kept
// here as the authoritative allowlist — configureReadCacheTtlEnv() above
// takes an arbitrary Record, but getMethodEnvTtlMs/getBlockEnvTtlMs below
// only ever look up keys a real caller actually asked about, so no
// separate allowlist enforcement is needed beyond what already existed.

function parseMethodTtlMs(value: unknown): number | null | undefined {
  const raw = String(value ?? "").replace(/,/g, "").trim();
  if (!raw) return undefined;
  if (raw === "-1") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function getMethodEnvTtlMs(methodName: string): number | null | undefined {
  return parseMethodTtlMs(methodEnvOverrides[methodName]);
}

function getBlockEnvTtlMs(methodName: string): number | null | undefined {
  const blockName = METHOD_READ_CACHE_TTL_BLOCKS[methodName];
  if (!blockName) return undefined;
  return parseMethodTtlMs(blockEnvOverrides[blockName]);
}

function getBlockDefaultTtlMs(methodName: string): number | undefined {
  const blockName = METHOD_READ_CACHE_TTL_BLOCKS[methodName];
  if (!blockName) return undefined;
  return BLOCK_READ_CACHE_TTL_MS[blockName];
}

export function applyMethodCacheDefaults(methodName: string, options: SpCoinReadCacheOptions): SpCoinReadCacheOptions {
  if (
    options.ttlMs != null ||
    options.blockTag != null ||
    (options.timestampOverride != null && METHOD_READ_CACHE_TTL_BLOCKS[methodName] === "ESTIMATE_REWARDS")
  ) {
    return options;
  }
  const envTtlMs = getMethodEnvTtlMs(methodName);
  if (envTtlMs !== undefined) {
    if (envTtlMs !== null) {
      return {
        ...options,
        ttlMs: envTtlMs,
      };
    }
    const blockTtlMs = getBlockEnvTtlMs(methodName);
    if (blockTtlMs === null) return options;
    if (blockTtlMs !== undefined) {
      return {
        ...options,
        ttlMs: blockTtlMs,
      };
    }
    return options;
  }
  const blockTtlMs = getBlockEnvTtlMs(methodName);
  if (blockTtlMs === null) return options;
  if (blockTtlMs !== undefined) {
    return {
      ...options,
      ttlMs: blockTtlMs,
    };
  }
  const methodTtlMs = METHOD_READ_CACHE_TTL_MS[methodName];
  if (methodTtlMs != null) {
    return {
      ...options,
      ttlMs: methodTtlMs,
    };
  }
  const blockDefaultTtlMs = getBlockDefaultTtlMs(methodName);
  if (blockDefaultTtlMs === undefined) return options;
  return { ...options, ttlMs: blockDefaultTtlMs };
}
