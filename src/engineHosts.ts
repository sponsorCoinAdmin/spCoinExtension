// File: src/engineHosts.ts
//
// 2026-10-11 (docs/nodeSourceMigrationPlan.txt row 13, task 1): the extension's registrations with the exchange engine's trade hooks, so the shared Sponsor panel (spcoin-panels'
// SponsorPanelController) can run here exactly as it does in the web app. The web app does the same in lib/utils/registerEngineTrace.ts + lib/spCoin/swap.tsx.
//   swap functions   the engine's useSwapFunctions over the extension's TradeExecutor (tradeExecutorMerit.ts: signs with the unlocked vault behind the approval screen),
//                    the stake ABI slice and the direct-read step (no hosted app), the Uniswap quote, and the spCoin error decoder
//   approval flag    true while the extension has a sign request waiting (pendingSignRequestStore)
//   api provider     the extension has no hosted trading provider: none
//   chain clients    viem clients over the chain's RPC from the network registry (the app chain, and any chain by id)
import { useMemo, useSyncExternalStore } from 'react';
import { createPublicClient, formatUnits, http, type Abi } from 'viem';
import { createQuoteClient } from '@sponsorcoin/merit-wallet';
import type { PriceRequestParams } from '@sponsorcoin/spcoin-common/context';
import {
  decodeSpCoinErrorFromError,
  setApiProviderHook,
  setApprovalPendingHook,
  setAppPublicClientHook,
  setChainPublicClientHook,
  setQuoteService,
  setSwapFunctionsHook,
  setUniswapSwapIoHook,
  useActiveSpCoinAddress,
  useAppChainId,
  useBuyTokenContract,
  useExchangeContext,
  useSwapFunctions,
  useUniswapV3CombinedQuote,
  type SponsorQuote,
  type UseSwapFunctionsParams,
} from '@sponsorcoin/spcoin-exchange-engine';
import { rpcUrlForChain } from './chainRpc';
import { buildMeritTradeExecutorContext } from './tradeExecutorMerit';
import { executeUniswapV3Swap } from './executeUniswapV3Swap';
import { runSpCoinReadStep } from './runSpCoinReadStep';
import { SPOIN_STAKE_ABI } from './spCoinStakeAbi';
import { getPendingSignRequest, subscribePendingSignRequest } from './pendingSignRequestStore';

/** The engine only calls invalidateQueries after a confirmed trade; the extension has no query cache, its balances refresh through balancesChangedStore. */
const noQueryClient = { invalidateQueries: async () => undefined };

export function useExtensionSwapFunctions(): ReturnType<typeof useSwapFunctions> {
  const { exchangeContext } = useExchangeContext();
  const [activeSpCoinAddress] = useActiveSpCoinAddress();
  const [buyTokenContract] = useBuyTokenContract();
  const tradeData = exchangeContext?.apiCoreSyncedMembers.tradeData;
  const appChainId = Number(exchangeContext?.apiCoreSyncedMembers?.network?.appChainId ?? 0);

  const { data: sponsorQuoteData } = useUniswapV3CombinedQuote({
    enabled: true,
    chainId: appChainId,
    sellAddress: tradeData?.sellTokenContract?.address as `0x${string}` | undefined,
    buyAddress: buyTokenContract?.address as `0x${string}` | undefined,
    sellAmount: tradeData?.sellTokenContract?.amount ?? 0n,
  });
  const sponsorQuote: SponsorQuote | undefined = sponsorQuoteData ? { amountOut: sponsorQuoteData.amountOut, isMultiHop: sponsorQuoteData.isMultiHop } : undefined;

  const params: UseSwapFunctionsParams = {
    buildTradeExecutorContext: async (_display, chainId, rpcUrl) => {
      const from = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim();
      return buildMeritTradeExecutorContext({ rpcUrl, from }, { address: from, isConnected: Boolean(from), chainId });
    },
    activeSpCoinAddress,
    sponsorQuote,
    abi: SPOIN_STAKE_ABI as Abi,
    readStep: (readParams, method, args) => runSpCoinReadStep(readParams, method, args, ''),
    queryClient: noQueryClient,
    decodeSpCoinError: (error: unknown) => {
      const decoded = decodeSpCoinErrorFromError(error);
      return decoded ? { code: decoded.code, label: decoded.label } : undefined;
    },
    pushTradeExecutionLock: () => undefined,
  };
  return useSwapFunctions(params);
}

const subscribeSign = (onChange: () => void) => subscribePendingSignRequest(() => onChange());
const signRequestOpen = () => getPendingSignRequest() != null;

export function useExtensionApprovalPending(): boolean {
  return useSyncExternalStore(subscribeSign, signRequestOpen, signRequestOpen);
}

export function useExtensionAppPublicClient() {
  const [chainId] = useAppChainId();
  return useMemo(() => {
    const rpcUrl = chainId ? rpcUrlForChain(Number(chainId)) : undefined;
    return rpcUrl ? createPublicClient({ transport: http(rpcUrl) }) : undefined;
  }, [chainId]);
}

/** A client for any chain in the network registry (the engine reads contracts through it). */
export function useExtensionChainPublicClient(chainId?: number) {
  return useMemo(() => {
    const rpcUrl = chainId ? rpcUrlForChain(Number(chainId)) : undefined;
    return rpcUrl ? createPublicClient({ transport: http(rpcUrl) }) : undefined;
  }, [chainId]);
}

/** What the confirmation screen shows for the swap, from the approval-details request the shared swap flow (runUniswapSwap) hands the signer. */
function confirmCopy(request: any, minReceived: string) {
  return {
    title: String(request?.title ?? 'Swapping via Uniswap V3'),
    message: `Minimum received ${minReceived}`,
    amount: request?.amount as { label: string; value: string } | undefined,
    tokens: ((request?.tokens ?? []) as any[]).map((tk) => ({ label: tk.label, symbol: tk.token?.symbol, name: tk.token?.name, address: tk.token?.address, logoURL: tk.token?.logoURL })),
  };
}

/** The Uniswap row's swap I/O: the signer is the request itself (the vault signs locally behind the confirmation screen, see tradeExecutorMerit.ts); the executors are the extension's. */
function useExtensionUniswapSwapIo() {
  return {
    getSigner: async (request: unknown) => request,
    executeSingle: async (params: any) => {
      const request = params.signer as any;
      const buy = (request?.tokens ?? []).find((tk: any) => String(tk.label).startsWith('Receive'))?.token;
      const minReceived = `${formatUnits(params.amountOutMinimum, buy?.decimals ?? 18)} ${buy?.symbol ?? ''}`.trim();
      const result = await executeUniswapV3Swap({
        baseUrl: '',
        rpcUrl: params.rpcUrl,
        chainId: params.chainId,
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        amountOutMinimum: params.amountOutMinimum,
        recipient: params.recipient,
        fee: params.fee,
        fromAddress: String(request?.activeAccountAddress ?? params.recipient),
        confirm: confirmCopy(request, minReceived),
      });
      return { transactionHash: result.transactionHash, receipt: result.receipt, approvalSubmitted: !!(result as any).approvalSubmitted };
    },
    executeMultiHop: async () => {
      throw new Error('Multi-hop swaps are not available in the extension yet.');
    },
    invalidateBalanceQueries: () => undefined,
  };
}

const QUOTE_URL_KEY = 'swapQuoteBaseUrl';

/** The 0x price, from the hosted quote service the owner configured (storage key swapQuoteBaseUrl). With none configured there is no 0x price (undefined: the engine shows none and no error); the on-chain Uniswap price still runs. */
async function hostedZeroXPrice(params: PriceRequestParams): Promise<unknown> {
  const stored = (await chrome.storage.local.get(QUOTE_URL_KEY))[QUOTE_URL_KEY];
  const baseUrl = typeof stored === 'string' ? stored.trim() : '';
  if (!baseUrl) return undefined;
  const p = params as unknown as Record<string, string | number | undefined>;
  return createQuoteClient({ baseUrl }).getPrice({
    chainId: Number(p.chainId),
    sellToken: String(p.sellToken),
    buyToken: String(p.buyToken),
    sellAmount: p.sellAmount === undefined ? undefined : String(p.sellAmount),
    buyAmount: p.buyAmount === undefined ? undefined : String(p.buyAmount),
    slippageBps: typeof p.slippageBps === 'number' ? p.slippageBps : undefined,
  });
}

let registered = false;
/** Called once at boot (sidepanel.ts), before the first render. */
export function registerExtensionEngineHosts(): void {
  if (registered) return;
  registered = true;
  setSwapFunctionsHook(useExtensionSwapFunctions);
  setUniswapSwapIoHook(useExtensionUniswapSwapIo as never);
  setApprovalPendingHook(useExtensionApprovalPending);
  setApiProviderHook(() => undefined);
  setAppPublicClientHook(useExtensionAppPublicClient as never);
  setChainPublicClientHook(useExtensionChainPublicClient as never);
  setQuoteService({ getPrice: hostedZeroXPrice, serverLabel: 'the hosted quote service' });
}
