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
/** Component-facing subscription — AuthTransactionPanel.tsx wraps this in a hook. */
export declare function subscribeMeritApproval(listener: Listener): () => void;
export declare function getPendingMeritApproval(): MeritApprovalRequest | null;
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
export declare function requestMeritWriteApproval(details: Omit<MeritApprovalRequest, 'id' | 'phase'>): Promise<boolean>;
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
export declare function resolveMeritApproval(approved: boolean): void;
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
export declare function requestReauthentication(): Promise<boolean>;
/**
 * Clears a `settling` request once its write has actually reported an
 * outcome — called by MeritApprovalOrchestrator when MESSAGE_PANEL becomes visible
 * while a request is settling (see resolveMeritApproval's own doc comment).
 * No-op if nothing is pending, or if the pending request hasn't reached
 * `settling` yet (still mid-decide) — only ever tears down a settling one.
 */
export declare function clearSettledMeritApproval(): void;
export {};
