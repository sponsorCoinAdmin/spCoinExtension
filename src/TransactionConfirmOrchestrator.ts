// File: src/TransactionConfirmOrchestrator.ts
//
// 2026-09-22, Phase B.2 Stage 4.c. Subscribes to pendingSignRequestStore.ts
// and renders the portable, always-explicit TransactionConfirmPanel
// (@sponsorcoin/spcoin-panels) whenever a request is pending — same "plain
// .ts + React.createElement, no JSX" convention as hydrateActiveAccount.ts,
// since this repo has no JSX transform configured for its own src/ files.
//
// No real producer wires into pendingSignRequestStore yet (Stage 4.b's
// server-side allowlist isn't implemented, Stage 4.d hasn't extended
// cross-origin trust to `sign`) — mounted now so the UI is a real, ready
// capability the moment that wiring lands, same "contract before
// implementation" discipline as every other Phase B.2 stage.

import { createElement } from 'react';
import { TransactionConfirmPanel } from '@sponsorcoin/spcoin-panels';
import {
  approvePendingSignRequest,
  clearPendingSignRequest,
  getPendingSignRequest,
  isPendingSignRequestBusy,
  rejectPendingSignRequest,
} from './pendingSignRequestStore';

// 2026-11-03 (owner request): the confirmation is VALIDATE_REMOTE_CONNECT, a page inside the wallet's own chrome (MeritWallet's approvalPage: header, title bar, tabs), no longer a full-screen cover.
// This builds that page for the request that is pending, or undefined when none is. The title bar says what kind of request it is; the page itself carries the full text.
export function buildApprovalPage(): { title: string; element: ReturnType<typeof createElement>; onCancel: () => void } | undefined {
  const request = getPendingSignRequest();
  if (!request) return undefined;
  const title = request.title.startsWith('Connect') ? 'Connect Request' : request.title.startsWith('Transaction') ? 'Transaction Request' : request.title.startsWith('Signature') ? 'Signature Request' : 'Approval Request';
  // the connect page does not repeat the account and the chain: they are in the wallet's header right above it
  const isConnect = request.title.startsWith('Connect');
  const element = createElement(TransactionConfirmPanel, {
    title: request.title,
    message: request.message,
    accounts: isConnect ? undefined : request.accounts,
    tokens: request.tokens,
    amount: request.amount,
    chainId: isConnect || !request.chainId ? undefined : request.chainId,
    contractAddress: request.contractAddress,
    busy: isPendingSignRequestBusy(),
    approveLabel: request.approveLabel,
    rejectLabel: request.rejectLabel,
    embedded: true,
    onApprove: approvePendingSignRequest,
    // Reject clears the request outright (no write to wait on); Approve leaves it mounted (busy) until whichever caller awaits requestSignApproval's resolved promise eventually calls clearPendingSignRequest once the write settles
    onReject: rejectPendingSignRequest,
  });
  return { title, element, onCancel: rejectPendingSignRequest };
}

// Re-exported for whatever future caller eventually settles a request
// (success or failure) — kept alongside the orchestrator rather than
// requiring a second import from pendingSignRequestStore directly.
export { clearPendingSignRequest };
