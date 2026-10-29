import { engineTrace } from '@sponsorcoin/spcoin-exchange-engine';
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
    // 2026-10-28 (owner report, live: a SPONSOR flow's Swap step was rejected
    // with "Another Merit Wallet approval is already pending" seconds after
    // its own Approve step had already fully confirmed) — root cause: a
    // request in `settling` phase already has NOTHING pending on it.
    // currentDecideResolve is set to null the moment resolveMeritApproval
    // moves a request from 'decide' to 'settling' (see that function, just
    // above) — 'settling' only exists so MeritApprovalOrchestrator/
    // approvalLifecycle.ts knows when to stop showing "Signing..." UI for
    // the write that already finished, a DISPLAY concern, not a "protect an
    // undecided write" concern. The old code blocked a brand-new request on
    // that same no-longer-meaningful slot regardless of phase — correct for
    // 'decide' (a real, unresolved choice in flight), wrong for 'settling'
    // (already decided; only waiting on its own UI cleanup, which a stale
    // MESSAGE_PANEL-visibility race could delay well past when the NEXT
    // step's own write is ready to go, exactly what the trace showed). A
    // settling request is now transparently replaced, the same way an
    // already-established `background` request gets preempted below — the
    // only case that still genuinely blocks is a second REAL decision
    // arriving while a first is still mid-decide.
    if (currentRequest) {
        if (currentRequest.phase === 'settling') {
            engineTrace?.('meritApproval:requestMeritWriteApproval:supersedeSettled', { superseded: { id: currentRequest.id, label: currentRequest.label }, incoming: { label: details.label } });
            currentRequest = null;
        }
        else if (currentRequest.background && !details.background) {
            engineTrace?.('meritApproval:requestMeritWriteApproval:preemptBackground', { occupying: { id: currentRequest.id, label: currentRequest.label, phase: currentRequest.phase }, incoming: { label: details.label, background: details.background } });
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
            // 2026-10-28 — the occupying request's own details are now baked
            // into the thrown message itself (not just the trace above), so a
            // future recurrence is immediately diagnosable from the MESSAGE_PANEL
            // alone: which write got here first, and how it's blocking this one.
            engineTrace?.('meritApproval:requestMeritWriteApproval:rejected', { occupying: { id: currentRequest.id, label: currentRequest.label, signerAddress: currentRequest.signerAddress, phase: currentRequest.phase, background: currentRequest.background }, incoming: { label: details.label, signerAddress: details.signerAddress, background: details.background } });
            return Promise.reject(new Error(`Another Merit Wallet approval is already pending (id ${currentRequest.id}: "${currentRequest.label}", phase "${currentRequest.phase}", signer ${currentRequest.signerAddress}${currentRequest.background ? ', background' : ''}). This write ("${details.label}") cannot start until that one is decided.`));
        }
    }
    return new Promise((resolve) => {
        currentRequest = { ...details, id: nextId++, phase: 'decide' };
        // 2026-10-29, TEMP DIAGNOSTIC (on request — "see where this popup is
        // called and what are the conditions, dump the conditions") — isLocked/
        // needsApproval/chainId are the three fields that actually decide
        // whether ApprovalResponder shows a password field, and they were
        // missing from this line even though every caller (getConnectedSigner.ts,
        // browserVault.ts's createMeritApprovalBridge, StakeConfirmPopup.tsx)
        // funnels through here — this is the one place that answers it for ANY
        // caller, not just the one(s) already instrumented upstream. Remove once
        // this is root-caused.
        engineTrace?.('meritApproval:requestMeritWriteApproval:opened', { id: currentRequest.id, label: currentRequest.label, title: currentRequest.title, signerAddress: currentRequest.signerAddress, chainId: currentRequest.chainId, isLocked: currentRequest.isLocked, needsApproval: currentRequest.needsApproval, background: currentRequest.background });
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
        engineTrace?.('meritApproval:resolveMeritApproval:rejected', { id: currentRequest?.id, label: currentRequest?.label });
        currentRequest = null;
        notify();
        resolve(false);
        return;
    }
    currentRequest = currentRequest ? { ...currentRequest, phase: 'settling' } : null;
    engineTrace?.('meritApproval:resolveMeritApproval:nowSettling', { id: currentRequest?.id, label: currentRequest?.label, atMs: Date.now() });
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
    if (currentRequest?.phase !== 'settling') {
        engineTrace?.('meritApproval:clearSettledMeritApproval:noop', { currentPhase: currentRequest?.phase ?? '(none)', atMs: Date.now() });
        return;
    }
    engineTrace?.('meritApproval:clearSettledMeritApproval:cleared', { id: currentRequest.id, label: currentRequest.label, atMs: Date.now() });
    currentRequest = null;
    notify();
}
