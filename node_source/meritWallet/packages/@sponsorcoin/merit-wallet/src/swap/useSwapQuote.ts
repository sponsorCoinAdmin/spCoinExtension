// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/swap/useSwapQuote.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 22) -- the swap state both Swap tab views share (the 0x trade button and the Uniswap section):
// from the engine's exchange context it reads the two tokens and the sell amount, asks the host for a price once the inputs settle (debounced, and
// a stale answer is dropped), and runs the host's swap on request. The views only draw it.
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Address } from 'viem';
import { runUniswapSwap, useBuyAmount, useBuyTokenContract, useExchangeContext, usePanelTree, useSellAmount, useSellTokenContract } from '@sponsorcoin/spcoin-exchange-engine';
import { SP_COIN_DISPLAY } from '@sponsorcoin/spcoin-common/panels';
import { useWalletTokenBalance } from '@sponsorcoin/spcoin-panels';
import { useActiveAccountProfile } from './activeAccountProfile';
import { minimumAmountOut, type SwapPrice } from './swapPrice';
import type { SwapTradeButtonHost } from './SwapTradeButton';

const DEBOUNCE_MS = 400;

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

export function useSwapQuote(host: SwapTradeButtonHost, options: { writeBuyAmount: boolean }): SwapQuoteState {
  const { exchangeContext, setErrorMessage } = useExchangeContext();
  const { openPanel } = usePanelTree();
  const profile = useActiveAccountProfile();
  const [sellToken] = useSellTokenContract();
  const [buyToken] = useBuyTokenContract();
  const [sellAmount, setSellAmount] = useSellAmount();
  const sellBalance = useWalletTokenBalance(sellToken?.address, sellToken?.decimals ?? 18);
  const [, setBuyAmount] = useBuyAmount();
  const chainId = Number(exchangeContext?.apiCoreSyncedMembers?.network?.appChainId ?? 0);

  const [price, setPrice] = useState<SwapPrice | undefined>(undefined);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const latest = useRef(0);

  const sellAddress = sellToken?.address ?? '';
  const buyAddress = buyToken?.address ?? '';
  const ready = !!chainId && !!sellAddress && !!buyAddress && sellAmount > 0n;

  useEffect(() => {
    const ticket = ++latest.current;
    if (!ready) {
      setPrice(undefined);
      setError('');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const timer = setTimeout(() => {
      host
        .getPrice({ chainId, sellToken: sellAddress, buyToken: buyAddress, sellAmount })
        .then((p) => {
          if (ticket !== latest.current) return;
          setPrice(p);
          if (options.writeBuyAmount) setBuyAmount(p.buyAmount);
        })
        .catch((e: unknown) => {
          if (ticket !== latest.current) return;
          setPrice(undefined);
          setError(e instanceof Error ? e.message : 'No price is available.');
        })
        .finally(() => {
          if (ticket === latest.current) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // host functions are stable per mount; the inputs are what re-price
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, chainId, sellAddress, buyAddress, sellAmount]);

  // The pool can move between the quote on screen and the click (another swap, a thin test pool): a stale minimum then reverts as "Too little received".
  // So the price is read again at the click and the swap is built on that one; if the re-read fails, the price on screen is used.
  const swap = () => {
    if (!price || swapping) return;
    setSwapping(true);
    host
      .getPrice({ chainId, sellToken: sellAddress, buyToken: buyAddress, sellAmount })
      .catch(() => price)
      .then((fresh) => runSwap(fresh));
  };

  const runSwap = (price: SwapPrice) => {
    const slippageBps = host.slippageBps ?? 50;
    // A Uniswap price on a host that supplies the Uniswap adapter runs the SAME flow the web app's Uniswap section runs (runUniswapSwap in the
    // exchange engine): the same approval details, the same Success / error MESSAGE_PANEL once the receipt is in, the same balance refresh.
    const uni = host.uniswap;
    if (price.source === 'uniswap' && uni) {
      const contextAccount = exchangeContext?.apiCoreSyncedMembers?.accounts?.activeAccount;
      // The receipt's ACCOUNT row: the context's account, filled in from the profile the header shows when the context has not hydrated it.
      const sameAccount = !!contextAccount && !!profile?.address && String(contextAccount.address).toLowerCase() === profile.address.toLowerCase();
      const activeAccount = contextAccount && sameAccount
        ? { ...contextAccount, name: contextAccount.name || profile?.name || '', symbol: contextAccount.symbol || profile?.symbol || '', logoURL: profile?.logoURL || contextAccount.logoURL || '' }
        : contextAccount;
      const activeAccountAddress = String(activeAccount?.address ?? '').trim();
      let succeeded = false;
      runUniswapSwap(
        {
          data: { amountOut: price.buyAmount, isMultiHop: false },
          sellAddress: sellAddress as Address,
          buyAddress: buyAddress as Address,
          activeAccount,
          activeAccountAddress,
          rpcUrl: uni.rpcUrl(chainId),
          appChainId: chainId,
          quoteChainId: chainId,
          // The balance the Swap tab shows (read through the host), so the shared flow's pre-flight check can say "Insufficient ..." before anything is signed.
          sellTokenContract: sellToken ? ({ ...sellToken, balance: sellBalance.balance ?? undefined } as unknown as typeof sellToken) : sellToken,
          buyTokenContract: buyToken,
          debouncedSellAmount: sellAmount,
          slippageBpsIn: slippageBps,
        },
        {
          setSwapState: (state) => {
            if (state.status === 'success') succeeded = true;
          },
          setErrorMessage,
          openMessagePanel: (invoker) => openPanel(SP_COIN_DISPLAY.MESSAGE_PANEL, invoker),
          trace: () => undefined,
          getSigner: async (request) => request,
          executeSingle: uni.executeSingle,
          executeMultiHop: async () => {
            throw new Error('Multi-hop swaps are not available here yet.');
          },
          invalidateBalanceQueries: () => uni.onSettled?.(),
        },
      )
        .then(() => {
          if (succeeded) setSellAmount(0n);
        })
        .finally(() => setSwapping(false));
      return;
    }
    host
      .execute({ chainId, sellToken: sellAddress, buyToken: buyAddress, sellAmount, price, minimumBuyAmount: minimumAmountOut(price.buyAmount, slippageBps), slippageBps })
      .then((result) => host.onResult?.({ ok: true, hash: result && 'hash' in result ? result.hash : undefined }))
      .catch((e: unknown) => host.onResult?.({ ok: false, message: e instanceof Error ? e.message : 'The swap failed.' }))
      .finally(() => setSwapping(false));
  };

  return { chainId, sellAddress, buyAddress, sellAmount, buyDecimals: buyToken?.decimals ?? 18, ready, price, error, loading, swapping, hasAccount: host.hasAccount(), swap };
}
