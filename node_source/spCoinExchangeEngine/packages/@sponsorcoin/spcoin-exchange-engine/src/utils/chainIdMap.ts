// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/utils/chainIdMap.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's lib/utils/network/chainIdMap.ts
// (on request, "do issue 2" — TokenLogo's dependency chain). Pure data
// transformation, zero web-app coupling — genuinely portable. The one
// change from the original: the source data (resources/data/networks/
// chainIdMap.json, a 2-entry mapping table) is inlined as a plain TS
// object instead of a JSON import — tsc doesn't copy non-TS assets into
// dist/ by default, and inlining a file this small avoids that whole
// build-step question rather than solving it. Keep both copies in sync by
// hand if the real mapping ever grows past this one pair (31337 -> 8453).
interface ChainIdMapFile {
  assetMap?: Record<string, number | string>;
  reverseMap?: Record<string, number | string>;
}

const chainIdMapRaw: ChainIdMapFile = {
  assetMap: {
    '31337': 8453,
  },
  reverseMap: {
    '8453': 31337,
  },
};

function toPositiveInt(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function normalizeMap(
  input: Record<string, number | string> | undefined,
): Record<number, number> {
  const out: Record<number, number> = {};
  if (!input || typeof input !== 'object') return out;
  for (const [k, v] of Object.entries(input)) {
    const key = toPositiveInt(k);
    const val = toPositiveInt(v);
    if (!key || !val) continue;
    out[key] = val;
  }
  return out;
}

const ASSET_MAP = normalizeMap(chainIdMapRaw.assetMap);
const REVERSE_MAP_EXPLICIT = normalizeMap(chainIdMapRaw.reverseMap);

const REVERSE_MAP_DERIVED: Record<number, number> = Object.entries(ASSET_MAP).reduce(
  (acc, [fromRaw, toRaw]) => {
    const from = toPositiveInt(fromRaw);
    const to = toPositiveInt(toRaw);
    if (!from || !to) return acc;
    if (!acc[to]) acc[to] = from;
    return acc;
  },
  {} as Record<number, number>,
);

const REVERSE_MAP: Record<number, number> = {
  ...REVERSE_MAP_DERIVED,
  ...REVERSE_MAP_EXPLICIT,
};

export function toMappedChainId(chainId: number): number {
  const id = toPositiveInt(chainId);
  if (!id) return Number(chainId) || 0;
  return ASSET_MAP[id] ?? id;
}

export function toOriginalChainId(chainId: number): number {
  const id = toPositiveInt(chainId);
  if (!id) return Number(chainId) || 0;
  return REVERSE_MAP[id] ?? id;
}

export function isMappedChainId(chainId: number): boolean {
  const id = toPositiveInt(chainId);
  if (!id) return false;
  return toMappedChainId(id) !== id;
}

export function getChainIdAssetMap(): Record<number, number> {
  return { ...ASSET_MAP };
}
