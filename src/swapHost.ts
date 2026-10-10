// File: src/swapHost.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 22) -- the extension's half of the Swap tab: what the package's SwapTradeButton needs from
// its host. A price comes from Uniswap read directly on-chain (viem on the registry RPC) and, where the owner has set the hosted quote service's URL
// (storage key swapQuoteBaseUrl, see services/swapQuote in the web repo), from 0x through it; quoteSwap in the package chooses between them. A swap
// runs through the same TradeExecutor as stake / approve (tradeExecutorMerit.ts: the vault signs locally behind the confirmation screen).
import { createPublicClient, formatUnits, http } from 'viem';
import { createQuoteClient, quoteSwap, type SwapExecuteRequest, type SwapPrice, type SwapPriceRequest, type SwapTradeButtonHost } from '@sponsorcoin/merit-wallet';
import { getUniswapV3Addresses, getUniswapV3Quote } from '@sponsorcoin/spcoin-onchain';
import { rpcUrlForChain } from './chainRpc';
import { executeUniswapV3Swap } from './executeUniswapV3Swap';
import { executeErc20Approve } from './executeErc20Approve';
import { buildMeritTradeExecutorContext } from './tradeExecutorMerit';

const QUOTE_URL_KEY = 'swapQuoteBaseUrl';
/** Chains the 0x quote service serves (it has no market on the local Hardhat fork). */
const ZERO_X_CHAINS = [1, 8453, 137, 11155111];

async function quoteBaseUrl(): Promise<string> {
  const stored = (await chrome.storage.local.get(QUOTE_URL_KEY))[QUOTE_URL_KEY];
  return typeof stored === 'string' ? stored.trim() : '';
}

async function priceFor(request: SwapPriceRequest): Promise<SwapPrice> {
  const baseUrl = await quoteBaseUrl();
  const quotes = baseUrl ? createQuoteClient({ baseUrl }) : undefined;
  return quoteSwap(request, {
    uniswapSupported: (chainId) => !!getUniswapV3Addresses(chainId),
    uniswapQuote: async (r) => {
      const rpcUrl = rpcUrlForChain(r.chainId);
      if (!rpcUrl) throw new Error(`No network is configured for chain ${r.chainId}.`);
      const publicClient = createPublicClient({ transport: http(rpcUrl) });
      return (
        await getUniswapV3Quote({ publicClient, chainId: r.chainId, tokenIn: r.sellToken as `0x${string}`, tokenOut: r.buyToken as `0x${string}`, amountIn: r.sellAmount })
      ).amountOut;
    },
    zeroXPrice: quotes ? async (r) => BigInt(String((await quotes.getPrice({ chainId: r.chainId, sellToken: r.sellToken, buyToken: r.buyToken, sellAmount: r.sellAmount.toString() })).buyAmount ?? '0')) : undefined,
    zeroXChains: ZERO_X_CHAINS,
  });
}

/** Display copy for the confirmation screen, from the approval-details request the shared swap flow (runUniswapSwap) hands the signer. */
function confirmCopy(request: any, minReceived: string, slippageBps: number) {
  return {
    title: String(request?.title ?? 'Swapping via Uniswap V3'),
    message: `Minimum received ${minReceived} (slippage ${(slippageBps / 100).toFixed(2)}%)`,
    amount: request?.amount as { label: string; value: string } | undefined,
    tokens: ((request?.tokens ?? []) as any[]).map((t) => ({ label: t.label, symbol: t.token?.symbol, name: t.token?.name, address: t.token?.address, logoURL: t.token?.logoURL })),
  };
}

export function createSwapHost(deps: { baseUrl: string; getAccount: () => string | undefined; onResult: SwapTradeButtonHost['onResult']; onSettled?: () => void }): SwapTradeButtonHost {
  return {
    // The Uniswap-priced swap runs the shared flow (runUniswapSwap, as in the web app); this is only the extension's signer-backed executor.
    uniswap: {
      rpcUrl: (chainId) => rpcUrlForChain(chainId) ?? '',
      onSettled: deps.onSettled,
      async executeSingle(params) {
        const from = deps.getAccount() ?? params.recipient;
        const request = params.signer as any;
        const buy = (request?.tokens ?? []).find((t: any) => String(t.label).startsWith('Receive'))?.token;
        const minReceived = `${formatUnits(params.amountOutMinimum, buy?.decimals ?? 18)} ${buy?.symbol ?? ''}`.trim();
        const result = await executeUniswapV3Swap({
          baseUrl: deps.baseUrl,
          rpcUrl: params.rpcUrl,
          chainId: params.chainId,
          tokenIn: params.tokenIn,
          tokenOut: params.tokenOut,
          amountIn: params.amountIn,
          amountOutMinimum: params.amountOutMinimum,
          recipient: params.recipient,
          fee: params.fee,
          fromAddress: from,
          confirm: confirmCopy(request, minReceived, 50),
        });
        return { transactionHash: result.transactionHash, receipt: result.receipt, approvalSubmitted: !!(result as any).approvalSubmitted };
      },
    },
    getPrice: priceFor,
    hasAccount: () => !!deps.getAccount(),
    onResult: deps.onResult,
    async execute(request: SwapExecuteRequest) {
      const from = deps.getAccount();
      if (!from) throw new Error('Select an account first.');
      const rpcUrl = rpcUrlForChain(request.chainId);
      if (!rpcUrl) throw new Error(`No network is configured for chain ${request.chainId}.`);

      if (request.price.source === 'uniswap') {
        const result = await executeUniswapV3Swap({
          baseUrl: deps.baseUrl,
          rpcUrl,
          chainId: request.chainId,
          tokenIn: request.sellToken,
          tokenOut: request.buyToken,
          amountIn: request.sellAmount,
          amountOutMinimum: request.minimumBuyAmount,
          recipient: from,
          fromAddress: from,
        });
        return { hash: result.transactionHash };
      }

      // 0x: a firm quote carries the transaction and the spender that needs the allowance.
      const baseUrl = await quoteBaseUrl();
      if (!baseUrl) throw new Error('The quote service is not set up.');
      const quote = (await createQuoteClient({ baseUrl }).getQuote({
        chainId: request.chainId,
        sellToken: request.sellToken,
        buyToken: request.buyToken,
        sellAmount: request.sellAmount.toString(),
        taker: from,
        slippageBps: request.slippageBps,
      })) as { transaction?: { to: string; data: string; value?: string }; issues?: { allowance?: { spender?: string } | null } };
      if (!quote.transaction) throw new Error('The quote service returned no transaction.');
      const spender = quote.issues?.allowance?.spender;
      if (spender) {
        await executeErc20Approve({ baseUrl: deps.baseUrl, rpcUrl, chainId: request.chainId, tokenAddress: request.sellToken, spenderAddress: spender, amountRaw: request.sellAmount, fromAddress: from });
      }
      const context = buildMeritTradeExecutorContext({ baseUrl: deps.baseUrl, rpcUrl }, { address: from, isConnected: true, chainId: request.chainId });
      const sent = await context.executor.execute({
        to: quote.transaction.to,
        data: quote.transaction.data,
        value: quote.transaction.value ? BigInt(quote.transaction.value) : undefined,
        chainId: request.chainId,
        rpcUrl,
        display: { title: 'Swap', label: 'Swap via 0x' } as never,
      });
      return { hash: sent.transactionHash };
    },
  };
}
