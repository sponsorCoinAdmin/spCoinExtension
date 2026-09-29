// File: src/pendingSignRequestStore.ts
//
// 2026-09-22, Phase B.2 Stage 4.c — the extension-side counterpart to the
// web app's components/wallet/lib/meritConnect/approval.ts, but
// deliberately NOT a port of it. That file's real request shape carries an
// auto-approve state machine (phase: 'decide'|'settling', isLocked,
// needsApproval, manualAdvance) because the web app's own confirmation UI
// (ProcessFlowPanel.tsx) auto-approves by default — see that file's own
// 2026-08-20 doc comment. docs/npmMigrationDesign.md's Stage 25 already
// recorded the opposite decision for the extension (confirmed via
// AskUserQuestion): every write shows an explicit Approve/Reject gate,
// unconditionally — no locked/mandatory-approval branching needed, so
// there's no state machine to mirror, just a plain pending-request slot.
//
// This is the real, ready CONTRACT Phase B.2 Stage 4.d's future
// cross-origin `sign` wiring will call into once it exists (same
// "contract exists before implementation" discipline as
// exchangeContextContract.ts's own extension points) — nothing produces a
// real PendingSignRequest yet (Stage 4.b's server-side allowlist isn't
// implemented, Stage 4.d hasn't extended cross-origin trust to `sign`),
// so this store currently has zero real callers. Verified via type-check/
// build only, same as every other "contract, no consumer yet" stage.

export interface PendingSignRequestAccountEntry {
  role: string;
  address: string;
  symbol?: string;
  name?: string;
  logoURL?: string;
}

export interface PendingSignRequestTokenEntry {
  label: string;
  symbol?: string;
  name?: string;
  address?: string;
  logoURL?: string;
}

export interface PendingSignRequest {
  id: number;
  title: string;
  message?: string;
  signerAddress: string;
  chainId: number;
  contractAddress?: string;
  accounts?: PendingSignRequestAccountEntry[];
  tokens?: PendingSignRequestTokenEntry[];
  amount?: { label: string; value: string };
}

type Listener = (request: PendingSignRequest | null) => void;

let current: PendingSignRequest | null = null;
let busy = false;
let nextId = 1;
const listeners = new Set<Listener>();
let pendingResolve: ((approved: boolean) => void) | null = null;

function notify() {
  for (const listener of listeners) listener(current);
}

export function getPendingSignRequest(): PendingSignRequest | null {
  return current;
}

export function isPendingSignRequestBusy(): boolean {
  return busy;
}

export function subscribePendingSignRequest(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The real gating call a future cross-origin `sign` wrapper will await
 * (Stage 4.d, not built yet) — resolves `true` on Approve, `false` on
 * Reject. Only one request can be pending at a time, same "one at a time"
 * guard approval.ts's own requestMeritWriteApproval uses.
 */
export function requestSignApproval(
  request: Omit<PendingSignRequest, 'id'>,
): Promise<boolean> {
  if (current) {
    throw new Error('pendingSignRequestStore: a request is already pending');
  }
  return new Promise((resolve) => {
    current = { ...request, id: nextId++ };
    busy = false;
    pendingResolve = resolve;
    notify();
  });
}

/** Called by the confirmation UI's Approve button. Leaves the request mounted (busy: true) until clearPendingSignRequest is called once the real write settles. */
export function approvePendingSignRequest(): void {
  if (!current || !pendingResolve) return;
  busy = true;
  notify();
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve(true);
}

/** Called by the confirmation UI's Reject button — resolves false and clears immediately, no write to wait on. */
export function rejectPendingSignRequest(): void {
  if (!current || !pendingResolve) return;
  const resolve = pendingResolve;
  pendingResolve = null;
  current = null;
  busy = false;
  resolve(false);
  notify();
}

/** Called once the real write (approved path) has settled, success or failure — mirrors approval.ts's clearSettledMeritApproval. */
export function clearPendingSignRequest(): void {
  current = null;
  busy = false;
  notify();
}
