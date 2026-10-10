// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/swap/swapPrice.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 22) -- where a swap price comes from, decided in one place for every host. Two sources,
// as in the web app: Uniswap V3 read directly on-chain (works on any chain whose Uniswap addresses are verified, including the local test fork
// where 0x has no market), and 0x through the hosted quote service (which holds the 0x key). 0x is preferred where the host has it, because it
// aggregates more liquidity; if 0x fails or is not configured for the chain, Uniswap answers when it can. Pure TypeScript: the host supplies the
// two quote functions, so this file imports nothing and is tested with stubs.

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

export class NoSwapPriceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoSwapPriceError';
  }
}

/** The price for a swap, from 0x when the host has it for this chain, otherwise (or when it fails) from Uniswap. */
export async function quoteSwap(request: SwapPriceRequest, deps: SwapPriceDeps): Promise<SwapPrice> {
  if (request.sellAmount <= 0n) throw new NoSwapPriceError('Enter an amount greater than zero.');
  if (request.sellToken.toLowerCase() === request.buyToken.toLowerCase()) throw new NoSwapPriceError('Pick two different tokens.');
  const useZeroX = !!deps.zeroXPrice && (deps.zeroXChains ?? []).includes(request.chainId);
  let zeroXError: unknown;
  if (useZeroX) {
    try {
      return { source: '0x', buyAmount: await (deps.zeroXPrice as NonNullable<SwapPriceDeps['zeroXPrice']>)(request) };
    } catch (error) {
      zeroXError = error;
    }
  }
  if (deps.uniswapSupported(request.chainId)) {
    try {
      return { source: 'uniswap', buyAmount: await deps.uniswapQuote(request) };
    } catch (error) {
      throw new NoSwapPriceError(error instanceof Error ? `No price: ${error.message}` : 'No price is available for this pair.');
    }
  }
  if (zeroXError) throw new NoSwapPriceError(zeroXError instanceof Error ? `No price: ${zeroXError.message}` : 'No price is available for this pair.');
  throw new NoSwapPriceError('Swaps are not available on this network.');
}

/** The smallest amount out the user accepts: price minus slippage (in basis points), rounded down. */
export function minimumAmountOut(buyAmount: bigint, slippageBps: number): bigint {
  const bps = BigInt(Math.max(0, Math.min(10_000, Math.round(slippageBps))));
  return (buyAmount * (10_000n - bps)) / 10_000n;
}
