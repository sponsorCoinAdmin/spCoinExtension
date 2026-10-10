// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/swap/ConnectedUniSelectPanel.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 22) -- the Swap tab's Uniswap section with a live quote and a working button, for a host
// that has no web trading pipeline. It draws spcoin-panels' portable UniSelectPanel (the same row and button the web app shows) and fills it from
// useSwapQuote: the quoted amount, the busy and disabled states, and the swap itself.
'use client';

import React from 'react';
import { formatUnits } from 'viem';
import { UniSelectPanel } from '@sponsorcoin/spcoin-panels';
import { useBuyTokenContract } from '@sponsorcoin/spcoin-exchange-engine';
import type { SwapTradeButtonHost } from './SwapTradeButton';
import { useSwapQuote } from './useSwapQuote';

export default function ConnectedUniSelectPanel({
  host,
  onBuyTokenClick,
  balanceText,
}: {
  host: SwapTradeButtonHost;
  onBuyTokenClick?: (e: React.SyntheticEvent) => void;
  balanceText?: string;
}) {
  const q = useSwapQuote(host, { writeBuyAmount: false });
  const [buyToken] = useBuyTokenContract();

  let amount = '0';
  if (q.loading) amount = '…';
  else if (q.error) amount = /no pool/i.test(q.error) ? 'no pool' : '0';
  else if (q.price) amount = formatUnits(q.price.buyAmount, q.buyDecimals);

  return (
    <UniSelectPanel
      tokenIcon={buyToken?.logoURL ? <img src={buyToken.logoURL} alt="" style={{ width: 24, height: 24, borderRadius: '50%' }} /> : undefined}
      tokenSymbol={buyToken?.symbol}
      tokenAddress={buyToken?.address}
      onTokenPillClick={onBuyTokenClick}
      amount={amount}
      amountNote={q.error && amount === '0' ? q.error : undefined}
      balanceText={balanceText}
      tradeDisabled={!q.price || q.swapping || !q.hasAccount}
      tradeBusy={q.swapping}
      tradeIsNoPool={/no pool/i.test(q.error)}
      onTrade={q.swap}
    />
  );
}
