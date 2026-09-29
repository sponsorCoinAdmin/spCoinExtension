// File: src/executeErc20Approve.ts
// Extension-side ERC20 approve adapter (2026-09-28, Phase C).
//
// Thin wrapper around the portable executeErc20Approve from
// @sponsorcoin/spcoin-onchain, wiring the extension's TradeExecutor (meritSign.ts).
// This is the extension counterpart to the web app's
// lib/spCoin/executeErc20Approve.ts — same pattern, different
// TradeExecutor context builder.

import {
  executeErc20Approve as executeErc20ApprovePortable,
  type ExecuteErc20ApproveResult,
} from '@sponsorcoin/spcoin-onchain';
import { buildMeritTradeExecutorContext } from './tradeExecutorMerit';
import type { TradeExecutorContext, TradeExecutorAccount } from '@sponsorcoin/spcoin-exchange-engine';

export interface ExecuteErc20ApproveParamsExt {
  baseUrl: string;
  rpcUrl: string;
  chainId: number;
  tokenAddress: string;
  spenderAddress: string;
  amountRaw: bigint;
  fromAddress: string;
}

export type { ExecuteErc20ApproveResult };

export async function executeErc20Approve({
  baseUrl,
  rpcUrl,
  chainId,
  tokenAddress,
  spenderAddress,
  amountRaw,
  fromAddress,
}: ExecuteErc20ApproveParamsExt): Promise<ExecuteErc20ApproveResult> {
  const account: TradeExecutorAccount = {
    address: fromAddress,
    isConnected: Boolean(fromAddress),
    chainId,
  };

  const context: TradeExecutorContext = buildMeritTradeExecutorContext(
    { baseUrl, rpcUrl },
    account,
  );

  return executeErc20ApprovePortable({
    tokenAddress,
    spenderAddress,
    amountRaw,
    context,
    rpcUrl,
    chainId,
  });
}
