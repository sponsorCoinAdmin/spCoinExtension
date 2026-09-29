const chainIdMapRaw = {
    assetMap: {
        '31337': 8453,
    },
    reverseMap: {
        '8453': 31337,
    },
};
function toPositiveInt(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : undefined;
}
function normalizeMap(input) {
    const out = {};
    if (!input || typeof input !== 'object')
        return out;
    for (const [k, v] of Object.entries(input)) {
        const key = toPositiveInt(k);
        const val = toPositiveInt(v);
        if (!key || !val)
            continue;
        out[key] = val;
    }
    return out;
}
const ASSET_MAP = normalizeMap(chainIdMapRaw.assetMap);
const REVERSE_MAP_EXPLICIT = normalizeMap(chainIdMapRaw.reverseMap);
const REVERSE_MAP_DERIVED = Object.entries(ASSET_MAP).reduce((acc, [fromRaw, toRaw]) => {
    const from = toPositiveInt(fromRaw);
    const to = toPositiveInt(toRaw);
    if (!from || !to)
        return acc;
    if (!acc[to])
        acc[to] = from;
    return acc;
}, {});
const REVERSE_MAP = {
    ...REVERSE_MAP_DERIVED,
    ...REVERSE_MAP_EXPLICIT,
};
export function toMappedChainId(chainId) {
    const id = toPositiveInt(chainId);
    if (!id)
        return Number(chainId) || 0;
    return ASSET_MAP[id] ?? id;
}
export function toOriginalChainId(chainId) {
    const id = toPositiveInt(chainId);
    if (!id)
        return Number(chainId) || 0;
    return REVERSE_MAP[id] ?? id;
}
export function isMappedChainId(chainId) {
    const id = toPositiveInt(chainId);
    if (!id)
        return false;
    return toMappedChainId(id) !== id;
}
export function getChainIdAssetMap() {
    return { ...ASSET_MAP };
}
