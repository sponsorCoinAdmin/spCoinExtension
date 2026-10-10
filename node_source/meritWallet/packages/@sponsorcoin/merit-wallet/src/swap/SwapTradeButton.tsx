// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/swap/SwapTradeButton.tsx
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 22) -- the Swap tab's 0x trade button for a host that has no web trading pipeline (the
// extension). It is the content the Merit Wallet component's zeroXTradeButtonContent slot takes. The state (tokens, amount, price, swapping) is
// useSwapQuote; the price is written into the buy amount field; the button shows what the user can do: pick a pair, enter an amount, wait, or Swap.
// A click hands the swap to the host's execute function, which signs through its own approval screen. No keys and no host imports here.
'use client';

import React from 'react';
import { walletColors } from '@sponsorcoin/spcoin-common/styles';
import { ConnectButton, useConnectMode } from '@sponsorcoin/spcoin-panels';
import type { UniswapSwapExecution, UniswapSwapSingleParams } from '@sponsorcoin/spcoin-exchange-engine';
import type { SwapPrice, SwapPriceRequest } from './swapPrice';
import { useSwapQuote } from './useSwapQuote';

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
  execute(request: SwapExecuteRequest): Promise<{ hash?: string } | void>;
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
  onResult?(result: { ok: true; hash?: string } | { ok: false; message: string }): void;
}

export default function SwapTradeButton({ host }: { host: SwapTradeButtonHost }) {
  const q = useSwapQuote(host, { writeBuyAmount: true });
  // 2026-10-09: no active account -> a Connect button instead of the swap button.
  const { connectMode } = useConnectMode();
  if (connectMode) return <ConnectButton id="ZERO_X_CONNECT_BUTTON" />;

  let label = 'Select Trading Pair';
  let disabled = true;
  if (q.sellAddress && q.buyAddress) {
    label = 'Enter an Amount';
    if (q.sellAmount > 0n) {
      if (q.loading) label = 'Getting price…';
      else if (q.error) label = q.error;
      else if (!q.hasAccount) label = 'Select an Account';
      else if (q.swapping) label = 'Swapping…';
      else if (q.price) {
        label = 'Swap';
        disabled = false;
      }
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={q.swap}
      style={{
        boxSizing: 'border-box',
        width: '100%',
        borderRadius: 8,
        border: 'none',
        background: walletColors.panel,
        color: disabled ? walletColors.accentSoft : '#ffffff',
        fontSize: 12,
        fontWeight: 600,
        padding: '10px 0',
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}
