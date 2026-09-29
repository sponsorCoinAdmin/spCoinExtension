import type { ProviderScopeInfo, SpCoinReadCacheOptions } from "./types";

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

