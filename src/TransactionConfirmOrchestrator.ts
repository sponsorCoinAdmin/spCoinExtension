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

import { createElement, useEffect, useState } from 'react';
import { TransactionConfirmPanel } from '@sponsorcoin/spcoin-panels';
import {
  approvePendingSignRequest,
  clearPendingSignRequest,
  getPendingSignRequest,
  isPendingSignRequestBusy,
  rejectPendingSignRequest,
  subscribePendingSignRequest,
  type PendingSignRequest,
} from './pendingSignRequestStore';

export function TransactionConfirmOrchestrator() {
  const [request, setRequest] = useState<PendingSignRequest | null>(getPendingSignRequest());
  const [busy, setBusy] = useState(isPendingSignRequestBusy());

  useEffect(
    () =>
      subscribePendingSignRequest((next) => {
        setRequest(next);
        setBusy(isPendingSignRequestBusy());
      }),
    [],
  );

  if (!request) return null;

  return createElement(TransactionConfirmPanel, {
    title: request.title,
    message: request.message,
    accounts: request.accounts,
    tokens: request.tokens,
    amount: request.amount,
    chainId: request.chainId,
    contractAddress: request.contractAddress,
    busy,
    onApprove: approvePendingSignRequest,
    // Reject clears the request outright (no write to wait on); Approve
    // leaves it mounted (busy) until whichever caller awaits
    // requestSignApproval's resolved promise eventually calls
    // clearPendingSignRequest once the real write settles — this
    // orchestrator itself never calls that, same "the caller that knows
    // when the write settled owns clearing it" division of responsibility
    // as MeritApprovalOrchestrator.tsx/clearSettledMeritApproval on the
    // web-app side.
    onReject: rejectPendingSignRequest,
  });
}

// Re-exported for whatever future caller eventually settles a request
// (success or failure) — kept alongside the orchestrator rather than
// requiring a second import from pendingSignRequestStore directly.
export { clearPendingSignRequest };
