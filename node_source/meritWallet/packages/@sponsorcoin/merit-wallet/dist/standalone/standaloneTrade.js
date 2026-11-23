// File: src/standalone/standaloneTrade.ts
//
// 2026-11-19 (docs/design/standAloneWalletInstall.txt) -- the stand-alone wallet's TRADE host: what the shared Swap tab (and later the Sponsor tab) asks of its host, registered once with the engine. It is the extension's engineHosts.ts + tradeExecutorMerit.ts +
// executeUniswapV3Swap.ts with the vault authenticator in place of the extension's worker: a swap's approve and swap transactions go to the vault's approval queue (the approval page asks first), then the vault signs and broadcasts, and this waits for the block.
// Without it the Swap button reports "This app has not registered a signer for Uniswap swaps."
import { createPublicClient, formatUnits, http } from 'viem';
import { decodeSpCoinErrorFromError, executeMultiHopUniswapV3Swap as executeMultiHopPortable, executeUniswapV3Swap as executeSwapPortable, setApiProviderHook, setQuoteService, setSwapFunctionsHook, setUniswapSwapIoHook, useActiveSpCoinAddress, useBuyTokenContract, useExchangeContext, useSwapFunctions, useUniswapV3CombinedQuote, } from '@sponsorcoin/spcoin-exchange-engine';
import { useConnectMode } from '@sponsorcoin/spcoin-panels';
import { createDirectReadStep } from '../chain/directReads';
import { SPOIN_STAKE_ABI } from '../chain/spCoinStakeAbi';
import { authenticatorDisplayOf } from '../approval/authenticatorDisplay';
import { swapConfirmCopy, withSwapApprovalDisplay } from '../approval/swapApprovalDisplay';
/** The engine only calls invalidateQueries after a confirmed trade; the stand-alone wallet has no query cache (balances re-read on their own). */
const noQueryClient = { invalidateQueries: async () => undefined };
/** Wait for the transaction to be mined and return the receipt in the shape the swap flow reads; null when it is not mined in time. */
export async function waitForTradeReceipt(rpcUrl, hash, timeoutMs = 60000) {
    try {
        const client = createPublicClient({ transport: http(rpcUrl) });
        const r = await client.waitForTransactionReceipt({ hash: hash, timeout: timeoutMs });
        return { blockNumber: Number(r.blockNumber), gasUsed: r.gasUsed, gasPrice: r.effectiveGasPrice, status: r.status === 'success' ? 1 : 0, to: r.to ?? null, from: r.from, contractAddress: r.contractAddress ?? null };
    }
    catch {
        return null;
    }
}
/** A TradeExecutor over the vault authenticator: execute() queues the transaction for approval and sends it; call() is a plain eth_call (allowances and the like). */
export function createStandaloneTradeExecutor(authenticator, from, defaultRpcUrl) {
    return {
        async execute({ to, data, value, chainId, rpcUrl, display }) {
            const { hash } = await authenticator.sendTransaction({
                from,
                to,
                data,
                value: value !== undefined ? BigInt(value) : undefined,
                chainId,
                display: authenticatorDisplayOf(display),
            });
            const receipt = await waitForTradeReceipt(rpcUrl || defaultRpcUrl, hash);
            return { transactionHash: hash, receipt };
        },
        async call({ to, data, rpcUrl }) {
            const client = createPublicClient({ transport: http(rpcUrl || defaultRpcUrl) });
            const result = await client.call({ to: to, data: data });
            return result.data ?? '0x';
        },
    };
}
let registeredFor;
/** Register the swap hooks with the engine, once. `rpcOf` answers a chain's endpoint (the page's chains first, then the bundled network settings). */
export function registerStandaloneTradeHosts(authenticator, chains, rpcOf) {
    if (registeredFor === authenticator)
        return;
    registeredFor = authenticator;
    void chains;
    const directReads = createDirectReadStep(SPOIN_STAKE_ABI);
    const readStep = async (params, method, args = []) => {
        if (directReads.handles(method) && params.rpcUrl)
            return directReads.read({ contractAddress: params.contractAddress, rpcUrl: params.rpcUrl }, method, args);
        throw new Error(`The wallet cannot read ${method} on its own.`);
    };
    function useStandaloneSwapFunctions() {
        const { exchangeContext } = useExchangeContext();
        const { activeAddress: hostActiveAddress } = useConnectMode(); // 2026-11-21: the wallet's own active account, for when the exchange context has not caught up
        const [activeSpCoinAddress] = useActiveSpCoinAddress();
        const [buyTokenContract] = useBuyTokenContract();
        const tradeData = exchangeContext?.apiCoreSyncedMembers.tradeData;
        const appChainId = Number(exchangeContext?.apiCoreSyncedMembers?.network?.appChainId ?? 0);
        const { data: sponsorQuoteData } = useUniswapV3CombinedQuote({
            enabled: true,
            chainId: appChainId,
            sellAddress: tradeData?.sellTokenContract?.address,
            buyAddress: buyTokenContract?.address,
            sellAmount: tradeData?.sellTokenContract?.amount ?? 0n,
        });
        const sponsorQuote = sponsorQuoteData ? { amountOut: sponsorQuoteData.amountOut, isMultiHop: sponsorQuoteData.isMultiHop } : undefined;
        const params = {
            buildTradeExecutorContext: async (_display, chainId, rpcUrl) => {
                const from = String(exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount?.address ?? '').trim() || hostActiveAddress;
                return { account: { address: from, isConnected: Boolean(from), chainId }, executor: createStandaloneTradeExecutor(authenticator, from, rpcUrl || rpcOf(chainId) || '') };
            },
            activeSpCoinAddress,
            fallbackActiveAccountAddress: hostActiveAddress,
            sponsorQuote,
            abi: SPOIN_STAKE_ABI,
            readStep,
            queryClient: noQueryClient,
            decodeSpCoinError: (error) => {
                const decoded = decodeSpCoinErrorFromError(error);
                return decoded ? { code: decoded.code, label: decoded.label } : undefined;
            },
            pushTradeExecutionLock: () => undefined,
        };
        return useSwapFunctions(params);
    }
    function useStandaloneUniswapSwapIo() {
        // one confirmation + execution path for a one-step and a two-step (through the wrapped native token) swap; only the router call differs. The swap and the spending approval before it reach the approval screen with the display every Merit wallet uses (approval/swapApprovalDisplay.ts)
        const runSwap = async (p, label, exec) => {
            const request = p.signer;
            const buy = (request?.tokens ?? []).find((tk) => String(tk.label).startsWith('Receive'))?.token;
            const minReceived = `${formatUnits(p.amountOutMinimum, buy?.decimals ?? 18)} ${buy?.symbol ?? ''}`.trim();
            const from = String(request?.activeAccountAddress ?? p.recipient);
            const executor = createStandaloneTradeExecutor(authenticator, from, p.rpcUrl);
            executor.execute = withSwapApprovalDisplay(executor.execute.bind(executor), label, swapConfirmCopy(request, minReceived));
            const context = { account: { address: from, isConnected: Boolean(from), chainId: p.chainId }, executor };
            const result = await exec(context);
            return { transactionHash: result.transactionHash, receipt: result.receipt, approvalSubmitted: !!result.approvalSubmitted };
        };
        return {
            // the signer is the request itself: the vault signs behind the approval page
            getSigner: async (request) => request,
            executeSingle: (p) => runSwap(p, 'Uniswap V3 Swap', (context) => executeSwapPortable({ chainId: p.chainId, tokenIn: p.tokenIn, tokenOut: p.tokenOut, amountIn: p.amountIn, amountOutMinimum: p.amountOutMinimum, recipient: p.recipient, fee: p.fee, context, rpcUrl: p.rpcUrl })),
            executeMultiHop: (p) => runSwap(p, 'Uniswap V3 Multi-hop Swap', (context) => executeMultiHopPortable({ chainId: p.chainId, tokenIn: p.tokenIn, through: p.through, tokenOut: p.tokenOut, amountIn: p.amountIn, amountOutMinimum: p.amountOutMinimum, recipient: p.recipient, feeIn: p.feeIn, context, rpcUrl: p.rpcUrl })),
            invalidateBalanceQueries: () => undefined,
        };
    }
    setSwapFunctionsHook(useStandaloneSwapFunctions);
    setUniswapSwapIoHook(useStandaloneUniswapSwapIo);
    // no hosted trading provider and no 0x price service: the on-chain Uniswap price still runs
    setApiProviderHook(() => undefined);
    setQuoteService({ getPrice: async () => undefined, serverLabel: 'no quote service' });
}
