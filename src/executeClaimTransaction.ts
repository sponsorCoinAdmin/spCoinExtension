// File: src/executeClaimTransaction.ts
// Extension-side claim execution: the shared executeClaimTransactionCore (@sponsorcoin/spcoin-onchain: the claimOnChain* ABI, the calldata and the confirmation copy) with the extension's TradeExecutor, which the vault
// signs locally behind the confirmation screen (tradeExecutorMerit.ts, meritSign.ts). This file only builds that context.
import type { Abi } from 'viem';
import { executeClaimTransactionCore, CLAIM_METHODS, SPOIN_CLAIM_ABI, type ClaimMethod, type ExecuteClaimTransactionResult } from '@sponsorcoin/spcoin-onchain';
import type { TradeExecutorContext, TradeExecutorAccount } from '@sponsorcoin/spcoin-exchange-engine';
import { buildMeritTradeExecutorContext } from './tradeExecutorMerit';

export { CLAIM_METHODS, SPOIN_CLAIM_ABI };
export type { ClaimMethod, ExecuteClaimTransactionResult };

export interface ExecuteClaimTransactionParams {
  baseUrl: string;
  rpcUrl: string;
  /** The accountAddress whose rewards are being claimed. */
  accountKey: string;
  /** Which claimOnChain* method to invoke. */
  method: ClaimMethod;
  /** spCoin contract ABI (default: the claim slice). */
  abi?: Abi;
  contractAddress: string;
  chainId: number;
  /** The signer address (from sidepanel.ts's walletSource state). */
  fromAddress: string;
  /** Optional unlock token for locked accounts (same pattern as stake send). */
  unlockToken?: string;
  /** Called after the transaction confirms (cache refresh / re-fetch). */
  onConfirmed?: () => void | Promise<void>;
}

export async function executeClaimTransaction({ baseUrl, rpcUrl, accountKey, method, abi, contractAddress, chainId, fromAddress, onConfirmed }: ExecuteClaimTransactionParams): Promise<ExecuteClaimTransactionResult> {
  const context: TradeExecutorContext = buildMeritTradeExecutorContext({ baseUrl, rpcUrl }, { address: fromAddress, isConnected: Boolean(fromAddress), chainId } as TradeExecutorAccount);
  return executeClaimTransactionCore({ accountKey, method, contractAddress, chainId, rpcUrl, fromAddress, context, abi, onConfirmed });
}
