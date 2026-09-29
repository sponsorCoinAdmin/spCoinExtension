/** Address of the native-token sentinel used throughout this app — Uniswap
 *  V3 pools only pair real ERC-20s, so the quote/execute sides substitute
 *  the wrapped-native address (below) for this sentinel before any
 *  pool-lookup or router-call. */
export declare const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
/**
 * Check if the provided address is a native token address for the given chain.
 */
export declare function isNativeToken(address?: string, chainId?: number): boolean;
export interface UniswapV3ChainAddresses {
    factory: string;
    positionManager: string;
    swapRouter02: string;
    quoterV2: string;
}
export declare const UNISWAP_V3_FEE_TIERS: {
    readonly LOWEST: 100;
    readonly LOW: 500;
    readonly MEDIUM: 3000;
    readonly HIGH: 10000;
};
export declare function isUniswapV3VerifiedChainId(chainId: number): boolean;
export declare function getUniswapV3Addresses(chainId: number): UniswapV3ChainAddresses | undefined;
export declare function getWrappedNativeAddress(chainId: number): string | undefined;
/**
 * Substitutes the chain's wrapped-native address for the native-ETH
 * sentinel — shared by both getUniswapV3Quote.ts (pool lookups) and
 * executeUniswapV3Swap.ts (the actual swap call), so they can never drift
 * apart on this. Non-native addresses pass through unchanged.
 */
export declare function toPoolTokenAddress(address: string, chainId: number): string;
