// File: src/standalone/standaloneSend.ts
//
// 2026-11-19 (docs/design/standAloneWalletInstall.txt) -- the stand-alone wallet's SEND: the shared executeSend (validation, amount to wei, native / ERC20 calldata) over the browser vault's authenticator. The transaction waits in the approval queue until
// the approval screen (useStandaloneApproval) approves it; then the vault signs and broadcasts, and this waits for the block so the result card can show it. It is the extension's sendNative.ts with a browser transport and no hosted app.
// Pure TypeScript (no React); testable under node with a fake authenticator.
import { createPublicClient, http } from 'viem';
import { executeSend, type SendOutcome, type SendRequest } from '../send/sendTransfer';
import { sendFailureToHostResult, sendOutcomeToHostResult } from '../receipt/transactionReceipts';
import type { HostTransactionResult } from '../receipt/transactionReceipts';
import type { Authenticator } from '../auth/authenticator';
import type { StandaloneChain } from './createStandaloneWallet';

export interface StandaloneSendParams {
  recipientAddress?: string;
  tokenAddress?: string;
  amount: string;
  decimals?: number;
  tokenSymbol?: string;
}

export interface StandaloneSendOptions {
  authenticator: Authenticator;
  chain: StandaloneChain;
  /** The active account's address (the sender); undefined while there is none. */
  from: () => string | undefined;
  /** The chain's coin symbol, for the confirmation text. */
  nativeSymbol: () => string;
  /** How long to wait for the block before reporting the hash without a receipt. */
  receiptTimeoutMs?: number;
  /** Test seam: wait for a receipt without a network. */
  waitForReceipt?: (rpcUrl: string, hash: string, timeoutMs: number) => Promise<SendOutcome['receipt']>;
}

async function viemWaitForReceipt(rpcUrl: string, hash: string, timeoutMs: number): Promise<SendOutcome['receipt']> {
  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    const receipt = await client.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: timeoutMs });
    return { blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed, status: receipt.status === 'success' ? 1 : 0 };
  } catch {
    // the transaction was sent; a slow or unreachable node only means no receipt card details
    return null;
  }
}

/** The send function for the wallet's Send tab (its onSendSubmit). */
export function createStandaloneSend(options: StandaloneSendOptions): (params: StandaloneSendParams) => Promise<HostTransactionResult> {
  const { authenticator, chain } = options;
  const wait = options.waitForReceipt ?? viemWaitForReceipt;
  return async (params) => {
    const from = options.from();
    if (!from) return { ok: false, message: 'Select and activate an account first.' };
    const transport = async (request: SendRequest): Promise<SendOutcome> => {
      const { hash } = await authenticator.sendTransaction({
        from: request.from,
        to: request.tx.to,
        data: request.tx.data,
        value: request.tx.value === undefined ? undefined : BigInt(request.tx.value),
        chainId: request.chainId,
        display: { title: request.title, contractAddress: request.tx.data === '0x' ? undefined : request.tx.to, accounts: [{ role: 'RECIPIENT', address: request.recipientAddress }], amount: { label: 'Amount', value: request.amountLabel } },
      });
      return { hash, receipt: await wait(chain.rpcUrl, hash, options.receiptTimeoutMs ?? 60_000) };
    };
    try {
      const result = await executeSend(
        {
          recipientAddress: params.recipientAddress,
          tokenAddress: params.tokenAddress,
          decimals: params.decimals,
          amount: params.amount,
          from,
          chainId: chain.chainId,
          nativeSymbol: options.nativeSymbol(),
          tokenSymbol: params.tokenSymbol,
        },
        transport,
      );
      return result.ok ? sendOutcomeToHostResult({ hash: result.hash, receipt: result.receipt as never }) : { ok: false, message: result.message };
    } catch (error) {
      return sendFailureToHostResult(error);
    }
  };
}
