// File: src/executeStakeTransaction.ts
// Extension-side stake execution (2026-09-26, Phase 4).
//
// Thin wrapper around the portable executeStakeTransactionCore from
// @sponsorcoin/spcoin-onchain (re-exported via @sponsorcoin/spcoin-exchange-engine),
// wiring the extension's TradeExecutor (meritSign.ts) + runSpCoinReadStep.
// This is the extension counterpart to the web app's
// lib/spCoin/executeStakeTransactionCore.ts.

import type { Abi } from 'viem';
import { parseAbi } from 'viem';
import { executeStakeTransactionCore, type ExecuteStakeTransactionResult, type RunScriptParams } from '@sponsorcoin/spcoin-onchain';
import type { TradeExecutorContext, TradeExecutorAccount } from '@sponsorcoin/spcoin-exchange-engine';
import { buildMeritTradeExecutorContext } from './tradeExecutorMerit';
import { runSpCoinReadStep } from './runSpCoinReadStep';
import type { PendingSignRequestAccountEntry } from './pendingSignRequestStore';

/** Minimal spCoin contract ABI — only the functions needed for stake execution.
 *  Used by encodeFunctionData in the portable onchain module. The full runtime
 *  ABI is loaded dynamically by the web app via ensureSpCoinLabAbiLoaded +
 *  getSpCoinLabAbi(); the extension has no equivalent loader yet, so this
 *  static slice covers the two stake methods + the two rate-increment reads
 *  executeStakeTransactionCore calls via readStep.
 */
export const SPOIN_STAKE_ABI = parseAbi([
  'function sponsorAgentTransaction(string _recipientKey, string _recipientRateKey, string _accountAgentKey, string _agentRateKey, uint256 _amount) external',
  'function sponsorRecipientTransaction(string _recipientKey, string _recipientRateKey, uint256 _amount) external',
  'function getRecipientRateIncrement() view returns (uint256)',
  'function getAgentRateIncrement() view returns (uint256)',
]) as Abi;

export interface ExecuteStakeTransactionParams {
  baseUrl: string;
  rpcUrl: string;
  recipientKey: string;
  agentKey: string;
  amountRaw: bigint;
  desiredRecipientRateKey: number;
  desiredAgentRateKey: number;
  recipientRateRange: [number, number];
  agentRateRange: [number, number];
  /** spCoin contract ABI — viem-compatible Abi for encodeFunctionData. */
  abi: Abi;
  /** spCoin contract address (where sponsorAgentTransaction lives). */
  contractAddress: string;
  chainId: number;
  /** The signer address (from sidepanel.ts's walletSource state). */
  fromAddress: string;
  /** Account identity rows for the confirmation UI. */
  displayAccounts?: PendingSignRequestAccountEntry[];
  /** Called after the transaction confirms — hook for any state refresh. */
  onConfirmed?: () => void | Promise<void>;
}

export type { ExecuteStakeTransactionResult };

export async function executeStakeTransaction({
  baseUrl,
  rpcUrl,
  recipientKey,
  agentKey,
  amountRaw,
  desiredRecipientRateKey,
  desiredAgentRateKey,
  recipientRateRange,
  agentRateRange,
  abi,
  contractAddress,
  chainId,
  fromAddress,
  displayAccounts,
  onConfirmed,
}: ExecuteStakeTransactionParams): Promise<ExecuteStakeTransactionResult> {
  const readParams: RunScriptParams = {
    contractAddress,
    rpcUrl,
    accessSource: 'local',
    readMode: chainId === 31337 ? 'hardhat' : 'metamask',
  };

  const account: TradeExecutorAccount = {
    address: fromAddress,
    isConnected: Boolean(fromAddress),
    chainId,
  };

  const context: TradeExecutorContext = buildMeritTradeExecutorContext(
    { baseUrl, rpcUrl },
    account,
  );

  // Wrap runSpCoinReadStep to always supply the extension's baseUrl.
  const readStep = (params: RunScriptParams, method: string, args?: { key: string; value: string }[]) =>
    runSpCoinReadStep(params, method, args, baseUrl);

  return executeStakeTransactionCore({
    recipientKey,
    agentKey,
    amountRaw,
    desiredRecipientRateKey,
    desiredAgentRateKey,
    recipientRateRange,
    agentRateRange,
    readParams,
    abi,
    readStep,
    chainId,
    context,
    displayAccounts: displayAccounts as any,
    onConfirmed,
  });
}
