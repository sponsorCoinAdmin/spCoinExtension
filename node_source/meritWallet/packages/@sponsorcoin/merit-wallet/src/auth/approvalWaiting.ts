// File: src/auth/approvalWaiting.ts
//
// 2026-10-12 (docs/design/accountAuthDesign.txt row 11 / 6A, the "seamless" requirement): while another wallet (MetaMask, the Merit extension, a hardware device) is deciding on a request, the page says so in one neutral sentence instead of
// looking frozen: "Waiting for MetaMask to approve ...". The approval itself is the other wallet's own screen, shown once (5.3); this only tells the person where to look. A store holds what is pending; withApprovalNotice wraps an
// authenticator so every request that needs the person's decision is registered for as long as it is open, success or failure, and nothing else about the authenticator changes.
// 2026-10-13 (docs/design/accountAuthDesign.txt section 17 item 10): when a request ENDS in a refusal or a failure, the notice also says so for a few seconds ("Merit extension did not approve: User rejected the request."), because the status panel that used to carry that
// message lives in the docked wallet popup and is hidden behind its lock screen. A wallet whose own screen already asks the person (the browser wallet) can be wrapped with showWaiting: false: it then reports only how a request ended, never "waiting".
import { walletName, type Authenticator, type AuthenticatorTransaction } from './authenticator';

export type ApprovalAction = 'connect' | 'sign a message' | 'sign typed data' | 'send a transaction';

export interface ApprovalWaiting {
  id: number;
  authenticatorId: string;
  /** The wallet's name as the person knows it ('MetaMask', 'Merit extension'). */
  label: string;
  action: ApprovalAction;
  startedAt: number;
  /** True for a wallet whose own approval screen is on this page: it is tracked for its outcome only and never shown as "waiting". */
  silent?: boolean;
}

/** How the last request ended, when it ended in a refusal or a failure (shown for a few seconds, then gone). */
export interface ApprovalOutcome {
  id: number;
  authenticatorId: string;
  label: string;
  action: ApprovalAction;
  text: string;
  at: number;
}

export interface ApprovalWaitingStore {
  getState(): readonly ApprovalWaiting[];
  subscribe(listener: () => void): () => void;
  /** The last refusal or failure, for a few seconds after it happened; undefined otherwise. */
  getOutcome(): ApprovalOutcome | undefined;
  /** Register one open request; call the returned function when it ends: with nothing when it was approved, with the error when it was refused or failed. */
  begin(entry: Omit<ApprovalWaiting, 'id' | 'startedAt'>): (error?: unknown) => void;
}

/** How long the "did not approve" line stays. */
export const APPROVAL_OUTCOME_MS = 10_000;

export function createApprovalWaitingStore(now: () => number = Date.now, outcomeMs: number = APPROVAL_OUTCOME_MS): ApprovalWaitingStore {
  let state: readonly ApprovalWaiting[] = [];
  let outcome: ApprovalOutcome | undefined;
  let outcomeTimer: ReturnType<typeof setTimeout> | undefined;
  let nextId = 1;
  const listeners = new Set<() => void>();
  const set = (next: readonly ApprovalWaiting[]) => {
    state = next;
    listeners.forEach((l) => l());
  };
  const setOutcome = (next: ApprovalOutcome | undefined) => {
    if (outcomeTimer) clearTimeout(outcomeTimer);
    outcomeTimer = undefined;
    outcome = next;
    if (next) outcomeTimer = setTimeout(() => setOutcome(undefined), outcomeMs);
    listeners.forEach((l) => l());
  };
  return {
    getState: () => state,
    getOutcome: () => outcome,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    begin(entry) {
      const id = nextId++;
      if (outcome) setOutcome(undefined); // a new request replaces the old answer
      set([...state, { ...entry, id, startedAt: now() }]);
      let ended = false;
      return (error?: unknown) => {
        if (ended) return;
        ended = true;
        set(state.filter((e) => e.id !== id));
        if (error !== undefined) setOutcome({ id, authenticatorId: entry.authenticatorId, label: entry.label, action: entry.action, text: outcomeText(entry.label, error), at: now() });
      };
    },
  };
}

/** The one default store: the notice component reads it, the hosts wrap their remote authenticators with it. */
export const approvalWaiting: ApprovalWaitingStore = createApprovalWaitingStore();

const VERB: Record<ApprovalAction, string> = {
  connect: 'approve connecting this site',
  'sign a message': 'approve signing a message',
  'sign typed data': 'approve signing this data',
  'send a transaction': 'approve this transaction',
};

/** The one sentence for a request that was refused or failed: the wallet's name and its own words. */
export function outcomeText(label: string, error: unknown): string {
  const message = error instanceof Error && error.message ? error.message : typeof error === 'string' && error ? error : 'the request failed';
  return `${label} did not approve: ${message}`;
}

/** The one sentence a person reads while a request is open (a wallet whose own screen is on this page is not listed). */
export function approvalWaitingText(all: readonly ApprovalWaiting[]): string {
  const pending = all.filter((e) => !e.silent);
  if (pending.length === 0) return '';
  const first = pending[0];
  const more = pending.length > 1 ? ` (${pending.length} requests are open)` : '';
  return `Waiting for ${first.label} to ${VERB[first.action]}. Look for its window or its icon in your browser.${more}`;
}

/** The same authenticator, with each request that needs the person's decision registered in the store while it is open. Everything else (id, label, capabilities, status, accounts, events) is the authenticator's own. */
export function withApprovalNotice(authenticator: Authenticator, store: ApprovalWaitingStore = approvalWaiting, options: { showWaiting?: boolean } = {}): Authenticator {
  const track = async <T>(action: ApprovalAction, run: () => Promise<T>): Promise<T> => {
    const end = store.begin({ authenticatorId: authenticator.id, label: walletName(authenticator.id, authenticator.vault?.platform), action, silent: options.showWaiting === false });
    try {
      const result = await run();
      end();
      return result;
    } catch (error) {
      end(error ?? 'the request failed');
      throw error;
    }
  };
  const wrapped: Authenticator = Object.create(authenticator);
  Object.defineProperty(wrapped, 'signMessage', { value: (address: string, message: string) => track('sign a message', () => authenticator.signMessage(address, message)) });
  Object.defineProperty(wrapped, 'sendTransaction', { value: (tx: AuthenticatorTransaction) => track('send a transaction', () => authenticator.sendTransaction(tx)) });
  if (authenticator.signTypedData) {
    Object.defineProperty(wrapped, 'signTypedData', { value: (address: string, typedData: unknown) => track('sign typed data', () => authenticator.signTypedData!(address, typedData)) });
  }
  if (authenticator.connect) {
    Object.defineProperty(wrapped, 'connect', { value: () => track('connect', () => authenticator.connect!()) });
  }
  return wrapped;
}
