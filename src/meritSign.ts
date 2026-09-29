// File: src/meritSign.ts
//
// 2026-09-22, Phase B.2 Stage 4.d follow-up ("build the extension-side
// signer wrapper"). Base-URL-parameterized counterpart to the web app's
// components/wallet/lib/meritConnect/MeritServerSigner.ts's own postSign —
// same request/response contract against app/api/spCoin/meritConnect/sign
// (now cross-origin-trusted for this extension's pinned origin, this
// stage's own earlier route change), reusing sidepanel.ts's plain
// `fetch(`${baseUrl}/...`)` convention (spcoin-feeds's own pattern)
// instead of MeritServerSigner's bare relative fetch, which can't resolve
// correctly from a chrome-extension:// origin.
//
// Deliberately NOT a full ethers.AbstractSigner class like
// MeritServerSigner — that class exists to be a drop-in Signer for
// arbitrary ethers.Contract calls across ~12 real web-app call sites
// (Uniswap swap/stake/send/etc., see docs/npmMigrationDesign.md's Stage
// 25 inventory). None of those flows exist in the extension yet — no
// swap/stake/send UI has been built here — so there is no real {to, data,
// value} a caller could hand this today. Building a generic Signer class
// with zero real callers would be speculative; this file instead exposes
// the one real, complete, callable capability that IS ready: a function
// that gates a transaction through the real approval UI
// (pendingSignRequestStore.ts, Stage 4.c) and then actually signs+sends it
// through the real, now-cross-origin-trusted route — genuinely usable the
// moment a real trade-execution flow exists to call it, without needing
// its own shape to change.
//
// rpcUrl is a required parameter, not resolved internally — checked
// directly before writing this: LiteExchangeProvider's default boot
// context has rpcUrl: '' (liteProvider.tsx), deliberately never populated
// (Stage 13.a's own scope cut — "not needed yet"). No real Hardhat RPC URL
// source exists in the extension today; inventing one here would be
// speculative network configuration, not signer-wrapper work. Whatever
// future caller has a real transaction to send will also need to resolve
// this from somewhere real first.

import {
  approvePendingSignRequest,
  clearPendingSignRequest,
  rejectPendingSignRequest,
  requestSignApproval,
  type PendingSignRequestAccountEntry,
  type PendingSignRequestTokenEntry,
} from './pendingSignRequestStore';

/** Shape of app/api/spCoin/meritConnect/sign/route.ts's JSON response — mirrors MeritServerSigner.ts's own SignResponsePayload exactly. */
interface MeritSignResponsePayload {
  ok?: boolean;
  message?: string;
  hash?: string;
  locked?: boolean;
  receipt?: {
    to: string | null;
    from: string;
    contractAddress: string | null;
    hash: string;
    index: number;
    blockHash: string;
    blockNumber: number;
    gasUsed: string;
    cumulativeGasUsed: string;
    gasPrice: string;
    status: number | null;
    logs: {
      address: string;
      topics: string[];
      data: string;
      blockNumber: number;
      transactionHash: string;
      transactionIndex: number;
      blockHash: string;
      index: number;
    }[];
  };
}

export interface MeritSignParams {
  baseUrl: string;
  chainId: number;
  rpcUrl: string;
  from: string;
  to: string;
  data?: string;
  value?: string;
  /** Required for encrypted (isLocked) accounts — the token minted by unlockMeritWalletAccount (sidepanel.ts). */
  unlockToken?: string;
}

export type MeritSignResult =
  | { ok: true; hash: string; receipt: NonNullable<MeritSignResponsePayload['receipt']> }
  | { ok: false; message: string; locked?: boolean };

/**
 * The real POST — no approval gate, no retry logic. Callers that need the
 * approval gate should use signAndSendMeritTransaction below instead; this
 * is exposed separately for a future reauthentication-recovery wrapper
 * (MeritServerSigner.ts's own sendTransaction has one — not built here,
 * since there's no real caller yet to know its exact retry shape against).
 */
export async function postMeritSign(params: MeritSignParams): Promise<MeritSignResult> {
  try {
    const response = await fetch(`${params.baseUrl}/api/spCoin/meritConnect/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chainId: params.chainId,
        rpcUrl: params.rpcUrl,
        from: params.from,
        to: params.to,
        data: params.data ?? '0x',
        ...(params.value ? { value: params.value } : {}),
        ...(params.unlockToken ? { unlockToken: params.unlockToken } : {}),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as MeritSignResponsePayload;
    if (!response.ok || !payload.ok || !payload.receipt || !payload.hash) {
      return { ok: false, message: payload.message || `Merit server-side signing failed (${response.status}).`, locked: payload.locked };
    }
    return { ok: true, hash: payload.hash, receipt: payload.receipt };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export interface SignAndSendMeritTransactionParams extends MeritSignParams {
  /** Confirmation-screen copy — same fields TransactionConfirmPanel takes. */
  title: string;
  message?: string;
  accounts?: PendingSignRequestAccountEntry[];
  tokens?: PendingSignRequestTokenEntry[];
  amount?: { label: string; value: string };
  contractAddress?: string;
}

/**
 * The real, complete, end-to-end pipeline: shows the always-explicit
 * TransactionConfirmPanel gate (Stage 4.c), and only on Approve actually
 * POSTs to the now-cross-origin-trusted /sign route (Stage 4.d). Rejecting
 * resolves false without ever calling the network. Clears the pending
 * request once the write settles, success or failure, same division of
 * responsibility as the web app's own MeritApprovalOrchestrator.tsx/
 * clearSettledMeritApproval.
 *
 * No current caller — no real trade-execution UI exists in the extension
 * yet to construct a real {to, data, value, rpcUrl} payload. Genuinely
 * callable and complete regardless; a future swap/stake/send flow calls
 * this directly rather than needing its own approval-gating logic.
 */
export async function signAndSendMeritTransaction(
  params: SignAndSendMeritTransactionParams,
): Promise<MeritSignResult> {
  const approved = await requestSignApproval({
    title: params.title,
    message: params.message,
    signerAddress: params.from,
    chainId: params.chainId,
    contractAddress: params.contractAddress,
    accounts: params.accounts,
    tokens: params.tokens,
    amount: params.amount,
  });

  if (!approved) {
    return { ok: false, message: 'Rejected in the Merit Wallet confirmation screen.' };
  }

  // approvePendingSignRequest already flipped the store to busy=true — the
  // confirmation UI stays mounted showing "Signing…" through the POST
  // below. rejectPendingSignRequest already cleared the request on a
  // rejection above, so this path only ever runs after a real approval.
  const result = await postMeritSign(params);
  clearPendingSignRequest();
  return result;
}

// Re-exported so a caller that needs to build its own custom flow (rather
// than the bundled signAndSendMeritTransaction above) doesn't need a
// second import from pendingSignRequestStore directly.
export { approvePendingSignRequest, rejectPendingSignRequest, clearPendingSignRequest };
