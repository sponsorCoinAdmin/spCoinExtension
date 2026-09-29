// File: node_source/spCoinExchangeEngine/packages/@sponsorcoin/spcoin-exchange-engine/src/utils/tokenAssetHelpers.ts
// 2026-09-25, migrated from spcoin-nextjs-front-end's
// lib/context/helpers/assetHelpers.ts (on request, "do issue 2" —
// TokenLogo's dependency chain). NOT a full port of that 416-line file —
// only the pure, dependency-free slice TokenLogo.tsx actually needs
// (defaultMissingImage, badTokenAddressImage, getContractRoot,
// getTokenLogoURL). The rest of that file (HTTP existence-probing,
// IndexedDB/localStorage caching, account-logo/info-URL helpers) is real,
// substantial web-app-only infrastructure, out of scope here. Byte-identical
// for the pieces that did move.
import { getDiskContractsPublicRoot } from './diskPathResolver';
// Transparent-background red question mark (not QuestionBlackOnRed.png's
// opaque white-square version) — so this "no logo found" fallback sits on
// an icon badge/pill the same way every real logo.png does, instead of
// showing its own visible square behind it.
export const defaultMissingImage = '/assets/miscellaneous/QuestionRed.png';
export const badTokenAddressImage = '/assets/miscellaneous/badTokenAddressImage.png';
/**
 * Contract root helper for on-disk storage.
 * Example: /assets/blockchains/1/contracts/0XABC...123
 */
export function getContractRoot(chainId, address) {
    return getDiskContractsPublicRoot(chainId, address);
}
/**
 * Token-specific logo helper.
 * Returns a contract logo path or the "bad token" sentinel image.
 *
 * NOTE: address is normalized for filesystem paths via
 * diskPathResolver.ts's own toDiskAddressFolderName so Linux
 * case-sensitivity matches the on-disk directory names.
 */
export function getTokenLogoURL(required) {
    if (!required)
        return badTokenAddressImage;
    const { chainId, address } = required;
    const root = getContractRoot(chainId, address);
    if (!root)
        return badTokenAddressImage;
    return `${root}/logo.png`;
}
