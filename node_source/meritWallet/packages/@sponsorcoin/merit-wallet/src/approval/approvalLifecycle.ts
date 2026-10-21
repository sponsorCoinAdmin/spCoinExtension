// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/approval/approvalLifecycle.ts
//
// docs/meritMigration.txt row 28. What happens to a write-approval request around the wallet window, written once for every host (it was the web app's MeritApprovalOrchestrator): a NEW request opens the wallet; a request that has
// moved on to "settling" is cleared as soon as the message panel shows the outcome, or after SETTLING_FALLBACK_MS if no message panel ever does (a silent background push never opens it, so without the timer the wallet title stays
// on "Signing ..." for good). The store itself (request, subscribe, clear) is ./meritApproval; the host passes only how to open its wallet and whether its message panel is showing.
import { useEffect, useRef, useState } from 'react';
import { clearSettledMeritApproval, getPendingMeritApproval, subscribeMeritApproval, type MeritApprovalRequest } from './meritApproval';

/** How long a settled request may wait for a message panel before it is cleared anyway. */
export const SETTLING_FALLBACK_MS = 60_000;

/** True when a request that is settling has had its outcome shown, so it can be cleared now. */
export function shouldClearSettled(request: Pick<MeritApprovalRequest, 'phase'> | null | undefined, messagePanelVisible: boolean): boolean {
  return request?.phase === 'settling' && messagePanelVisible;
}

/** True when `request` is one the lifecycle has not yet seen (a different id from the previous one). */
export function isNewApprovalRequest(previousId: number | null, request: Pick<MeritApprovalRequest, 'id'> | null | undefined): boolean {
  return !!request && previousId !== request.id;
}

export interface ApprovalLifecycleHost {
  /** Opens (or raises) this host's wallet window for a new request. */
  openWallet(): void;
  /** Whether this host's message panel is showing right now. */
  messagePanelVisible: boolean;
}

/** Mount once per host. */
export function useMeritApprovalLifecycle({ openWallet, messagePanelVisible }: ApprovalLifecycleHost): void {
  const [request, setRequest] = useState<MeritApprovalRequest | null>(getPendingMeritApproval());
  const previousRequestIdRef = useRef<number | null>(request?.id ?? null);

  useEffect(() => subscribeMeritApproval(setRequest), []);

  // the outcome is on screen: the request is done
  useEffect(() => {
    if (shouldClearSettled(request, messagePanelVisible)) clearSettledMeritApproval();
  }, [request?.phase, messagePanelVisible]);

  // a settled request no message panel ever shows (a silent background push) is cleared after the fallback time
  useEffect(() => {
    if (request?.phase !== 'settling') return;
    const timer = setTimeout(() => clearSettledMeritApproval(), SETTLING_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [request?.phase, request?.id]);

  // a new request brings the wallet up
  useEffect(() => {
    if (!request) {
      previousRequestIdRef.current = null;
      return;
    }
    const isNew = isNewApprovalRequest(previousRequestIdRef.current, request);
    previousRequestIdRef.current = request.id;
    if (!isNew) return;
    openWallet();
  }, [request, openWallet]);
}
