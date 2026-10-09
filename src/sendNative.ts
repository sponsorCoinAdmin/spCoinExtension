// File: src/sendNative.ts
//
// 2026-10-08 (docs/meritWalletNpmDesignToDo.txt, table row 13) -- the extension's send flow is now the shared one in @sponsorcoin/merit-wallet
// (executeSend: validation, amount-to-wei, native / ERC20 calldata). This file only supplies the two TRANSPORTS the extension has:
//   - LOCAL:  the vault in the background worker signs (merit/signing/*). The worker queues the request; the side panel shows the same
//             always-explicit confirmation screen as before and then tells the worker to approve or reject.
//   - LEGACY: the hosted app's server-side keystore (/api/spCoin/meritConnect/sign), used while the account is not one of the vault's.
// (The hand-rolled ERC20 encoder and decimal parser that lived here are gone: the package owns them.)
import { executeSend, type SendOutcome, type SendRequest, type SendResult } from '@sponsorcoin/merit-wallet';
import { signAndSendMeritTransaction } from './meritSign';
import { isLegacySigningAllowed, signWithVault, vaultUnavailableMessage, waitForReceipt } from './localSigning';
import { rpcUrlForChain } from './chainRpc';

export interface SendNativeParams {
  baseUrl: string;
  chainId: number;
  rpcUrl: string;
  from: string;
  recipientAddress: string | undefined;
  tokenAddress: string | undefined;
  decimals: number | undefined;
  amount: string;
  tokenSymbol?: string;
  nativeSymbol: string;
  unlockToken?: string;
  /** True when `from` is an account of the unlocked vault: sign locally instead of through the hosted app. */
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

/** LOCAL transport: the worker queues, the side panel confirms (src/localSigning.ts). */
const localTransport = async (request: SendRequest): Promise<SendOutcome> => {
  const { hash } = await signWithVault(
    { from: request.from, to: request.tx.to, data: request.tx.data, value: request.tx.value === undefined ? undefined : request.tx.value.toString(), chainId: request.chainId },
    confirmCopy(request),
  );
  // Wait for the block so the result card can say "confirmed" with block / gas, as the web app's send does.
  const rpcUrl = rpcUrlForChain(request.chainId);
  const receipt = rpcUrl ? await waitForReceipt(rpcUrl, hash) : null;
  return { hash, receipt };
};

export async function sendNativeMerit(params: SendNativeParams): Promise<SendResult> {
  const legacy = async (request: SendRequest): Promise<SendOutcome> => {
    if (!isLegacySigningAllowed()) throw new Error(await vaultUnavailableMessage());
    const result = await signAndSendMeritTransaction({
      baseUrl: params.baseUrl,
      rpcUrl: params.rpcUrl,
      from: request.from,
      to: request.tx.to,
      data: request.tx.data,
      value: request.tx.value === undefined ? undefined : request.tx.value.toString(),
      unlockToken: params.unlockToken,
      ...confirmCopy(request),
    });
    if (!result.ok) throw new Error(result.message);
    return { hash: result.hash, receipt: result.receipt };
  };
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
    params.useVault ? localTransport : legacy,
  );
}
