// File: src/relay.ts
//
// 2026-11-06 (docs/design/meritConnectDesign.txt, row M4): the requester's hub. Moved from spCoinExtension/src/webAppRelay.ts (2026-11-04) with its rules unchanged, plus the selection sessions and the one trace channel.
// It hands a request to ONE target (a web page, a tab) and waits for that target to answer. The trust rules:
//   - only the allow-listed methods go through;
//   - the request goes to one target; an answer counts ONLY from that same target and origin (what the BROWSER says about the sender, never the message's own words), ONCE, before the time limit;
//   - an answer to the account selection (eth_requestAccounts) opens a SELECTION SESSION: until the responder closes it or the time limit, that same sender may push changes to the shared list;
//   - everything else is dropped, and every drop is traced with its reason;
//   - a closed target ends its requests and its sessions.
// No browser API here: the host injects the transport and the timers, so the rules are tested without a browser.
import {
  APPROVAL_TIMEOUT_MS,
  ERROR,
  MAX_PENDING,
  METHODS,
  PROTOCOL_VERSION,
  READ_METHODS,
  READ_TIMEOUT_MS,
  SELECTION_SESSION_MS,
  fail,
  isRid,
  parsePush,
  parseReply,
  type Reply,
  type Request,
} from './protocol.js';
import { createTrace, type TraceFn } from './trace.js';

/** A page that reported in and can be asked. */
export interface RelayTarget {
  id: number | string;
  origin: string;
  /** Preferred when it is logged on (the first target is used when none is). */
  ready: boolean;
}

/** What the transport knows about whoever sent a message: the BROWSER's word, never the message's. */
export interface Sender {
  id?: number | string;
  origin?: string;
}

/** A change to the shared list that the relay accepted (the host stores it). */
export type SelectionChange = { rid: string; accounts: string[] } | { rid: string; closed: true };

export interface RelayDeps {
  targets(): RelayTarget[];
  send(targetId: number | string, message: Request): Promise<unknown> | void;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  newId(): string;
  now(): number;
  trace?: TraceFn;
  /** A change to the shared list, taken from the page the selection went to while the selection is open. */
  onSelection?(change: SelectionChange): void;
}

interface Pending {
  method: string;
  targetId: number | string;
  origin: string;
  resolve: (reply: Reply) => void;
  timer: unknown;
}

interface Session {
  targetId: number | string;
  origin: string;
  expires: number;
}

export function createRelay(deps: RelayDeps) {
  const trace = createTrace(deps.trace);
  const pending = new Map<string, Pending>();
  const sessions = new Map<string, Session>();

  function finish(rid: string, reply: Reply): Pending | undefined {
    const entry = pending.get(rid);
    if (!entry) return undefined;
    pending.delete(rid);
    deps.clearTimer(entry.timer);
    entry.resolve(reply);
    return entry;
  }

  const sweep = () => {
    const now = deps.now();
    for (const [rid, session] of sessions) if (now >= session.expires) sessions.delete(rid);
  };

  /** Ask the other wallet. Always resolves (never throws): a failure is a reply with a code. `requestedRid` is the caller's own id, so one id names the request on every side. */
  function request(method: string, params: unknown, requestedRid?: string): Promise<Reply> {
    const wanted = isRid(requestedRid) && !pending.has(requestedRid) ? requestedRid : undefined;
    const rid = wanted ?? deps.newId();
    if (!METHODS.has(method)) {
      trace('refused', { rid, method, reason: 'method not allow-listed' });
      return Promise.resolve(fail(rid, ERROR.UNSUPPORTED, `The other wallet is not asked for ${method}.`));
    }
    if (pending.size >= MAX_PENDING) {
      trace('refused', { rid, method, reason: 'too many pending' });
      return Promise.resolve(fail(rid, ERROR.TOO_MANY, 'Too many requests are waiting on the other wallet.'));
    }
    const all = deps.targets();
    const target = all.find((t) => t.ready) ?? all[0];
    if (!target) {
      trace('failed', { rid, method, reason: 'no target' });
      return Promise.resolve(fail(rid, ERROR.UNAVAILABLE, 'The other wallet is not open. Connect it first.'));
    }
    return new Promise<Reply>((resolve) => {
      const timer = deps.setTimer(() => {
        trace('failed', { rid, method, reason: 'timed out' });
        finish(rid, fail(rid, ERROR.UNAVAILABLE, 'The other wallet did not answer in time.'));
      }, READ_METHODS.includes(method) ? READ_TIMEOUT_MS : APPROVAL_TIMEOUT_MS);
      pending.set(rid, { method, targetId: target.id, origin: target.origin, resolve, timer });
      const message: Request = { v: PROTOCOL_VERSION, rid, method, ...(params === undefined ? {} : { params }) };
      trace('request', { rid, method, target: target.id });
      Promise.resolve(deps.send(target.id, message)).then(
        () => trace('sent', { rid, method }),
        () => {
          trace('failed', { rid, method, reason: 'could not be reached' });
          finish(rid, fail(rid, ERROR.UNAVAILABLE, 'The other wallet could not be reached.'));
        },
      );
    });
  }

  /** The target's answer. Returns whether it was taken. */
  function accept(sender: Sender, payload: unknown): boolean {
    const parsed = parseReply(payload);
    if (parsed.kind !== 'ok') {
      trace('refused', { reason: `reply ${parsed.reason}` });
      return false;
    }
    const reply = parsed.value;
    const entry = pending.get(reply.rid);
    if (!entry) {
      trace('refused', { rid: reply.rid, reason: 'no such request (unknown, answered or expired)' });
      return false;
    }
    if (sender.id !== entry.targetId || sender.origin !== entry.origin) {
      trace('refused', { rid: reply.rid, reason: 'wrong sender', sender: sender.id, origin: sender.origin, expected: entry.targetId });
      return false;
    }
    finish(reply.rid, reply);
    trace('answered', { rid: reply.rid, method: entry.method, ok: reply.ok, ...(reply.ok ? {} : { code: reply.error.code }) });
    if (reply.ok && entry.method === 'eth_requestAccounts') {
      sessions.set(reply.rid, { targetId: entry.targetId, origin: entry.origin, expires: deps.now() + SELECTION_SESSION_MS });
      trace('selection.open', { rid: reply.rid });
    }
    return true;
  }

  /** A push to the shared list from the page the selection went to. Returns whether it was taken. */
  function acceptPush(sender: Sender, payload: unknown): boolean {
    sweep();
    const parsed = parsePush(payload);
    if (parsed.kind !== 'ok') {
      trace('refused', { reason: `push ${parsed.reason}` });
      return false;
    }
    const push = parsed.value;
    const session = sessions.get(push.rid);
    if (!session) {
      trace('refused', { rid: push.rid, reason: 'no open selection (never opened, closed or expired)' });
      return false;
    }
    if (sender.id !== session.targetId || sender.origin !== session.origin) {
      trace('refused', { rid: push.rid, reason: 'wrong sender', sender: sender.id, origin: sender.origin, expected: session.targetId });
      return false;
    }
    if (push.closed) {
      sessions.delete(push.rid);
      trace('selection.close', { rid: push.rid });
      deps.onSelection?.({ rid: push.rid, closed: true });
      return true;
    }
    trace('selection.change', { rid: push.rid, accounts: push.accounts?.length ?? 0 });
    deps.onSelection?.({ rid: push.rid, accounts: push.accounts ?? [] });
    return true;
  }

  /** A target went away: its requests end now and its selections close. */
  function dropTarget(targetId: number | string): void {
    for (const [rid, entry] of [...pending]) {
      if (entry.targetId !== targetId) continue;
      trace('failed', { rid, method: entry.method, reason: 'target closed' });
      finish(rid, fail(rid, ERROR.UNAVAILABLE, 'The other wallet was closed.'));
    }
    for (const [rid, session] of [...sessions]) if (session.targetId === targetId) sessions.delete(rid);
  }

  return { request, accept, acceptPush, dropTarget, pendingCount: () => pending.size, sessionCount: () => (sweep(), sessions.size) };
}

export type Relay = ReturnType<typeof createRelay>;
