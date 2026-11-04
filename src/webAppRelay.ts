// File: src/webAppRelay.ts
//
// 2026-11-04 (docs/design/remoteWalletSigning.txt, step A; owner: any Merit wallet signs through any other): the worker's half of asking the Merit web app for something, the extension's counterpart to the MetaMask relay. The side panel's "Merit (Web App)" authenticator sends a request to the
// worker (merit/web/request); the worker hands it to ONE web app page as the event merit_remoteRequest and waits for that page to answer with the provider method merit_remoteResponse.
// Rules (the trust rules of the design): only an allow-listed set of calls goes through; the request goes to one page, and an answer counts ONLY from that same tab and that same origin (the browser's own sender, never anything the page says about itself), ONCE, before the time limit; everything
// else is dropped. A closed tab ends its requests. Keys never cross: the page returns a result (an account list, a signature, a transaction hash), nothing else. No browser API here: the worker injects it, so the rules are tested without one (test/webAppRelay.test.mjs).

export type RelayError = { code: number; message: string };
export type RelayReply = { ok: true; result: unknown } | { ok: false; error: RelayError };

/** A web app page that reported in (the worker's webApps table). */
export interface WebAppTarget {
  tabId: number;
  origin: string;
  loggedOn: boolean;
}

export interface WebAppRelayDeps {
  targets(): WebAppTarget[];
  sendToTab(tabId: number, message: unknown): Promise<unknown> | void;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  newId(): string;
}

/** Answered from what the page already knows: no person is asked. */
export const REMOTE_READ_METHODS: readonly string[] = ['eth_accounts', 'eth_chainId'];
/** The person approves in the web app first (it unlocks first when locked). */
export const REMOTE_APPROVAL_METHODS: readonly string[] = ['eth_requestAccounts', 'personal_sign', 'eth_signTypedData_v4', 'eth_sendTransaction'];
export const REMOTE_METHODS: ReadonlySet<string> = new Set([...REMOTE_READ_METHODS, ...REMOTE_APPROVAL_METHODS]);

export const READ_TIMEOUT_MS = 20_000;
export const APPROVAL_TIMEOUT_MS = 300_000;
export const MAX_PENDING = 8;

const fail = (code: number, message: string): RelayReply => ({ ok: false, error: { code, message } });

export function createWebAppRelay(deps: WebAppRelayDeps) {
  const pending = new Map<string, { tabId: number; origin: string; resolve: (reply: RelayReply) => void; timer: unknown }>();

  function finish(id: string, reply: RelayReply): boolean {
    const entry = pending.get(id);
    if (!entry) return false;
    pending.delete(id);
    deps.clearTimer(entry.timer);
    entry.resolve(reply);
    return true;
  }

  /** Ask the web app. Always resolves (never throws): a failure is a reply with a code, MetaMask's codes where they mean the same (4001 rejected, 4900 unavailable). */
  function request(method: string, params: unknown): Promise<RelayReply> {
    if (!REMOTE_METHODS.has(method)) return Promise.resolve(fail(4200, `The Merit web app is not asked for ${method}.`));
    if (pending.size >= MAX_PENDING) return Promise.resolve(fail(-32005, 'Too many requests are waiting on the Merit web app.'));
    const all = deps.targets();
    const target = all.find((t) => t.loggedOn) ?? all[0];
    if (!target) return Promise.resolve(fail(4900, 'The Merit web app is not open. Connect it first.'));
    const id = deps.newId();
    return new Promise<RelayReply>((resolve) => {
      const timer = deps.setTimer(() => void finish(id, fail(4900, 'The Merit web app did not answer in time.')), REMOTE_READ_METHODS.includes(method) ? READ_TIMEOUT_MS : APPROVAL_TIMEOUT_MS);
      pending.set(id, { tabId: target.tabId, origin: target.origin, resolve, timer });
      Promise.resolve(deps.sendToTab(target.tabId, { type: 'merit/provider/event', event: 'merit_remoteRequest', data: { id, method, params } })).catch(() => void finish(id, fail(4900, 'The Merit web app page could not be reached.')));
    });
  }

  /** The page's answer (provider method merit_remoteResponse). `sender` is what the BROWSER says (tab and origin), never the page's own words. Returns whether it was taken. */
  function accept(sender: { tabId?: number; origin?: string }, payload: unknown): boolean {
    const answer = payload as { id?: unknown; ok?: unknown; result?: unknown; error?: { code?: unknown; message?: unknown } } | null;
    if (!answer || typeof answer.id !== 'string') return false;
    const entry = pending.get(answer.id);
    if (!entry || sender.tabId !== entry.tabId || sender.origin !== entry.origin) return false;
    if (answer.ok === true) return finish(answer.id, { ok: true, result: answer.result ?? null });
    const code = typeof answer.error?.code === 'number' ? answer.error.code : 4001;
    const message = typeof answer.error?.message === 'string' ? answer.error.message.slice(0, 300) : 'The Merit web app refused the request.';
    return finish(answer.id, fail(code, message));
  }

  /** A tab closed: its requests end now. */
  function dropTab(tabId: number): void {
    for (const [id, entry] of [...pending]) if (entry.tabId === tabId) finish(id, fail(4900, 'The Merit web app page was closed.'));
  }

  return { request, accept, dropTab, pendingCount: () => pending.size };
}
