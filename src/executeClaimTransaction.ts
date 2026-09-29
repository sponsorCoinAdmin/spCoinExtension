// File: src/executeClaimTransaction.ts
// Extension-side claim execution (2026-09-27, Phase C).
//
// Thin wrapper that builds claim calldata via viem encodeFunctionData and
// sends through the extension's TradeExecutor (meritSign.ts) pipeline — the
// same pattern as executeStakeTransaction.ts, adapted for the single-address
// argument shape of RewardsManager.sol's claimOnChain* methods:
//   claimOnChainTotalRewards(address  _sourceKey)
//   claimOnChainSponsorRewards(address _sourceKey)
//   claimOnChainAgentRewards(address   _sourceKey)
//   claimOnChainRecipientRewards(address _sourceKey)
//
// This is the extension counterpart to the web app's server-side
// /api/spCoin/run-script spcoin_write handler (route.ts:1845+), which resolves
// a Hardhat signer, calls the same Solidity methods via spCoinAccess modules,
// and returns a receipt. The extension can't use that same-origin-only write
// route (it's cross-origin), so it builds the calldata itself and sends via
// the extension's own meritSign POST path to /api/spCoin/meritConnect/sign
// (now cross-origin-trusted for this extension's pinned origin).

import type { Abi } from 'viem';
import { encodeFunctionData, parseAbi } from 'viem';
import type { TradeExecutorContext, TradeExecutorAccount, TradeExecutionResult } from '@sponsorcoin/spcoin-exchange-engine';
import { buildMeritTradeExecutorContext } from './tradeExecutorMerit';

export const CLAIM_METHODS = [
  'claimOnChainTotalRewards',
  'claimOnChainSponsorRewards',
  'claimOnChainAgentRewards',
  'claimOnChainRecipientRewards',
] as const;

export type ClaimMethod = (typeof CLAIM_METHODS)[number];

export const SPOIN_CLAIM_ABI = parseAbi([
  'function claimOnChainTotalRewards(address _sourceKey) external returns (uint256 lastSponsorUpdateTimeStamp, uint256 lastRecipientUpdateTimeStamp, uint256 sponsorRewards, uint256 recipientRewards)',
  'function claimOnChainSponsorRewards(address _sourceKey) external returns (uint256 lastSponsorUpdateTimeStamp, uint256 sponsorRewards)',
  'function claimOnChainAgentRewards(address _sourceKey) external returns (uint256 lastAgentUpdateTimeStamp, uint256 agentRewards)',
  'function claimOnChainRecipientRewards(address _sourceKey) external returns (uint256 lastRecipientUpdateTimeStamp, uint256 recipientRewards)',
]) as Abi;

export type { TradeExecutionResult };

export interface ExecuteClaimTransactionParams {
  baseUrl: string;
  rpcUrl: string;
  /** The accountAddress whose rewards are being claimed. */
  accountKey: string;
  /** Which claimOnChain* method to invoke. */
  method: ClaimMethod;
  /** spCoin contract ABI — viem-compatible Abi for encodeFunctionData. */
  abi: Abi;
  /** spCoin contract address (where the claimOnChain* methods live). */
  contractAddress: string;
  chainId: number;
  /** The signer address (from sidepanel.ts's walletSource state). */
  fromAddress: string;
  /** Optional unlock token for locked accounts (same pattern as stake send). */
  unlockToken?: string;
  /** Called after the transaction confirms — hook for cache refresh / re-fetch. */
  onConfirmed?: () => void | Promise<void>;
}

export interface ExecuteClaimTransactionResult extends TradeExecutionResult {
  /** The contract method invoked. */
  methodName: string;
}

export async function executeClaimTransaction({
  baseUrl,
  rpcUrl,
  accountKey,
  method,
  abi,
  contractAddress,
  chainId,
  fromAddress,
  unlockToken,
  onConfirmed,
}: ExecuteClaimTransactionParams): Promise<ExecuteClaimTransactionResult> {
  if (!accountKey) {
    throw new Error('No active account selected to claim rewards for.');
  }
  if (!fromAddress) {
    throw new Error('Select and activate an account first.');
  }

  const context: TradeExecutorContext = buildMeritTradeExecutorContext(
    { baseUrl, rpcUrl },
    { address: fromAddress, isConnected: Boolean(fromAddress), chainId } as TradeExecutorAccount,
  );

  const calldata = encodeFunctionData({
    abi,
    functionName: method,
    args: [accountKey as `0x${string}`],
  });

  const result = await context.executor.execute({
    to: contractAddress,
    data: calldata,
    chainId,
    rpcUrl,
    display: {
      label: method,
      contractAddress,
      title: 'Claim Rewards',
      skipMandatoryApprovalGate: true,
      amount: {
        label: 'Claim spCoin',
        value: '0',
      },
    },
  });

  await onConfirmed?.();

  return {
    transactionHash: result.transactionHash,
    receipt: result.receipt,
    methodName: method,
  };
}
