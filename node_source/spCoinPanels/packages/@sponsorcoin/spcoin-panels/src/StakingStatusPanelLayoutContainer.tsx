// File: src/StakingStatusPanelLayoutContainer.tsx
//
// Portable promotion of the web app's
// components/views/TradingStationPanel/
// StakingStatusPanelLayoutContainer.tsx (183 ln, 2026-09-14), the prop-driven
// "layout" counterpart to StakingStatusPanel.tsx's real BaseSelectPanel
// rendering. Same pattern as the already-promoted SellSelectPanel/
// SellSelectPanelLayoutContainer and BuySelectPanel/
// BuySelectPanelLayoutContainer (see their doc comments).
//
// Portable here: every hook and util imported from
// @sponsorcoin/spcoin-exchange-engine or @sponsorcoin/spcoin-common:
// useBuyAmount, useTradeDirection, useBuyTokenContract, useGetBalance,
// parseValidFormattedAmount, clampDisplay/isIntermediateDecimal/
// maxInputSz/TYPING_GRACE_MS, TRADE_DIRECTION. TokenLogo + TradeAmountRow
// are already in this package. The component is a pure, hook-driven renderer
// wrapping TradeAmountRow — no Tailwind, no web-app-only state.
//
// Non-portable (injected as opaque props): `useApiProvider` (reads web-app-
// local meritApiTradingProvider.tsx state) → resolved by the caller and
// passed in as `apiProvider`. The container only needs to check whether it's
// 'API_0X' (0x doesn't support input); the string literal is stable and
// matches API_TRADING_PROVIDER.API_0X = 'API_0X' exactly (see the web app's
// lib/structure/enums/enums.ts doc comment). TokenLogo is a local import
// (./TokenLogo — already in this package).

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';

import {
  useBuyAmount,
  useTradeDirection,
  useBuyTokenContract,
  useGetBalance,
  parseValidFormattedAmount,
  clampDisplay,
  isIntermediateDecimal,
  maxInputSz,
  TYPING_GRACE_MS,
  useExchangeContext,
  type UseGetBalanceParams,
} from '@sponsorcoin/spcoin-exchange-engine';
import { TRADE_DIRECTION } from '@sponsorcoin/spcoin-common/context';
import type { TokenContract } from '@sponsorcoin/spcoin-common/context';
import TokenLogo from './TokenLogo';
import TradeAmountRow from './TradeAmountRow';

export interface StakingStatusPanelLayoutContainerProps {
  /** Label for the amount row (default in the web app: "New Recipient Staked spCoins"). */
  buyText: string;
  /** Overrides the live balance fetch (web app SponsorPanel passes a live formatted string). */
  balanceOverride?: string;
  /** Forces the amount field read-only (precedence: amountOverride > disabledOverride > default). */
  disabledOverride?: boolean;
  /** Forces the amount field to fixed text (e.g. "No Pool"), read-only. */
  amountOverride?: string;
  /** Label prefix for the balance line. */
  balanceLabel: string;
  /** Whether to render the token-identity pill (icon/symbol/address). */
  showTokenIdentity: boolean;
  /** Resolved API trading provider string from the caller's useApiProvider() — only 'API_0X' disables input. */
  apiProvider?: string;
}

export default function StakingStatusPanelLayoutContainer({
  buyText,
  balanceOverride,
  disabledOverride,
  amountOverride,
  balanceLabel,
  showTokenIdentity,
  apiProvider,
}: StakingStatusPanelLayoutContainerProps) {
  const [buyAmount, setBuyAmount] = useBuyAmount();
  const [tradeDirection, setTradeDirection] = useTradeDirection();
  const [buyTokenContract] = useBuyTokenContract();
  const tokenAddr = buyTokenContract?.address;
  const tokenDecimals = buyTokenContract?.decimals ?? 18;

  const [inputValue, setInputValue] = useState('0');
  const typingUntilRef = useRef(0);

  useEffect(() => {
    if (amountOverride !== undefined) return;
    if (isIntermediateDecimal(inputValue)) return;
    if (Date.now() < typingUntilRef.current) return;
    if (!tokenAddr) {
      if (inputValue !== '0') setInputValue('0');
      return;
    }
    const raw = formatUnits(buyAmount ?? 0n, tokenDecimals);
    const formatted = clampDisplay(raw, maxInputSz);
    if (inputValue !== formatted) setInputValue(formatted);
  }, [amountOverride, tokenAddr, tokenDecimals, buyAmount]);

  const onChangeAmount = useCallback(
    (value: string) => {
      typingUntilRef.current = Date.now() + TYPING_GRACE_MS;
      if (!/^\d*\.?\d*$/.test(value)) return;
      const normalized = value.replace(/^0+(?!\.)/, '') || '0';
      setInputValue(normalized);
      if (isIntermediateDecimal(normalized) || !tokenAddr) return;
      const formatted = parseValidFormattedAmount(normalized, tokenDecimals);
      try {
        const bi = parseUnits(formatted, tokenDecimals);
        if (tradeDirection !== TRADE_DIRECTION.BUY_EXACT_IN) setTradeDirection(TRADE_DIRECTION.BUY_EXACT_IN);
        if (buyAmount !== bi) setBuyAmount(bi);
      } catch {
        // Same swallow-on-parse-failure as AmountComponent.tsx.
      }
    },
    [tokenAddr, tokenDecimals, tradeDirection, buyAmount, setTradeDirection, setBuyAmount],
  );

  const isInputDisabled =
    amountOverride !== undefined
      ? true
      : disabledOverride ?? (!tokenAddr || apiProvider === 'API_0X');

  const { exchangeContext } = useExchangeContext();
  const activeAccountAddr = exchangeContext?.apiCoreSyncedMembers.accounts?.activeAccount?.address;

  const getBalanceParams: UseGetBalanceParams = {
    tokenAddress: tokenAddr ?? null,
    userAddress: activeAccountAddr ?? null,
    decimalsHint: tokenDecimals,
    staleTimeMs: 20_000,
  };
  const {
    formatted: hookFormatted,
    isLoading: balanceLoading,
    error: balanceError,
  } = useGetBalance(getBalanceParams);

  let formattedBalance: string;
  if (balanceOverride != null) formattedBalance = balanceOverride;
  else if (!tokenAddr) formattedBalance = '—';
  else if (!activeAccountAddr) formattedBalance = '—';
  else if (balanceError) formattedBalance = '—';
  else if (balanceLoading) formattedBalance = '…';
  else formattedBalance = hookFormatted ?? '0.0';

  return (
    <TradeAmountRow
      label={buyText}
      tokenIcon={
        showTokenIdentity && buyTokenContract ? (
          <TokenLogo
            tokenContract={buyTokenContract as TokenContract}
            title={`TOKEN : ${buyTokenContract.symbol ?? ''}: ${buyTokenContract.name ?? ''}`}
            className="h-full w-full object-contain"
          />
        ) : undefined
      }
      tokenSymbol={showTokenIdentity ? buyTokenContract?.symbol : undefined}
      tokenAddress={showTokenIdentity && buyTokenContract?.address ? String(buyTokenContract.address) : undefined}
      showTokenIdentity={showTokenIdentity}
      amount={amountOverride ?? inputValue}
      onAmountChange={isInputDisabled ? undefined : onChangeAmount}
      amountDisabled={isInputDisabled}
      balanceText={`${balanceLabel}: ${formattedBalance}`}
    />
  );
}
