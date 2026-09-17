"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokenLogoURL = getTokenLogoURL;
exports.fetchTokenList = fetchTokenList;
exports.fetchTokenByAddress = fetchTokenByAddress;
exports.fetchTokensBatch = fetchTokensBatch;
exports.toAssetListEntries = toAssetListEntries;
const fetchJson_1 = require("../shared/fetchJson");
const memoCache_1 = require("../shared/memoCache");
const TOKEN_LIST_CACHE_TTL_MS = 60000;
const TOKEN_CACHE_TTL_MS = 5 * 60000;
const MERIT_WALLET_HARDHAT_CHAIN_ID = 31337;
const HARDHAT_DISK_ASSET_CHAIN_ID = 8453;
/**
 * Mirrors resources/data/networks/chainIdMap.json's real, real-only mapping
 * ({"assetMap":{"31337":8453}}) — same duplicated-not-cross-imported
 * pattern as networks/networksFeed.ts's own resolveDiskAssetChainId (see
 * that file's doc comment for the full reasoning): Hardhat (31337) is a
 * fork of Base, so its on-disk token-contract assets always resolve
 * through Base's own folder, never a 31337/ one directly.
 */
function resolveDiskAssetChainId(chainId) {
    return chainId === MERIT_WALLET_HARDHAT_CHAIN_ID ? HARDHAT_DISK_ASSET_CHAIN_ID : chainId;
}
function toDiskAddressFolderName(address) {
    const hex = address.trim().replace(/^0x/i, '');
    return `0X${hex.toUpperCase()}`;
}
/**
 * Computed the exact same way the real web app's own client-side
 * TokenLogo.tsx/getTokenLogoURL resolves a token's icon — a real, on-disk
 * path convention (/assets/blockchains/{mappedChainId}/contracts/
 * {0X<ADDRESS>}/logo.png), independent of whether /api/spCoin/tokens has a
 * hydrated record for this address at all.
 *
 * 2026-09-16, on live report ("not all images are displayed" in the token
 * list) — root cause: TokenRecord.logoURL (used by toAssetListEntries
 * above) only comes back for addresses the backend's own token DB happens
 * to have metadata for. WETH's real mainnet address had no such record
 * even though its real logo.png genuinely exists on disk at this exact
 * computed path — ETH/SPCOIN_V0 (which DO have DB records with a
 * logoURL) got their icons, WETH silently didn't. The real app's own
 * TokenLogo.tsx never depends on a DB record for the icon specifically —
 * it computes this same path directly from address+chainId. This function
 * lets a consumer do the same instead of only trying record.logoURL.
 */
function getTokenLogoURL(chainId, address) {
    const mapped = resolveDiskAssetChainId(chainId);
    return `/assets/blockchains/${mapped}/contracts/${toDiskAddressFolderName(address)}/logo.png`;
}
const tokenListCache = new memoCache_1.MemoCache(TOKEN_LIST_CACHE_TTL_MS);
const tokenCache = new memoCache_1.MemoCache(TOKEN_CACHE_TTL_MS);
function flattenTokenRow(row) {
    const { data } = row;
    return {
        chainId: row.chainId,
        address: row.address,
        name: typeof data.name === 'string' ? data.name : undefined,
        symbol: typeof data.symbol === 'string' ? data.symbol : undefined,
        decimals: typeof data.decimals === 'number' ? data.decimals : undefined,
        website: typeof data.website === 'string' ? data.website : undefined,
        description: typeof data.description === 'string' ? data.description : undefined,
        explorer: typeof data.explorer === 'string' ? data.explorer : undefined,
        links: Array.isArray(data.links) ? data.links : undefined,
        logoURL: typeof data.logoURL === 'string' ? data.logoURL : undefined,
    };
}
/**
 * GET /api/spCoin/tokens?chainId=&allData=true&page=&pageSize= (or
 * allNetworks=true instead of chainId) — always requests allData=true so
 * every returned row is a real hydrated TokenRecord, not just an address.
 */
async function fetchTokenList(chainId, options, config) {
    var _a;
    const params = new URLSearchParams();
    if (options === null || options === void 0 ? void 0 : options.allNetworks) {
        params.set('allNetworks', 'true');
    }
    else if (chainId !== undefined) {
        params.set('chainId', String(chainId));
    }
    else {
        throw new Error('fetchTokenList requires a chainId unless options.allNetworks is true');
    }
    params.set('allData', 'true');
    if (options === null || options === void 0 ? void 0 : options.page)
        params.set('page', String(options.page));
    if (options === null || options === void 0 ? void 0 : options.pageSize)
        params.set('pageSize', String(options.pageSize));
    const cacheKey = `${(_a = config === null || config === void 0 ? void 0 : config.baseUrl) !== null && _a !== void 0 ? _a : ''}:${params.toString()}`;
    return (0, memoCache_1.withMemoCache)(tokenListCache, cacheKey, async () => {
        const raw = await (0, fetchJson_1.fetchJson)(`/api/spCoin/tokens?${params.toString()}`, config);
        return {
            items: raw.items.map(flattenTokenRow),
            page: raw.page,
            pageSize: raw.pageSize,
            totalItems: raw.totalItems,
            totalPages: raw.totalPages,
            hasNextPage: raw.hasNextPage,
        };
    });
}
/**
 * GET /api/spCoin/tokens?chainId=&address= — resolves to null on a 404
 * (token not registered for this chain), matching fetchAccountMetadata's
 * same not-found convention.
 */
async function fetchTokenByAddress(chainId, address, config) {
    var _a;
    const cacheKey = `${(_a = config === null || config === void 0 ? void 0 : config.baseUrl) !== null && _a !== void 0 ? _a : ''}:${chainId}:${address.toLowerCase()}`;
    return (0, memoCache_1.withMemoCache)(tokenCache, cacheKey, async () => {
        const params = new URLSearchParams({ chainId: String(chainId), address });
        const raw = await (0, fetchJson_1.fetchJsonOrNull)(`/api/spCoin/tokens?${params.toString()}`, config);
        return raw ? flattenTokenRow(raw) : null;
    });
}
/** POST /api/spCoin/tokens with { requests: [{chainId,address}] } */
async function fetchTokensBatch(requests, config) {
    const raw = await (0, fetchJson_1.fetchJson)('/api/spCoin/tokens', config, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
    });
    return {
        items: raw.items.map(flattenTokenRow),
        countRequested: raw.countRequested,
        countFound: raw.countFound,
        missing: raw.missing,
    };
}
/**
 * Plain mapper → AssetListTable's row shape. No write function exists in
 * this domain to wrap — no endpoint for "add/remove a token" was found
 * during research; this is an explicit gap, not an oversight.
 */
function toAssetListEntries(records) {
    return records.map((record) => ({
        id: record.address,
        symbol: record.symbol,
        name: record.name,
        address: record.address,
        logoURL: record.logoURL,
    }));
}
