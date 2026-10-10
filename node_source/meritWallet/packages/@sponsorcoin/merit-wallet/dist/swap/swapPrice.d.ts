export interface SwapPriceRequest {
    chainId: number;
    sellToken: string;
    buyToken: string;
    /** Base units of the sell token. */
    sellAmount: bigint;
}
export type SwapPriceSource = 'uniswap' | '0x';
export interface SwapPrice {
    source: SwapPriceSource;
    /** Base units of the buy token the swap is expected to return. */
    buyAmount: bigint;
}
export interface SwapPriceDeps {
    /** Does the host have a Uniswap quote for this chain (verified addresses)? */
    uniswapSupported(chainId: number): boolean;
    /** Uniswap V3 quote: expected amount out. */
    uniswapQuote(request: SwapPriceRequest): Promise<bigint>;
    /** 0x price through the hosted quote service; omit when the host has no quote service. */
    zeroXPrice?(request: SwapPriceRequest): Promise<bigint>;
    /** Chains 0x serves (it has no market on a local fork). */
    zeroXChains?: readonly number[];
}
export declare class NoSwapPriceError extends Error {
    constructor(message: string);
}
/** The price for a swap, from 0x when the host has it for this chain, otherwise (or when it fails) from Uniswap. */
export declare function quoteSwap(request: SwapPriceRequest, deps: SwapPriceDeps): Promise<SwapPrice>;
/** The smallest amount out the user accepts: price minus slippage (in basis points), rounded down. */
export declare function minimumAmountOut(buyAmount: bigint, slippageBps: number): bigint;
