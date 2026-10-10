import { type SwapPrice } from './swapPrice';
import type { SwapTradeButtonHost } from './SwapTradeButton';
export interface SwapQuoteState {
    chainId: number;
    sellAddress: string;
    buyAddress: string;
    sellAmount: bigint;
    buyDecimals: number;
    /** Tokens chosen and an amount typed. */
    ready: boolean;
    price?: SwapPrice;
    error: string;
    loading: boolean;
    swapping: boolean;
    hasAccount: boolean;
    swap: () => void;
}
export declare function useSwapQuote(host: SwapTradeButtonHost, options: {
    writeBuyAmount: boolean;
}): SwapQuoteState;
