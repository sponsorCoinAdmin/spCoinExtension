// File: src/tradeExecutorMerit.ts
// Extension's TradeExecutor implementation (2026-09-26, Phase 4).
//
// Wraps meritSign.ts's signAndSendMeritTransaction — the extension's
// approval-gated POST to /api/spCoin/meritConnect/sign. This is the
// production counterpart to the web app's tradeExecutorEthers.ts (ethers
// Signer path).
//
// The portable swap/stake/approve logic in @sponsorcoin/spcoin-onchain
// (re-exported via @sponsorcoin/spcoin-exchange-engine) calls
// context.executor.execute() / .call() — this adapter bridges that
// signer-agnostic interface to the extension's Merit server-side signing
// pipeline.

import type {
  TradeExecutor,
  TradeExecutionResult,
  TradeExecutorContext,
  TradeExecutorAccount,
} from '@sponsorcoin/spcoin-exchange-engine';
import {
  signAndSendMeritTransaction,
  type SignAndSendMeritTransactionParams,
} from './meritSign';
import type { PendingSignRequestAccountEntry, PendingSignRequestTokenEntry } from './pendingSignRequestStore';

export interface MeritTradeExecutorParams {
  /** Base URL for the Merit Wallet API (e.g. chrome-extension://xxx or https://spcoin.app). */
  baseUrl: string;
  /** RPC URL — required by the Merit sign route, not resolved internally. */
  rpcUrl: string;
}

/**
 * Creates a TradeExecutor backed by the extension's Merit signing pipeline.
 * The extension doesn't have an ethers Signer — it POSTs {to, data, value}
 * to /api/spCoin/meritConnect/sign, which the Merit Wallet server signs
 * using the user's locally-held keystore.
 *
 * The `call()` method (eth_call for allowance checks, etc.) returns empty
 * on the extension path — there's no cross-origin RPC relay yet. The portable
 * executeErc20Approve/executeUniswapV3Swap modules catch this and proceed
 * with the approve transaction anyway (allowance reads as 0 → always approves).
 * A future cross-origin RPC relay can fill in the real eth_call.
 */
export function createMeritTradeExecutor(params: MeritTradeExecutorParams): TradeExecutor {
  return {
    async execute({
      to,
      data,
      value,
      chainId,
      rpcUrl,
      display,
    }): Promise<TradeExecutionResult> {
      const amountEntry = display?.amount;
      const signParams: SignAndSendMeritTransactionParams = {
        baseUrl: params.baseUrl,
        chainId,
        rpcUrl: rpcUrl || params.rpcUrl,
        from: '', // filled below from account context
        to,
        data,
        value: value !== undefined ? BigInt(value).toString() : undefined,
        title: display?.title ?? display?.label ?? 'Transaction',
        message: display?.label,
        contractAddress: display?.contractAddress,
        accounts: display?.accounts as PendingSignRequestAccountEntry[] | undefined,
        tokens: display?.tokens as PendingSignRequestTokenEntry[] | undefined,
        amount: amountEntry ? { label: amountEntry.label, value: amountEntry.value } : undefined,
      };

      const result = await signAndSendMeritTransaction(signParams);

      if (!result.ok) {
        throw new Error(result.message);
      }

      return {
        transactionHash: result.hash,
        receipt: result.receipt,
      };
    },

    async call(): Promise<string> {
      // Extension-side eth_call is intentionally skipped — the extension has
      // no cross-origin RPC relay for read operations. The portable
      // executeErc20Approve/executeUniswapV3Swap modules catch this and
      // proceed with the approve transaction anyway (allowance reads as 0
      // → always submits approve). A future RPC relay can fill in the real
      // eth_call here.
      return '';
    },
  };
}

/**
 * Builds a full TradeExecutorContext for the extension, including the
 * current account state. The extension pulls the active account address
 * and connection state from sidepanel.ts's walletSource state.
 */
export function buildMeritTradeExecutorContext(
  executorParams: MeritTradeExecutorParams,
  account: TradeExecutorAccount,
): TradeExecutorContext {
  return {
    account,
    executor: createMeritTradeExecutor(executorParams),
  };
}
