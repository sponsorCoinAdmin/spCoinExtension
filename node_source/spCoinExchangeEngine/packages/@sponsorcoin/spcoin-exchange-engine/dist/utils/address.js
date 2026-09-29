// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/utils/address.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's lib/utils/address.ts
// (on request, "do issue 2" — diskPathResolver.ts's own dependency).
// Byte-identical move — real viem import, now resolves cleanly since this
// package's module-config fix (TODO 1, same session).
import { isAddress as viemIsAddress } from 'viem';
export function normalizeAddress(input) {
    const trimmed = String(input ?? '').trim();
    if (!/^0x/i.test(trimmed))
        return trimmed;
    return `0x${trimmed.slice(2).toLowerCase()}`;
}
export function isAddress(input) {
    return viemIsAddress(normalizeAddress(input));
}
export function toNormalizedAddress(input) {
    return normalizeAddress(input);
}
