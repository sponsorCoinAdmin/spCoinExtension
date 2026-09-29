// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/utils/diskPathResolver.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's lib/spCoin/diskPathResolver.ts
// (on request, "do issue 2"). Pure string/path computation, zero web-app
// coupling — genuinely portable, byte-identical move except the isAddress
// import source (this package's own utils/address.ts, ported alongside).
import { isAddress } from './address';
import { toMappedChainId } from './chainIdMap';
// Was its own independent parse of resources/data/networks/chainIdMap.json
// (own normalizeMap/toPositiveInt, own DISK_CHAIN_MAP constant) — same JSON,
// same forward mapping (31337 -> 8453) as chainIdMap.ts's toMappedChainId,
// computed twice by two implementations that happened to agree only because
// there's just one mapped pair in the file today. Consolidated per
// docs/design/accountAuthDesign.md's "Stage 0" — resolveSpCoinDiskChainId
// stays as the exported name (reads clearly at disk-path call sites: "which
// chain's folder actually holds this asset"), but the lookup itself now has
// one implementation. No behavior change — see chainIdMap.ts for the actual
// mapping/normalization logic.
export function resolveSpCoinDiskChainId(chainId) {
    return toMappedChainId(Number(chainId) || 0);
}
export function normalizeDiskAddress(value) {
    const address = String(value ?? '').trim();
    if (!address || !isAddress(address))
        return undefined;
    return `0x${address.slice(2).toLowerCase()}`;
}
export function toDiskAddressFolderName(value) {
    const normalized = normalizeDiskAddress(value);
    if (!normalized)
        return '';
    return `0X${normalized.slice(2).toUpperCase()}`;
}
export function getDiskAccountsPublicRoot(address) {
    const folder = toDiskAddressFolderName(address);
    return folder ? `/assets/accounts/${folder}` : '';
}
export function getDiskBlockchainsPublicRoot(chainId) {
    const resolvedChainId = resolveSpCoinDiskChainId(chainId);
    if (!resolvedChainId)
        return '';
    return `/assets/blockchains/${resolvedChainId}`;
}
export function getDiskContractsPublicRoot(chainId, address) {
    const root = getDiskBlockchainsPublicRoot(chainId);
    const folder = toDiskAddressFolderName(address);
    if (!root || !folder)
        return '';
    return `${root}/contracts/${folder}`;
}
