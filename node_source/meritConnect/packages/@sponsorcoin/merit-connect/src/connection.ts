// File: src/connection.ts
//
// 2026-11-06 (owner: "we should have a connection hook in the library which can be subscribed to"; docs/design/meritConnectDesign.txt, row M13): the CONNECTION MONITOR. One store that says whether the other Merit wallet is connected AND, when it is not,
// WHY, in words a person can act on. The live failure it exists for: after the extension was reloaded the open web page kept a dead content script, so Connect hung and nothing said "reload the page".
//
// The monitor is a plain store (subscribe + getSnapshot), so it needs no React and drops into useSyncExternalStore. The host injects ONE probe: a round trip that says how many pages of the other wallet answered (`reporting`), how many pages
// that could be it are open (`candidates`: open and NOT answering, which is what a dead content script looks like), and whether the one that answered is logged on.
//   connected     a page answers (the person has not disconnected it)
//   detached      the person disconnected it on purpose: that choice wins whatever the other wallet says
//   page-silent   a page is open but does not answer: reload that page
//   no-page       no page of the other wallet is open
//   unknown       the probe itself could not be asked (the worker is not answering)
import { createTrace, type TraceFn } from './trace.js';

export type ConnectionState = 'connected' | 'detached' | 'page-silent' | 'no-page' | 'unknown';

export interface ProbeResult {
  /** Pages of the other wallet that answered. */
  reporting: number;
  /** Open pages that could be the other wallet but did NOT answer. */
  candidates: number;
  /** The answering page's wallet is logged on. */
  loggedOn: boolean;
}

export interface ConnectionStatus {
  state: ConnectionState;
  /** state === 'connected' */
  connected: boolean;
  /** A sentence for the person: what is wrong and what to do (or that all is well). */
  reason: string;
  loggedOn: boolean;
  reporting: number;
  candidates: number;
  detached: boolean;
  /** When this status was worked out. */
  at: number;
}

export interface ConnectionMonitorDeps {
  /** One round trip. undefined = it could not be asked. */
  probe(): Promise<ProbeResult | undefined>;
  /** The person's own choice to disconnect (kept by the host). */
  isDetached(): boolean;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  now(): number;
  /** How the other wallet is called in the sentences (default "Merit web app"). */
  label?: string;
  trace?: TraceFn;
}

export const CONNECT_WAIT_MS = 15_000;
export const CONNECT_POLL_MS = 2_000;

export function describeConnection(state: ConnectionState, label: string): string {
  switch (state) {
    case 'connected':
      return `The ${label} is connected.`;
    case 'detached':
      return `You disconnected the ${label}. Press Connect to use it again.`;
    case 'page-silent':
      return `A ${label} page is open but is not answering the extension. Reload that page (F5) and try again.`;
    case 'no-page':
      return `No ${label} page is open. Open it, or press Connect to open it.`;
    default:
      return `The extension could not ask for the ${label}'s status. Reload the extension and try again.`;
  }
}

export function createConnectionMonitor(deps: ConnectionMonitorDeps) {
  const label = deps.label ?? 'Merit web app';
  const trace = createTrace(deps.trace);
  const listeners = new Set<() => void>();
  let lastProbe: ProbeResult | undefined;
  let probed = false;
  let inflight: Promise<ConnectionStatus> | undefined;

  const derive = (): ConnectionStatus => {
    const detached = deps.isDetached();
    const reporting = lastProbe?.reporting ?? 0;
    const candidates = lastProbe?.candidates ?? 0;
    const state: ConnectionState = detached ? 'detached' : !probed || !lastProbe ? 'unknown' : reporting > 0 ? 'connected' : candidates > 0 ? 'page-silent' : 'no-page';
    return { state, connected: state === 'connected', reason: describeConnection(state, label), loggedOn: lastProbe?.loggedOn ?? false, reporting, candidates, detached, at: deps.now() };
  };

  let status: ConnectionStatus = derive();
  const sameStatus = (a: ConnectionStatus, b: ConnectionStatus) => a.state === b.state && a.loggedOn === b.loggedOn && a.reporting === b.reporting && a.candidates === b.candidates && a.detached === b.detached;

  /** Work the status out again from what is known; tell the subscribers only when something changed. */
  function publish(): ConnectionStatus {
    const next = derive();
    if (sameStatus(status, next)) return status;
    const before = status.state;
    status = next;
    trace('link', { from: before, to: next.state, reporting: next.reporting, candidates: next.candidates, loggedOn: next.loggedOn, reason: next.reason });
    listeners.forEach((listener) => listener());
    return status;
  }

  /** Ask now (one probe at a time: callers that arrive while one is running share its answer). */
  function refresh(): Promise<ConnectionStatus> {
    if (inflight) return inflight;
    inflight = (async () => {
      try {
        lastProbe = await deps.probe();
      } catch (error) {
        lastProbe = undefined;
        trace('link.probe', { failed: error instanceof Error ? error.message : String(error) });
      }
      probed = true;
      return publish();
    })().finally(() => {
      inflight = undefined;
    });
    return inflight;
  }

  /**
   * Resolves as soon as the other wallet is connected, or after `timeoutMs` with the status AT THAT MOMENT, so the caller can show its `reason`. While it waits it asks again every `pollMs`
   * (a page the person reloads meanwhile is noticed without waiting for the host to tell us).
   */
  function waitForConnected(timeoutMs = CONNECT_WAIT_MS, pollMs = CONNECT_POLL_MS): Promise<ConnectionStatus> {
    return new Promise((resolve) => {
      let poll: unknown;
      let limit: unknown;
      let off: () => void = () => undefined;
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        off();
        deps.clearTimer(poll);
        deps.clearTimer(limit);
        resolve(status);
      };
      const check = () => {
        if (status.connected) finish();
      };
      off = subscribe(check);
      limit = deps.setTimer(() => {
        // one last look before giving up, so the reason is the current one
        void refresh().then(finish, finish);
      }, timeoutMs);
      const tick = () => {
        if (finished) return;
        void refresh().then(() => {
          if (finished) return;
          if (status.connected) finish();
          else poll = deps.setTimer(tick, pollMs);
        });
      };
      if (status.connected) finish();
      else tick();
    });
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return {
    getSnapshot: (): ConnectionStatus => status,
    subscribe,
    refresh,
    /** The host's own state changed (the person disconnected or connected): re-derive without asking. */
    recompute: publish,
    waitForConnected,
  };
}

export type ConnectionMonitor = ReturnType<typeof createConnectionMonitor>;
