// File: src/ExchangeButtonDerivations.ts
// 2026-09-28, Phase 4 CONNECT_TRADE_BUTTON — extracted button-state derivation
// logic from the web app's ExchangeButton.tsx into portable pure functions.
// Both web app and extension wrappers call these with their own data sources,
// then pass the results to the shared ExchangeButton presentation shell.

import type { ReactNode } from 'react';
import { BUTTON_TYPE, STATUS, TRADE_DIRECTION } from '@sponsorcoin/spcoin-common/context';

export interface ExchangeButtonDerivationsParams {
  buttonType: BUTTON_TYPE;
  showBusyLabel: boolean;
  sponsorMode: 'SPONSOR' | 'STAKE' | 'REVOKE';
  hasAgent: boolean;
  tradeDirection: TRADE_DIRECTION;
  sellTokenSymbol?: string;
  buyTokenSymbol?: string;
  isLoadingPrice: boolean;
  tokensRequired: boolean;
  sellTokenRequired: boolean;
  buyTokenRequired: boolean;
  amountRequired: boolean;
  insufficientSellBalance: boolean;
  errorMessage?: { status: STATUS } | null;
  isSponsorPanel: boolean;
  isNoPool?: boolean;
}

export function deriveButtonType(params: {
  isLoadingPrice: boolean;
  tokensRequired: boolean;
  sellTokenRequired: boolean;
  buyTokenRequired: boolean;
  amountRequired: boolean;
  insufficientSellBalance: boolean;
  errorMessage?: { status: STATUS } | null;
}): BUTTON_TYPE {
  const { isLoadingPrice, tokensRequired, sellTokenRequired, buyTokenRequired, amountRequired, insufficientSellBalance, errorMessage } = params;

  if (errorMessage?.status === STATUS.WARNING_HARDHAT) return BUTTON_TYPE.NO_HARDHAT_API;
  if (errorMessage?.status === STATUS.ERROR_API_PRICE) return BUTTON_TYPE.API_TRANSACTION_ERROR;
  if (isLoadingPrice) return BUTTON_TYPE.IS_LOADING_PRICE;
  if (tokensRequired) return BUTTON_TYPE.TOKENS_REQUIRED;
  if (sellTokenRequired) return BUTTON_TYPE.SELL_TOKEN_REQUIRED;
  if (buyTokenRequired) return BUTTON_TYPE.BUY_TOKEN_REQUIRED;
  if (amountRequired) return BUTTON_TYPE.ZERO_AMOUNT;
  if (insufficientSellBalance) return BUTTON_TYPE.INSUFFICIENT_BALANCE;
  return BUTTON_TYPE.SWAP;
}

export function deriveButtonText(params: {
  buttonType: BUTTON_TYPE;
  showBusyLabel: boolean;
  sponsorMode: 'SPONSOR' | 'STAKE' | 'REVOKE';
  hasAgent: boolean;
  tradeDirection: TRADE_DIRECTION;
  sellTokenSymbol?: string;
  buyTokenSymbol?: string;
  isSponsorPanel: boolean;
}): ReactNode {
  const { buttonType, showBusyLabel, sponsorMode, hasAgent, tradeDirection, sellTokenSymbol, isSponsorPanel } = params;

  if (showBusyLabel) {
    if (isSponsorPanel && sponsorMode === 'STAKE') return 'Staking new Sponsorship';
    if (isSponsorPanel && sponsorMode === 'SPONSOR') return 'Adding new Sponsorship';
    if (isSponsorPanel && sponsorMode === 'REVOKE') return 'Revoking Sponsorship';
    return 'Processing...';
  }

  const tradeDirectionText = tradeDirection === TRADE_DIRECTION.SELL_EXACT_OUT ? 'EXACT OUT ' : 'EXACT IN ';

  switch (buttonType) {
    case BUTTON_TYPE.TOKENS_REQUIRED:
      return 'Select Trading Pair';
    case BUTTON_TYPE.API_TRANSACTION_ERROR:
      return 'API Transaction Error';
    case BUTTON_TYPE.IS_LOADING_PRICE:
      return 'Fetching Best Price...';
    case BUTTON_TYPE.NO_HARDHAT_API:
      return 'No Hardhat API Provisioning..';
    case BUTTON_TYPE.ZERO_AMOUNT:
      return 'Enter an Amount';
    case BUTTON_TYPE.INSUFFICIENT_BALANCE:
      return `Insufficient ${sellTokenSymbol ?? 'Token'} Balance`;
    case BUTTON_TYPE.SWAP:
      if (isSponsorPanel && sponsorMode === 'STAKE') {
        return hasAgent ? 'Stake your SpCoins' : (
          <>
            Stake your SpCoins <span className="ml-2 text-orange-400"> ( No Agent )</span>
          </>
        );
      }
      if (isSponsorPanel && sponsorMode === 'SPONSOR') return 'Add New Sponsorship';
      if (isSponsorPanel && sponsorMode === 'REVOKE') return 'Unstake your SpCoins';
      return `${tradeDirectionText} SWAP`;
    case BUTTON_TYPE.SELL_TOKEN_REQUIRED:
    case BUTTON_TYPE.SELL_ERROR_REQUIRED:
      return 'Sell Token Required';
    case BUTTON_TYPE.BUY_TOKEN_REQUIRED:
    case BUTTON_TYPE.BUY_ERROR_REQUIRED:
      return 'Buy Token(s) Required';
    default:
      return 'Button Type Undefined';
  }
}

export type ActionButtonBgClass = 'bg-[#243056]' | 'bg-[#501505]' | 'bg-[#1f3e1d]' | 'bg-orange-600';

export function deriveBgClass(params: {
  buttonType: BUTTON_TYPE;
  showBusyLabel: boolean;
}): ActionButtonBgClass {
  const { buttonType, showBusyLabel } = params;

  if (showBusyLabel) return 'bg-orange-600';

  switch (buttonType) {
    case BUTTON_TYPE.SWAP:
      return 'bg-[#1f3e1d]';
    case BUTTON_TYPE.API_TRANSACTION_ERROR:
    case BUTTON_TYPE.BUY_ERROR_REQUIRED:
    case BUTTON_TYPE.INSUFFICIENT_BALANCE:
    case BUTTON_TYPE.NO_HARDHAT_API:
    case BUTTON_TYPE.SELL_ERROR_REQUIRED:
      return 'bg-[#501505]';
    default:
      return 'bg-[#243056]';
  }
}

export function deriveNoPoolWarning(params: {
  isSponsorPanel: boolean;
  sponsorMode: 'SPONSOR' | 'STAKE' | 'REVOKE';
  isNoPool?: boolean;
  buttonType: BUTTON_TYPE;
}): boolean {
  const { isSponsorPanel, sponsorMode, isNoPool, buttonType } = params;
  return Boolean(isSponsorPanel && sponsorMode === 'SPONSOR' && isNoPool && buttonType === BUTTON_TYPE.SWAP);
}
