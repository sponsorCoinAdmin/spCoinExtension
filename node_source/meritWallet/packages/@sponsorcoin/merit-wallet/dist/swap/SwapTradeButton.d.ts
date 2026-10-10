import React from 'react';
import type { UniswapSwapExecution, UniswapSwapSingleParams } from '@sponsorcoin/spcoin-exchange-engine';
import type { SwapPrice, SwapPriceRequest } from './swapPrice';
export interface SwapExecuteRequest extends SwapPriceRequest {
    price: SwapPrice;
    /** The smallest buy amount the user accepts. */
    minimumBuyAmount: bigint;
    slippageBps: number;
}
export interface SwapTradeButtonHost {
    /** Price for the request; throws (a readable message) when there is none. */
    getPrice(request: SwapPriceRequest): Promise<SwapPrice>;
    /** Run the swap (approval if needed, then the swap); throws a readable message on failure or rejection. */
    execute(request: SwapExecuteRequest): Promise<{
        hash?: string;
    } | void>;
    /** Is an account ready to sign? */
    hasAccount(): boolean;
    /** Slippage in basis points (default 50 = 0.5%). */
    slippageBps?: number;
    /** Called with the outcome so the host can say it (the extension alerts). */
    /**
     * The Uniswap adapter. A host that supplies it runs Uniswap-priced swaps through the shared flow (the web app's Uniswap section runs the same one):
     * the host only provides the RPC for the chain, the signer-backed single-hop executor (its params.signer is the approval-details request) and a
     * callback to refresh balances after a swap.
     */
    uniswap?: {
        rpcUrl(chainId: number): string;
        executeSingle(params: UniswapSwapSingleParams): Promise<UniswapSwapExecution>;
        onSettled?(): void;
    };
    onResult?(result: {
        ok: true;
        hash?: string;
    } | {
        ok: false;
        message: string;
    }): void;
}
export default function SwapTradeButton({ host }: {
    host: SwapTradeButtonHost;
}): React.JSX.Element;
