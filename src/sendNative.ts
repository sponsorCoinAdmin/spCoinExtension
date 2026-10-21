// File: src/sendNative.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 13) -- the extension's send flow is now the shared one in @sponsorcoin/merit-wallet
// (executeSend: validation, amount-to-wei, native / ERC20 calldata). This file only supplies the two TRANSPORTS the extension has:
//   - LOCAL:  the vault in the background worker signs (merit/signing/*). The worker queues the request; the side panel shows the same
//             always-explicit confirmation screen as before and then tells the worker to approve or reject.
// (The LEGACY transport, the hosted app's server-side keystore, was removed with docs/meritMigration.txt row 36: the server refuses it for the extension.)
// (The hand-rolled ERC20 encoder and decimal parser that lived here are gone: the package owns them.)
import { executeSend, type SendOutcome, type SendRequest, type SendResult } from '@sponsorcoin/merit-wallet';
import { vaultUnavailableMessage, waitForReceipt } from './localSigning';
import { localVaultAuthenticator } from './localVaultAuthenticator';
import { authenticatorFor } from './externalAccounts';
import { rpcUrlForChain } from './chainRpc';

export interface SendNativeParams {
  chainId: number;
  rpcUrl: string;
  from: string;
  recipientAddress: string | undefined;
  tokenAddress: string | undefined;
  decimals: number | undefined;
  amount: string;
  tokenSymbol?: string;
  nativeSymbol: string;
  /** True when `from` is an account of the unlocked vault (or one MetaMask shared): it signs locally; any other account gets a clear message. */
  useVault?: boolean;
}

function confirmCopy(request: SendRequest) {
  return {
    title: request.title,
    signerAddress: request.from,
    chainId: request.chainId,
    contractAddress: request.tx.data === '0x' ? undefined : request.tx.to,
    amount: { label: 'Amount', value: request.amountLabel },
    accounts: [{ role: 'RECIPIENT', address: request.recipientAddress }],
  };
}

/** LOCAL transport: the worker queues, the side panel confirms (src/localSigning.ts); for an account MetaMask shared with the extension, MetaMask asks in its own window (src/metamaskAuthenticator.ts). */
const localTransport = async (request: SendRequest): Promise<SendOutcome> => {
  const copy = confirmCopy(request);
  const { hash } = await (await authenticatorFor(request.from, localVaultAuthenticator)).sendTransaction({
    from: request.from,
    to: request.tx.to,
    data: request.tx.data,
    value: request.tx.value === undefined ? undefined : BigInt(request.tx.value),
    chainId: request.chainId,
    display: { title: copy.title, contractAddress: copy.contractAddress, accounts: copy.accounts, amount: copy.amount },
  });
  // Wait for the block so the result card can say "confirmed" with block / gas, as the web app's send does.
  const rpcUrl = rpcUrlForChain(request.chainId);
  const receipt = rpcUrl ? await waitForReceipt(rpcUrl, hash) : null;
  return { hash, receipt };
};

export async function sendNativeMerit(params: SendNativeParams): Promise<SendResult> {
  // an account that is not in the wallet cannot sign here: say so (the wallet is locked, or pick an account from the wallet)
  const notInWallet = async (): Promise<SendOutcome> => { throw new Error(await vaultUnavailableMessage()); };
  return executeSend(
    {
      recipientAddress: params.recipientAddress,
      tokenAddress: params.tokenAddress,
      decimals: params.decimals,
      amount: params.amount,
      from: params.from,
      chainId: params.chainId,
      nativeSymbol: params.nativeSymbol,
      tokenSymbol: params.tokenSymbol,
    },
    params.useVault ? localTransport : notInWallet,
  );
}
