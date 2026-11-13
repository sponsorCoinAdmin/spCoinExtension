// File: src/auth/walletAuthenticators.ts
//
// 2026-11-12 (owner design): ONE place that knows whether each wallet is CONNECTED right now. A map of wallet id -> state, kept by a store; every wallet supplies its own PROBE (how to find out) and optionally what to listen to (when to find out again).
// The state is never read from anything saved: a saved flag was what kept MetaMask "Connected" after MetaMask was gone (wagmi restores its last connection on page load and counts it as connected until its own re-check fails).
// A probe answers from the wallet itself (a provider that answers eth_accounts, a device that is open, a peer that is logged on), so a wallet that is absent, closed or unplugged reads Disconnected.
// Pure (no React): the hook is walletAuthenticatorsReact.ts. A host registers the probes it has; a wallet with no probe has no opinion here (isConnected is undefined) and the account list's default applies.
import type { Authenticator } from './authenticator';

/** A wallet's id. A plain string here: a host may register a wallet the package has never heard of. */
type AuthenticatorId = string;

/** checking = a probe is out and has not answered yet (shown as not connected; never saved). */
export type ConnectionState = 'connected' | 'disconnected' | 'checking';

export interface ConnectionProbe {
  /** Ask the wallet now. true = connected. A throw or a timeout reads as not connected. */
  check(): boolean | Promise<boolean>;
  /** Call `refresh` whenever the wallet changes (accounts, lock, plug, peer). Returns the unsubscribe. */
  subscribe?(refresh: () => void): () => void;
}

export interface WalletConnections {
  /** The current states by wallet id. A new object after every change (so a hook can compare by identity). */
  get(): Readonly<Record<AuthenticatorId, ConnectionState>>;
  /** true / false, or undefined when no probe is registered for the wallet (the caller's default applies). */
  isConnected(id: AuthenticatorId): boolean | undefined;
  /** Ask one wallet (or all of them) again. Resolves when the answers are in. */
  refresh(id?: AuthenticatorId): Promise<void>;
  /** Add or replace a wallet's probe (a host that learns of a wallet later). */
  register(id: AuthenticatorId, probe: ConnectionProbe): void;
  subscribe(listener: () => void): () => void;
  /** Start listening (probes' subscriptions, the page's focus / visibility). Idempotent; returns nothing to undo: the store lives as long as the page. */
  start(): void;
}

export interface WalletConnectionsOptions {
  probes?: Record<AuthenticatorId, ConnectionProbe>;
  /** A probe that has not answered after this long reads not connected (default 4000 ms). */
  timeoutMs?: number;
  /** Where "the person came back to the page" is heard; a host without a window passes none. */
  onFocus?(refresh: () => void): () => void;
}

const withTimeout = (work: boolean | Promise<boolean>, ms: number): Promise<boolean> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), ms);
    Promise.resolve(work).then(
      (value) => { clearTimeout(timer); resolve(!!value); },
      () => { clearTimeout(timer); resolve(false); },
    );
  });

export function createWalletConnections(options: WalletConnectionsOptions = {}): WalletConnections {
  const timeoutMs = options.timeoutMs ?? 4000;
  const probes = new Map<AuthenticatorId, ConnectionProbe>(Object.entries(options.probes ?? {}));
  const unsubscribes = new Map<AuthenticatorId, () => void>();
  const listeners = new Set<() => void>();
  let states: Record<AuthenticatorId, ConnectionState> = {};
  // a newer answer for the same wallet wins: a slow older probe must not overwrite it
  const ticket = new Map<AuthenticatorId, number>();
  let started = false;

  const publish = (next: Record<AuthenticatorId, ConnectionState>) => {
    states = next;
    listeners.forEach((listener) => listener());
  };

  const refreshOne = async (id: AuthenticatorId): Promise<void> => {
    const probe = probes.get(id);
    if (!probe) return;
    const mine = (ticket.get(id) ?? 0) + 1;
    ticket.set(id, mine);
    // only a wallet with no answer yet reads "checking"; one that already has an answer keeps it while it is asked again (no flicker on a focus)
    if (!states[id]) publish({ ...states, [id]: 'checking' });
    const connected = await withTimeout(probe.check(), timeoutMs);
    if (ticket.get(id) !== mine) return;
    const state: ConnectionState = connected ? 'connected' : 'disconnected';
    if (states[id] !== state) publish({ ...states, [id]: state });
  };

  const listen = (id: AuthenticatorId) => {
    unsubscribes.get(id)?.();
    const off = probes.get(id)?.subscribe?.(() => void refreshOne(id));
    if (off) unsubscribes.set(id, off);
  };

  const store: WalletConnections = {
    get: () => states,
    isConnected(id) {
      if (!probes.has(id)) return undefined;
      return states[id] === 'connected';
    },
    async refresh(id) {
      await Promise.all((id ? [id] : [...probes.keys()]).map(refreshOne));
    },
    register(id, probe) {
      probes.set(id, probe);
      if (started) listen(id);
      void refreshOne(id);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start() {
      if (started) return;
      started = true;
      for (const id of probes.keys()) listen(id);
      options.onFocus?.(() => void store.refresh());
      void store.refresh();
    },
  };
  return store;
}

/** The probe of a wallet that is an Authenticator: connected while it is available AND shares an account (the injected wallets: a real provider that answers eth_accounts, no popup). Its own change events trigger the next check. */
export function authenticatorProbe(authenticator: () => Authenticator | undefined): ConnectionProbe {
  return {
    async check() {
      const status = await authenticator()?.status();
      return !!status && status.available && status.unlocked;
    },
    subscribe(refresh) {
      return authenticator()?.onChange?.(() => refresh()) ?? (() => undefined);
    },
  };
}
