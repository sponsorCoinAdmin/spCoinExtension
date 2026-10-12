let nextId = 1;
let currentRequest = null;
/** Resolves requestMeritWriteApproval's promise — Reject/Approve. */
let currentDecideResolve = null;
const listeners = new Set();
function notify() {
    listeners.forEach((listener) => listener(currentRequest));
}
/** Component-facing subscription — AuthTransactionPanel.tsx wraps this in a hook. */
export function subscribeMeritApproval(listener) {
    listeners.add(listener);
    listener(currentRequest);
    return () => {
        listeners.delete(listener);
    };
}
export function getPendingMeritApproval() {
    return currentRequest;
}
/**
 * The write-approval phase machine, one continuous request/panel from open
 * to settled result:
 *
 *   requestMeritWriteApproval() -- phase 'decide'   -- auto-resolves on open
 *           |  resolveMeritApproval(true)
 *           v
 *   (caller signs + sends)      -- phase 'settling' -- spinner, no buttons
 *           |  clearSettledMeritApproval() (called once MESSAGE_PANEL
 *           |  reports the real outcome — see MeritApprovalOrchestrator.tsx)
 *           v
 *          done
 *
 * Rejects if a DIFFERENT request is already pending — one write awaiting a
 * decision at a time is already the shape the UI this gates assumes; a
 * caller hitting that is a real bug (two concurrent Merit writes), not a
 * case to silently serialize.
 *
 * ONE exception (2026-09-07, see MeritApprovalRequest.background's own doc
 * comment): a real (non-background) request preempts a background one
 * currently holding the slot instead of rejecting — a silent sync push has
 * no UI depending on staying open, so bumping it costs nothing, while
 * blocking the write the user is actually looking at behind it would be a
 * real, visible bug. Two background requests, or two real ones, still hit
 * the plain reject below exactly as before; only "real arrives while
 * background holds the slot" gets the preempt path.
 */
export function requestMeritWriteApproval(details) {
    if (currentRequest) {
        if (currentRequest.background && !details.background) {
            const preemptedResolve = currentDecideResolve;
            currentRequest = null;
            currentDecideResolve = null;
            // Let the preempted background caller's own promise settle (as
            // "not approved") rather than leaving it dangling forever — its
            // caller (ensureSyncToken.ts, via a fail-soft try/catch) already
            // treats a rejected/false approval as "skip this cycle, the next
            // real content change retries it." No-op if it was already past
            // 'decide' (settling has nothing left to resolve).
            preemptedResolve?.(false);
        }
        else {
            return Promise.reject(new Error('Another Merit Wallet approval is already pending.'));
        }
    }
    return new Promise((resolve) => {
        currentRequest = { ...details, id: nextId++, phase: 'decide' };
        currentDecideResolve = resolve;
        notify();
    });
}
/**
 * Called by AuthTransactionPanel's own auto-approve effect (or, when
 * `isLocked`, by PasswordConfirmModal's onConfirm once the wallet password
 * checks out).
 *
 * Reject: resolves false and clears the request immediately — nothing left
 * to wait for.
 *
 * Approve: resolves true so the caller (getConnectedSigner) can go build and
 * send the actual write, but deliberately does NOT clear currentRequest —
 * it's advanced to `phase: 'settling'` and kept around instead. Clearing it
 * here would let MeritApprovalOrchestrator's own effect close AUTH_TRANSACTION on
 * the spot, exposing whatever panel was underneath (e.g. the Swap tab) for
 * the entire window between "approved" and "the write actually finished" —
 * confusing, since nothing on screen indicates a signed write is still in
 * flight. Callers see this via `request.phase === 'settling'` and render a
 * spinner instead (AuthTransactionPanel.tsx). clearSettledMeritApproval
 * below is what actually clears it, once MESSAGE_PANEL reports the real
 * outcome.
 */
export function resolveMeritApproval(approved) {
    if (!currentDecideResolve)
        return;
    const resolve = currentDecideResolve;
    currentDecideResolve = null;
    if (!approved) {
        currentRequest = null;
        notify();
        resolve(false);
        return;
    }
    currentRequest = currentRequest ? { ...currentRequest, phase: 'settling' } : null;
    notify();
    resolve(true);
}
/**
 * Re-opens the CURRENT `settling` request back into `decide` with
 * `isLocked: true` — the recovery path for when the server rejects a
 * write's cached unlock token as expired/locked (e.g. its in-memory unlock
 * session cache was cleared by a server restart, but the client's own
 * sessionStorage token cache — a separate, longer-lived client-side cache,
 * see unlockSession.ts's own doc comment — still believed it was valid).
 * MeritServerSigner.sendTransaction calls this instead of just throwing on
 * that specific failure, so the SAME ProcessFlowPanel/PasswordConfirmModal
 * flow that gates a fresh write also recovers a stale one mid-flight —
 * "wrong/expired password" surfaces as a password prompt again, not a raw
 * MESSAGE_PANEL error. Found live 2026-08-27: a stake failed outright with
 * "<address> is locked. Unlock it with your password first." after several
 * dev-server restarts during the same session — the server's unlock cache
 * doesn't survive a restart, the client's did.
 *
 * Reuses resolveMeritApproval's own approve/reject paths unchanged (this
 * only replaces how the promise/phase get set up, not how they resolve) —
 * ProcessFlowPanel.tsx and PasswordConfirmModal need no changes to support
 * this; they already handle any `decide` + `isLocked` request correctly.
 *
 * No-op (resolves false immediately) if there's no current request to
 * reopen — defensive; in practice this is only ever called from inside an
 * in-flight write's own sendTransaction, while its request is still sitting
 * in `settling`.
 */
export function requestReauthentication() {
    if (!currentRequest)
        return Promise.resolve(false);
    return new Promise((resolve) => {
        currentRequest = { ...currentRequest, phase: 'decide', isLocked: true };
        currentDecideResolve = resolve;
        notify();
    });
}
/**
 * Clears a `settling` request once its write has actually reported an
 * outcome — called by MeritApprovalOrchestrator when MESSAGE_PANEL becomes visible
 * while a request is settling (see resolveMeritApproval's own doc comment).
 * No-op if nothing is pending, or if the pending request hasn't reached
 * `settling` yet (still mid-decide) — only ever tears down a settling one.
 */
export function clearSettledMeritApproval() {
    if (currentRequest?.phase !== 'settling')
        return;
    currentRequest = null;
    notify();
}
