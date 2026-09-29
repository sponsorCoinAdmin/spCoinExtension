export declare const defaultMissingImage = "/assets/miscellaneous/QuestionRed.png";
export declare const badTokenAddressImage = "/assets/miscellaneous/badTokenAddressImage.png";
export interface RequiredAssetMembers {
    address: string;
    chainId: number;
}
/**
 * Contract root helper for on-disk storage.
 * Example: /assets/blockchains/1/contracts/0XABC...123
 */
export declare function getContractRoot(chainId: number, address?: string): string;
/**
 * Token-specific logo helper.
 * Returns a contract logo path or the "bad token" sentinel image.
 *
 * NOTE: address is normalized for filesystem paths via
 * diskPathResolver.ts's own toDiskAddressFolderName so Linux
 * case-sensitivity matches the on-disk directory names.
 */
export declare function getTokenLogoURL(required?: RequiredAssetMembers): string;
