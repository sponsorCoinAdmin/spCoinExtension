// File: node_source/meritWallet/packages/@sponsorcoin/merit-wallet/src/approval/meritApproval.ts
//
// A real approval gate for Merit-authorized writes. docs/design/
// accountAuthDesign.txt section 20 models Merit as a `Simple Key Pair` keyring — same
// category as MetaMask's simplest account type — and that keyring shape
// signs in-process with zero consent step by design (MetaMask's own
// approval popup lives in its *extension UI*, not in the keyring itself).
// Merit doesn't have that UI layer yet (that's docs/design/extensionPlan.txt's
// eventual scope), so this fills the gap at the application layer instead:
// a promise-based request/resolve primitive, gating `getSigner` at the
// call site rather than inside it.
//
// Deliberately NOT inside getSigner above — this file has zero
// React/UI dependency itself (same "singleton + listeners" shape as
// authSource.ts), keeping meritConnect's own "no UI dependency" rule intact
// (see accountAuthDesign.txt section 20's WalletConnect section on why that matters — it's
// what lets a second transport wrap this module later as a wrapper, not a
// rewrite). The actual rendered prompt lives outside meritConnect entirely,
// in components/views/RadioOverlayPanels/AuthTransactionPanel.tsx — this
// file only owns pending-request state and the promise that gates signing.
//
// Wired into getConnectedSigner.ts's merit branch — every Merit-authorized
// write app-wide goes through this (staking/sponsoring, the Send panel,
// revoke-agent-rate, Uniswap swap/pool creation, SponsorCoinLab).
//
// AuthTransactionPanel.tsx auto-resolves the `decide` phase the instant it
// opens (see its own doc comment) — this module still gates every write
// through a real request/promise, it just no longer waits on a click to
// resolve it. The one phase requiring a person: `isLocked` still opens a
// password prompt, since a password can't be auto-supplied.
//
// `tokens`/`amount`/`accounts` below are type-only imports from
// lib/structure — no runtime dependency, so the "no UI dependency" rule
// above still holds; they're just the shared display-data shapes
// MESSAGE_PANEL's own rows use (see MessageTokenEntry/MessageAmountEntry/
// MessageAccountEntry's own doc comments), so a caller can hand this file
// the same data it would hand an error/success message without inventing a
// parallel shape.
import type { MessageTokenEntry, MessageAmountEntry, MessageAccountEntry } from '@sponsorcoin/spcoin-common/context';

export type MeritApprovalPhase = 'decide' | 'settling';

export interface MeritApprovalRequest {
  id: number;
  label: string;
  signerAddress: string;
  chainId: number;
  contractAddress?: string;
  /**
   * The inverse of provider.ts's securityApproved(chainId, signerAddress) —
   * what that check actually means depends on the current
   * MeritWalletPasswordMode (see meritWalletStorage.ts's doc comment): under
   * 'disabled' this is always false; under 'appRequired' it's false once the
   * one shared wallet password has been entered this session, regardless of
   * this specific account's own state; under 'methodRequired' it's the real
   * per-account encrypted-and-not-yet-unlocked check (isAccountLocked).
   * Drives AuthTransactionPanel.tsx's password prompt — the one case its
   * auto-approve can't skip, since a password can't be auto-supplied.
   */
  isLocked?: boolean;
  /**
   * The "Mandatory Approval Required" checkbox (provider.ts's
   * isApprovalRequired(), MeritWalletConfig.mandatoryApproval) as it stood
   * the moment this request opened — when true, ProcessFlowPanel.tsx's
   * 'decide' phase does NOT auto-resolve after DECIDE_PHASE_MIN_VISIBLE_MS;
   * it instead shows the same PasswordConfirmModal component in its
   * `mode="approval"` display (Approve/Reject buttons, no password field)
   * and waits for an explicit click, same resolveMeritApproval(true/false)
   * either way. Independent of `isLocked` — a request can need approval,
   * a password, both, or neither; isLocked's password modal is checked
   * first (see the effect's own comment), approval second.
   */
  needsApproval?: boolean;
  /**
   * Optional token identities (logo.png + label/symbol/name) shown on the
   * approval prompt — same MessageTokenEntry shape MESSAGE_PANEL's own
   * tokens[] rows use, the standardized way any panel shows "this token"
   * identity info. Threaded through from getConnectedSigner.ts's own
   * `tokens` param.
   */
  tokens?: MessageTokenEntry[];
  /** Optional prominent amount line, same MessageAmountEntry shape as MESSAGE_PANEL's own `amount`. */
  amount?: MessageAmountEntry;
  /**
   * Optional extra identity rows (e.g. SPONSOR/RECIPIENT/AGENT for a stake) —
   * same MessageAccountEntry[] shape MESSAGE_PANEL's own accounts[] rows use.
   * Purely display; omit when the signer row alone says enough (most callers).
   */
  accounts?: MessageAccountEntry[];
  /**
   * Which stage of the request this is — drives AuthTransactionPanel.tsx's
   * rendering (title, body). See requestMeritWriteApproval's own doc
   * comment for the full phase machine this steps through.
   */
  phase: MeritApprovalPhase;
  /**
   * Overrides the panel's own title (e.g. "Staking New Sponsorship" instead
   * of the default "Approve <label>", label here usually being the raw
   * contract method name like "sponsorAgentTransaction") — read by
   * useActiveWalletPanelTitle.tsx for the PANEL_TITLE strip above the
   * Swap/Send/Sponsor/Rewards/Config tabs. The password-required popup that
   * can appear mid-decide always uses the literal `Approve <label>` form
   * regardless of this override — see AuthTransactionPanel.tsx.
   */
  title?: string;
  /**
   * TEMP DEBUG (2026-08-29) — see lib/spCoin/debugManualAdvanceGate.ts's own
   * doc comment. When true, ProcessFlowPanel.tsx's decide phase waits for an
   * explicit click instead of auto-resolving after
   * DECIDE_PHASE_MIN_VISIBLE_MS. Set only by getConnectedSigner.ts's own
   * `manualAdvanceDebug` param, itself only ever passed by
   * swap.tsx's doApprovePayToken. REMOVE alongside that whole gate file.
   */
  manualAdvance?: boolean;
  /**
   * 2026-09-07, on request ("i retried... Another Merit Wallet approval is
   * already pending") — found live: a real Uniswap swap collided with a
   * SILENT background cross-process sync push (activeTokens/showTestNets/
   * packageAccessManagers, all funneling through ensureSyncToken.ts) that
   * happened to grab this module's one-request-at-a-time slot moments
   * before the user's own retry. The user has no idea a background sync
   * is even in flight — there's no UI for it — so it winning the race and
   * blocking a write the user is actively looking at is never correct
   * priority. Only ensureSyncToken.ts's mint sets this true (via
   * getConnectedSigner.ts's own `background` param); every real write
   * (Uniswap swap, stake, sponsor, Send...) leaves it undefined/false.
   * See requestMeritWriteApproval's own doc comment for what this actually
   * changes (a real write may preempt a background one holding the slot;
   * two background requests, or two real ones, still queue/reject exactly
   * as before).
   */
  background?: boolean;
}

type Listener = (request: MeritApprovalRequest | null) => void;

let nextId = 1;
let currentRequest: MeritApprovalRequest | null = null;
/** Resolves requestMeritWriteApproval's promise — Reject/Approve. */
let currentDecideResolve: ((approved: boolean) => void) | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener(currentRequest));
}

/** Component-facing subscription — AuthTransactionPanel.tsx wraps this in a hook. */
export function subscribeMeritApproval(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentRequest);
  return () => {
    listeners.delete(listener);
  };
}

export function getPendingMeritApproval(): MeritApprovalRequest | null {
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
export function requestMeritWriteApproval(
  details: Omit<MeritApprovalRequest, 'id' | 'phase'>,
): Promise<boolean> {
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
    } else {
      return Promise.reject(new Error('Another Merit Wallet approval is already pending.'));
    }
  }
  return new Promise<boolean>((resolve) => {
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
export function resolveMeritApproval(approved: boolean) {
  if (!currentDecideResolve) return;
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
export function requestReauthentication(): Promise<boolean> {
  if (!currentRequest) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    currentRequest = { ...currentRequest!, phase: 'decide', isLocked: true };
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
  if (currentRequest?.phase !== 'settling') return;
  currentRequest = null;
  notify();
}
