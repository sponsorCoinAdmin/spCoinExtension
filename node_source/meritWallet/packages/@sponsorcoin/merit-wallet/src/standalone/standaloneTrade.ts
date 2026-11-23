// File: src/standalone/standaloneTrade.ts
//
// 2026-11-19 (docs/design/standAloneWalletInstall.txt) -- the stand-alone wallet's TRADE host: what the shared Swap tab (and later the Sponsor tab) asks of its host, registered once with the engine. It is the extension's engineHosts.ts + tradeExecutorMerit.ts +
// executeUniswapV3Swap.ts with the vault authenticator in place of the extension's worker: a swap's approve and swap transactions go to the vault's approval queue (the approval page asks first), then the vault signs and broadcasts, and this waits for the block.
// Without it the Swap button reports "This app has not registered a signer for Uniswap swaps."
import { createPublicClient, formatUnits, http, type Abi } from 'viem';
import {
  decodeSpCoinErrorFromError,
  executeMultiHopUniswapV3Swap as executeMultiHopPortable,
  executeUniswapV3Swap as executeSwapPortable,
  setApiProviderHook,
  setQuoteService,
  setSwapFunctionsHook,
  setUniswapSwapIoHook,
  useActiveSpCoinAddress,
  useBuyTokenContract,
  useExchangeContext,
  useSwapFunctions,
  useUniswapV3CombinedQuote,
  type SponsorQuote,
  type TradeExecutionResult,
  type TradeExecutor,
  type TradeExecutorContext,
  type UseSwapFunctionsParams,
} from '@sponsorcoin/spcoin-exchange-engine';
import { useConnectMode } from '@sponsorcoin/spcoin-panels';
import { createDirectReadStep } from '../chain/directReads';
import { SPOIN_STAKE_ABI } from '../chain/spCoinStakeAbi';
import type { Authenticator } from '../auth/authenticator';
import { authenticatorDisplayOf } from '../approval/authenticatorDisplay';
import { swapConfirmCopy, withSwapApprovalDisplay } from '../approval/swapApprovalDisplay';
import type { StandaloneChain } from './createStandaloneWallet';

/** The engine only calls invalidateQueries after a confirmed trade; the stand-alone wallet has no query cache (balances re-read on their own). */
const noQueryClient = { invalidateQueries: async () => undefined };

type Receipt = NonNullable<TradeExecutionResult['receipt']>;

/** Wait for the transaction to be mined and return the receipt in the shape the swap flow reads; null when it is not mined in time. */
export async function waitForTradeReceipt(rpcUrl: string, hash: string, timeoutMs = 60_000): Promise<Receipt | null> {
  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    const r = await client.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: timeoutMs });
    return { blockNumber: Number(r.blockNumber), gasUsed: r.gasUsed, gasPrice: r.effectiveGasPrice, status: r.status === 'success' ? 1 : 0, to: r.to ?? null, from: r.from, contractAddress: r.contractAddress ?? null } as unknown as Receipt;
  } catch {
    return null;
  }
}

/** A TradeExecutor over the vault authenticator: execute() queues the transaction for approval and sends it; call() is a plain eth_call (allowances and the like). */
export function createStandaloneTradeExecutor(authenticator: Authenticator, from: string, defaultRpcUrl: string): TradeExecutor {
  return {
    async execute({ to, data, value, chainId, rpcUrl, display }): Promise<TradeExecutionResult> {
      const { hash } = await authenticator.sendTransaction({
        from,
        to,
        data,
        value: value !== undefined ? BigInt(value) : undefined,
        chainId,
        display: authenticatorDisplayOf(display as never),
      });
      const receipt = await waitForTradeReceipt(rpcUrl || defaultRpcUrl, hash);
      return { transactionHash: hash, receipt } as TradeExecutionResult;
    },
    async call({ to, data, rpcUrl }): Promise<string> {
      const client = createPublicClient({ transport: http(rpcUrl || defaultRpcUrl) });
      const result = await client.call({ to: to as `0x${string}`, data: data as `0x${string}` });
      return result.data ?? '0x';
    },
  };
}

let registeredFor: unknown;

/** Register the swap hooks with the engine, once. `rpcOf` answers a chain's endpoint (the page's chains first, then the bundled network settings). */
export function registerStandaloneTradeHosts(authenticator: Authenticator, chains: readonly StandaloneChain[], rpcOf: (chainId: number) => string | undefined): void {
  if (registeredFor === authenticator) return;
  registeredFor = authenticator;
  void chains;

  const directReads = createDirectReadStep(SPOIN_STAKE_ABI);
  const readStep: UseSwapFunctionsParams['readStep'] = async (params: { contractAddress: string; rpcUrl?: string }, method: string, args: { key: string; value: string }[] = []) => {
    if (directReads.handles(method) && params.rpcUrl) return directReads.read({ contractAddress: params.contractAddress, rpcUrl: params.rpcUrl }, method, args);
    throw new Error(`The wallet cannot read ${method} on its own.`);
  };

  function useStandaloneSwapFunctions(): ReturnType<typeof useSwapFunctions> {
    const { exchangeContext } = useExchangeContext();
    const { activeAddress: hostActiveAddress } = useConnectMode(); // 2026-11-21: the wallet's own active account, for when the exchange context has not caught up
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
        const from = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim() || hostActiveAddress;
        return { account: { address: from, isConnected: Boolean(from), chainId }, executor: createStandaloneTradeExecutor(authenticator, from, rpcUrl || rpcOf(chainId) || '') };
      },
      activeSpCoinAddress,
      fallbackActiveAccountAddress: hostActiveAddress,
      sponsorQuote,
      abi: SPOIN_STAKE_ABI as Abi,
      readStep,
      queryClient: noQueryClient,
      decodeSpCoinError: (error: unknown) => {
        const decoded = decodeSpCoinErrorFromError(error);
        return decoded ? { code: decoded.code, label: decoded.label } : undefined;
      },
      pushTradeExecutionLock: () => undefined,
    };
    return useSwapFunctions(params);
  }

  function useStandaloneUniswapSwapIo() {
    // one confirmation + execution path for a one-step and a two-step (through the wrapped native token) swap; only the router call differs. The swap and the spending approval before it reach the approval screen with the display every Merit wallet uses (approval/swapApprovalDisplay.ts)
    const runSwap = async (p: any, label: string, exec: (context: TradeExecutorContext) => Promise<any>) => {
      const request = p.signer as any;
      const buy = (request?.tokens ?? []).find((tk: any) => String(tk.label).startsWith('Receive'))?.token;
      const minReceived = `${formatUnits(p.amountOutMinimum, buy?.decimals ?? 18)} ${buy?.symbol ?? ''}`.trim();
      const from = String(request?.activeAccountAddress ?? p.recipient);
      const executor = createStandaloneTradeExecutor(authenticator, from, p.rpcUrl);
      executor.execute = withSwapApprovalDisplay(executor.execute.bind(executor), label, swapConfirmCopy(request, minReceived));
      const context: TradeExecutorContext = { account: { address: from, isConnected: Boolean(from), chainId: p.chainId }, executor };
      const result = await exec(context);
      return { transactionHash: result.transactionHash, receipt: result.receipt, approvalSubmitted: !!(result as any).approvalSubmitted };
    };
    return {
      // the signer is the request itself: the vault signs behind the approval page
      getSigner: async (request: unknown) => request,
      executeSingle: (p: any) => runSwap(p, 'Uniswap V3 Swap', (context) => executeSwapPortable({ chainId: p.chainId, tokenIn: p.tokenIn, tokenOut: p.tokenOut, amountIn: p.amountIn, amountOutMinimum: p.amountOutMinimum, recipient: p.recipient, fee: p.fee, context, rpcUrl: p.rpcUrl })),
      executeMultiHop: (p: any) => runSwap(p, 'Uniswap V3 Multi-hop Swap', (context) => executeMultiHopPortable({ chainId: p.chainId, tokenIn: p.tokenIn, through: p.through, tokenOut: p.tokenOut, amountIn: p.amountIn, amountOutMinimum: p.amountOutMinimum, recipient: p.recipient, feeIn: p.feeIn, context, rpcUrl: p.rpcUrl })),
      invalidateBalanceQueries: () => undefined,
    };
  }

  setSwapFunctionsHook(useStandaloneSwapFunctions);
  setUniswapSwapIoHook(useStandaloneUniswapSwapIo as never);
  // no hosted trading provider and no 0x price service: the on-chain Uniswap price still runs
  setApiProviderHook(() => undefined);
  setQuoteService({ getPrice: async () => undefined, serverLabel: 'no quote service' } as never);
}
