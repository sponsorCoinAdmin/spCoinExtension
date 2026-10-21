// File: src/tradeExecutorMerit.ts
// Extension's TradeExecutor implementation (2026-09-26, Phase 4).
//
// Signs through the vault / the authenticators (src/localVaultAuthenticator.ts), behind the confirmation screen. This is the
// production counterpart to the web app's tradeExecutorEthers.ts (ethers Signer path). (The hosted-app signing route it used to fall
// back to was removed with docs/meritMigration.txt row 36.)
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
import type { PendingSignRequestAccountEntry, PendingSignRequestTokenEntry } from './pendingSignRequestStore';
import { ethCall, isVaultAccount, vaultUnavailableMessage, waitForReceipt } from './localSigning';
import { localVaultAuthenticator } from './localVaultAuthenticator';
import { authenticatorFor, isExternalAccount } from './externalAccounts';

export interface MeritTradeExecutorParams {
  /** RPC URL: used when a call does not carry its own. */
  rpcUrl: string;
  /** 2026-10-08 (table row 14): the signing account. When it belongs to the unlocked vault, execute() signs locally in the worker (src/localSigning.ts). */
  from?: string;
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
      // LOCAL: an account of the unlocked vault signs in the background worker, behind the same confirmation screen.
      if (params.from && ((await isVaultAccount(params.from)) || (await isExternalAccount(params.from)))) {
        // the vault is an authenticator like any other (src/localVaultAuthenticator.ts): the request, and what its confirmation screen shows, go to it
        const { hash } = await (await authenticatorFor(params.from, localVaultAuthenticator)).sendTransaction({
          from: params.from,
          to,
          data,
          value: value !== undefined ? BigInt(value) : undefined,
          chainId,
          display: {
            title: display?.title ?? display?.label ?? 'Transaction',
            message: display?.label,
            contractAddress: display?.contractAddress,
            accounts: display?.accounts as PendingSignRequestAccountEntry[] | undefined,
            tokens: display?.tokens as PendingSignRequestTokenEntry[] | undefined,
            amount: amountEntry ? { label: amountEntry.label, value: amountEntry.value } : undefined,
          },
        });
        // Wait for the block so the caller can say "confirmed" (the web app's signer does the same) and show block / gas.
        const receipt = await waitForReceipt(rpcUrl || params.rpcUrl, hash);
        return { transactionHash: hash, receipt };
      }
      // an account that is not in the wallet cannot sign here
      throw new Error(await vaultUnavailableMessage());
    },

    async call({ to, data, rpcUrl }): Promise<string> {
      // LOCAL accounts read straight from the chain's RPC (allowances and the like).
      if (params.from && ((await isVaultAccount(params.from)) || (await isExternalAccount(params.from)))) return ethCall(rpcUrl || params.rpcUrl, to, data);
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
    executor: createMeritTradeExecutor({ ...executorParams, from: account.address }),
  };
}
